import { NextRequest, NextResponse } from "next/server";
import {
  createClient, getApiKey,
  withRetry, isBalanceError,
  translateError, notifyAdmin,
} from "@/lib/api-error";

export const maxDuration = 60;

const SYSTEM_PROMPT = `あなたは日本の理学療法士向け医療情報専門AIです。
疾患の治療・リハビリアプローチを以下の2種類に分けて回答してください。

① 日本の標準的アプローチ：日本の教科書・ガイドライン・学会基準に準拠した介入
② 海外の最新エビデンス：RCT・系統的レビューなど国際的な最新エビデンスに基づく介入

必ず以下のJSON形式のみで回答してください。コードブロック・前置き・後置きは一切不要です：

{
  "standard": {
    "points": ["・日本標準のアプローチ1", "・アプローチ2", "・アプローチ3（計5〜7項目）"],
    "references": ["日本語の教科書/ガイドライン名. 出版社/学会, 年."]
  },
  "evidence": [
    {
      "approach": "エビデンスベースのアプローチ名（短く）",
      "detail": "具体的な内容と効果・根拠を1〜2文で",
      "source": "第一著者 et al., 年, 雑誌名",
      "studyType": "RCT" または "系統的レビュー" または "メタ解析" または "コホート研究"
    }
  ],
  "synthesis": "日本の標準と海外エビデンスの違い・共通点・最新トレンドを2〜3文で。「最新では〇〇という考え方も広まっています」など。",
  "references": ["全参考文献リスト（重複不可）"]
}

evidenceは3〜5件。studyTypeは必ず上記4種類のいずれか。`;

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
  evidence:   EvidenceItem[];
  synthesis:  string;
  references: string[];
}

export async function POST(req: NextRequest) {
  try {
    let body: { disease?: unknown };
    try { body = await req.json() as typeof body; }
    catch { return NextResponse.json({ error: "リクエストの解析に失敗しました" }, { status: 400 }); }

    const disease = body.disease;
    if (!disease || typeof disease !== "string") {
      return NextResponse.json({ error: "疾患名を入力してください" }, { status: 400 });
    }
    if (!getApiKey()) {
      return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 503 });
    }

    const client = createClient();
    const message = await withRetry(() =>
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `疾患名：${disease}` }],
      }),
    );

    const raw = message.content[0];
    if (raw.type !== "text") {
      return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 500 });
    }

    const jsonMatch = raw.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[treatment-evidence] No JSON:", raw.text.slice(0, 200));
      return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 500 });
    }

    let parsed: TreatmentEvidenceResult;
    try { parsed = JSON.parse(jsonMatch[0]) as TreatmentEvidenceResult; }
    catch (e) {
      console.error("[treatment-evidence] JSON parse error:", e);
      return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 500 });
    }

    return NextResponse.json(parsed);

  } catch (err) {
    if (isBalanceError(err)) void notifyAdmin(err);
    console.error("[treatment-evidence] Unhandled:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: translateError(err) }, { status: 503 });
  }
}
