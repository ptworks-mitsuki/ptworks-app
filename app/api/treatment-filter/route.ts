import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RomDirection {
  direction: string;
  degree: string;
}

interface FilterState {
  ageGroups: string[];
  gender: string;
  painTimings: string[];
  painTimingFreeText: string;
  strengthLevel: string;
  strengthMMT: string;
  romLevel: string;
  romDirections: RomDirection[];
  otherConditions: string[];
  otherConditionFreeText: string;
  environment: string;
  surgery: string;
  surgeryOther: string;
  postOpDays: string;
  visitFrequency: string;
  phase: string;
}

function buildConditionText(f: FilterState): string {
  const lines: string[] = [];

  if (f.ageGroups.length > 0) lines.push(`年代：${f.ageGroups.join("・")}`);
  if (f.gender) lines.push(`性別：${f.gender}`);

  if (f.painTimings.length > 0) lines.push(`痛みが出るタイミング：${f.painTimings.join("・")}`);
  if (f.painTimingFreeText.trim()) lines.push(`痛みのタイミング（詳細）：${f.painTimingFreeText.trim()}`);

  if (f.strengthLevel && f.strengthLevel !== "なし") {
    const mmt = f.strengthMMT ? `（実測 MMT${f.strengthMMT}）` : "";
    lines.push(`筋力低下：${f.strengthLevel}${mmt}`);
  }

  if (f.romLevel && f.romLevel !== "なし") {
    const dirs = f.romDirections.map(d =>
      d.degree ? `${d.direction} ${d.degree}°` : d.direction
    );
    const dirText = dirs.length > 0 ? `（${dirs.join("・")}）` : "";
    lines.push(`関節可動域制限：${f.romLevel}${dirText}`);
  }

  if (f.otherConditions.length > 0) lines.push(`その他の状態：${f.otherConditions.join("・")}`);
  if (f.otherConditionFreeText.trim()) lines.push(`その他（詳細）：${f.otherConditionFreeText.trim()}`);

  if (f.environment === "入院") {
    lines.push(`受療環境：入院`);
    const surg = f.surgery === "その他"
      ? `その他（${f.surgeryOther}）`
      : f.surgery;
    if (surg) lines.push(`術式：${surg}`);
    if (f.postOpDays) lines.push(`術後経過：${f.postOpDays}`);
  } else if (f.environment === "外来") {
    lines.push(`受療環境：外来`);
    if (f.visitFrequency) lines.push(`通院頻度：${f.visitFrequency}`);
    if (f.phase) lines.push(`症状の経過：${f.phase}`);
  }

  return lines.join("\n") || "（条件の指定なし）";
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { disease?: string; filters?: FilterState };
  const { disease, filters } = body;

  if (!disease || !filters) {
    return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "APIキー未設定" }, { status: 500 });
  }

  const conditionText = buildConditionText(filters);

  const systemPrompt = `あなたは日本の理学療法士向け医療情報AIです。患者の具体的な状態・条件に基づき、根拠ある実践的な治療・リハビリアプローチを提案してください。

回答はJSONのみ。前置き・後置き・コードブロック不要：
{"recommendations":"・具体的な介入1\n・介入2\n（計7〜10項目）","references":["著者. 書名/論文名. 出版社/雑誌, 年."]}

・各項目は「・」で始め、1行以内で具体的かつ実践的に
・患者の条件（術後日数、痛みのタイミング、ROM制限方向・角度など）を必ず反映する
・フリーテキストの詳細情報も考慮した提案にする
・禁忌・注意事項があれば⚠️マークで先頭に記載する
・参考文献は日本のガイドライン・教科書・RCTを2〜4件`;

  const userPrompt = `疾患：${disease}

患者の状態・条件：
${conditionText}

この患者に対する具体的な治療・リハビリアプローチを提案してください。`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content[0];
    if (raw.type !== "text") {
      return NextResponse.json({ error: "生成に失敗しました" }, { status: 500 });
    }

    const jsonMatch = raw.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "レスポンスの解析に失敗しました" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      recommendations: string;
      references: string[];
    };
    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
