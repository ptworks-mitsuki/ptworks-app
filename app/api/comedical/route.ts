import { NextRequest, NextResponse } from "next/server";
import {
  createClient, getApiKey,
  withRetry, isBalanceError,
  translateError, notifyAdmin,
} from "@/lib/api-error";

export const maxDuration = 45;

const SYSTEM_PROMPT = `あなたは日本の多職種連携チームの医療情報専門AIです。
入力された疾患について、理学療法士が知っておくべき他職種の介入視点と
カンファレンスで活用できる質問例を生成してください。

必ず以下のJSON形式のみで回答してください。コードブロック・前置き・後置きは一切不要：

{
  "nursing": "・この疾患に対して看護師が行う主な介入（3〜5項目）\n・バイタル管理・体位変換・服薬管理など具体的に",
  "ot": "・OT（作業療法士）がこの疾患で評価・介入する視点（3〜5項目）\n・ADL・上肢機能・高次脳機能評価など具体的に",
  "st": "・ST（言語聴覚士）がこの疾患で確認する視点（3〜4項目）\n・嚥下・言語・認知機能など具体的に（STが不要な疾患は「・本疾患ではSTの介入は一般的ではありません」と記載）",
  "questions": {
    "nurse": ["看護師への具体的な質問文1（？で終わる）", "質問文2", "質問文3"],
    "ot": ["OTへの具体的な質問文1", "質問文2", "質問文3"],
    "doctor": ["医師への具体的な質問文1", "質問文2", "質問文3"],
    "family": ["家族への具体的な質問文1", "質問文2", "質問文3"]
  }
}

質問は「〇〇について教えてください」「〇〇の状態はどうですか？」など、PTが実際のカンファレンスで使える具体的な文章で記載してください。`;

export interface ComedicalResult {
  nursing: string;
  ot:      string;
  st:      string;
  questions: {
    nurse:  string[];
    ot:     string[];
    doctor: string[];
    family: string[];
  };
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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
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
      console.error("[comedical] No JSON:", raw.text.slice(0, 200));
      return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 500 });
    }

    let parsed: ComedicalResult;
    try { parsed = JSON.parse(jsonMatch[0]) as ComedicalResult; }
    catch (e) {
      console.error("[comedical] JSON parse error:", e);
      return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 500 });
    }

    return NextResponse.json(parsed);

  } catch (err) {
    if (isBalanceError(err)) void notifyAdmin(err);
    console.error("[comedical] Unhandled:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: translateError(err) }, { status: 503 });
  }
}
