import { NextRequest, NextResponse } from "next/server";
import {
  createClient, getApiKey,
  withRetry, isBalanceError,
  translateError, notifyAdmin,
} from "@/lib/api-error";

export const maxDuration = 60;
export const runtime = "edge";

// ── PatientInfo type (shared with form component) ─────────────────────────

export interface RomJointEntry {
  joint:         string;
  otherJointName: string;
  directions:    { direction: string; degree: string }[];
}

export interface PatientInfo {
  // 基本情報
  age:           string;
  gender:        string;
  diagnosisNote: string;
  // 主訴・目標
  complaint:     string;
  goal:          string;
  // 疼痛
  nrs:           string;
  // 筋力
  mmtLevel:      string;
  mmtValue:      string;
  // ROM
  romLevel:      string;
  romJoints:     RomJointEntry[];
  // ADL
  fimTotal:      string;
  fimMotor:      string;
  fimCog:        string;
  biTotal:       string;
  // 環境
  environment:   string;
  surgery:       string;
  postOpDays:    string;
  visitFreq:     string;
  phase:         string;
  // 生活
  living:        string;
  // 禁忌
  comorbidities: string;
  medications:   string;
  // 自由記載
  freeText:      string;
}

// ── FIM / BI labels ───────────────────────────────────────────────────────

function getFimLabel(score: number): string {
  if (score <= 18)  return "全介助";
  if (score <= 60)  return "重度介助";
  if (score <= 90)  return "中等度介助";
  if (score <= 107) return "軽度介助";
  return "ほぼ自立";
}

function getBiLabel(score: number): string {
  if (score <= 20) return "全介助";
  if (score <= 60) return "重度介助";
  if (score <= 90) return "中等度介助";
  if (score <= 99) return "軽度介助";
  return "自立";
}

// ── Build patient context string ──────────────────────────────────────────

function buildPatientContext(disease: string, p: PatientInfo): string {
  const lines: string[] = [`疾患名：${disease}`];

  if (p.age)           lines.push(`年齢：${p.age}歳`);
  if (p.gender)        lines.push(`性別：${p.gender}`);
  if (p.diagnosisNote) lines.push(`診断詳細・病期：${p.diagnosisNote}`);
  if (p.complaint)     lines.push(`主訴（一番困っていること）：${p.complaint}`);
  if (p.goal)          lines.push(`目標・生活背景：${p.goal}`);
  if (p.nrs && p.nrs !== "0") lines.push(`疼痛レベル（NRS）：${p.nrs}/10`);

  if (p.mmtLevel && p.mmtLevel !== "なし") {
    const v = p.mmtValue ? `（MMT${p.mmtValue}）` : "";
    lines.push(`筋力低下：${p.mmtLevel}${v}`);
  }

  if (p.romLevel && p.romLevel !== "なし") {
    if (p.romJoints.length > 0) {
      const joints = p.romJoints.map(j => {
        const name = j.joint === "その他" && j.otherJointName ? j.otherJointName : j.joint;
        const dirs = j.directions.map(d => d.degree ? `${d.direction} ${d.degree}°` : d.direction).join("・");
        return dirs ? `${name}（${dirs}）` : name;
      }).join("、");
      lines.push(`関節可動域制限：${p.romLevel}　対象：${joints}`);
    } else {
      lines.push(`関節可動域制限：${p.romLevel}`);
    }
  }

  if (p.fimTotal) {
    const label = getFimLabel(Number(p.fimTotal));
    let fimStr = `FIM：${p.fimTotal}点（${label}）`;
    if (p.fimMotor) fimStr += `　運動：${p.fimMotor}点`;
    if (p.fimCog)   fimStr += `　認知：${p.fimCog}点`;
    lines.push(fimStr);
  }
  if (p.biTotal) {
    const label = getBiLabel(Number(p.biTotal));
    lines.push(`バーサルインデックス：${p.biTotal}点（${label}）`);
  }

  if (p.environment) {
    lines.push(`受療環境：${p.environment}`);
    if (p.environment === "入院") {
      if (p.surgery)    lines.push(`術式：${p.surgery}`);
      if (p.postOpDays) lines.push(`術後${p.postOpDays}日`);
    } else {
      if (p.visitFreq) lines.push(`通院頻度：${p.visitFreq}`);
      if (p.phase)     lines.push(`症状の経過：${p.phase}`);
    }
  }

  if (p.living)        lines.push(`生活環境：${p.living}`);
  if (p.comorbidities) lines.push(`合併症・既往歴：${p.comorbidities}`);
  if (p.medications)   lines.push(`内服薬：${p.medications}`);
  if (p.freeText)      lines.push(`その他・特記事項：\n${p.freeText}`);

  return lines.join("\n");
}

// ── System prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `あなたは日本の理学療法士向け医療情報専門AIです。
入力された疾患名と患者情報をもとに、治療・リハビリアプローチを3段階で提案してください。

① 日本の標準的アプローチ（教科書・ガイドライン準拠）
② 海外の最新エビデンス（RCT・系統的レビュー）
③ この患者さんに特化した具体的な提案（患者の状態・目標・生活背景を踏まえた個別提案）

必ず以下のJSON形式のみで回答してください：

{
  "standard": {
    "points": ["・日本標準のアプローチ1（5〜7項目）", "・アプローチ2"],
    "references": ["日本語の教科書/ガイドライン名"]
  },
  "evidence": [
    {
      "approach": "エビデンスベースのアプローチ名",
      "detail": "具体的な内容と効果を1〜2文で",
      "source": "第一著者 et al., 年, 雑誌名",
      "studyType": "RCT" または "系統的レビュー" または "メタ解析" または "コホート研究"
    }
  ],
  "personalized": "この患者さんの状態・目標・生活背景を踏まえた個別の具体的提案を5〜7項目の箇条書きで。一般論ではなく、この患者さんに特化した内容にする。",
  "synthesis": "日本の標準と海外エビデンスの違い・共通点・最新トレンドを2〜3文で。",
  "references": ["全参考文献（重複不可）"]
}

evidenceは3〜5件。患者情報が少ない場合も疾患の一般的な情報で回答すること。`;

// ── Response types ────────────────────────────────────────────────────────

export interface EvidenceItem {
  approach:  string;
  detail:    string;
  source:    string;
  studyType: string;
}

export interface TreatmentEvidenceResult {
  standard: {
    points:     string[];
    references: string[];
  };
  evidence:    EvidenceItem[];
  personalized: string;
  synthesis:   string;
  references:  string[];
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    let body: { disease?: unknown; patientInfo?: unknown };
    try { body = await req.json() as typeof body; }
    catch { return NextResponse.json({ error: "リクエストの解析に失敗しました" }, { status: 400 }); }

    const disease    = body.disease;
    const patientInfo = body.patientInfo as PatientInfo | undefined;

    if (!disease || typeof disease !== "string") {
      return NextResponse.json({ error: "疾患名を入力してください" }, { status: 400 });
    }
    if (!getApiKey()) {
      return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 503 });
    }

    const userMessage = patientInfo
      ? buildPatientContext(disease, patientInfo)
      : `疾患名：${disease}`;

    const client = createClient();
    const message = await withRetry(() =>
      client.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 3500,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: "user", content: userMessage }],
      }),
    );

    const raw = message.content[0];
    if (raw.type !== "text") {
      return NextResponse.json({ error: "AIの応答形式が予期しないものでした。もう一度お試しください。" }, { status: 500 });
    }

    const jsonMatch = raw.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[treatment-evidence] No JSON:", raw.text.slice(0, 200));
      return NextResponse.json({ error: "AI応答の解析に失敗しました。もう一度お試しください。" }, { status: 500 });
    }

    let parsed: TreatmentEvidenceResult;
    try { parsed = JSON.parse(jsonMatch[0]) as TreatmentEvidenceResult; }
    catch (e) {
      console.error("[treatment-evidence] JSON parse error:", e);
      return NextResponse.json({ error: "AI応答の解析に失敗しました。もう一度お試しください。" }, { status: 500 });
    }

    return NextResponse.json(parsed);

  } catch (err) {
    if (isBalanceError(err)) void notifyAdmin(err);
    console.error("[treatment-evidence] Unhandled:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: translateError(err) }, { status: 503 });
  }
}
