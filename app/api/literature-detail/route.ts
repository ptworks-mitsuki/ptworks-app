import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

export interface LiteratureDetailResponse {
  summaryJa:       string;
  clinicalPoints:  string[];
  evidenceLevel:   string;
  evidenceLevelReason: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      title?:   string;
      titleJa?: string;
      authors?: string;
      journal?: string;
      year?:    number;
      summary?: string;
    };

    const { title, titleJa, authors, journal, year, summary } = body;
    if (!title) return NextResponse.json({ error: "タイトルが必要です" }, { status: 400 });

    const message = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `以下の論文情報をもとに、理学療法士向けの情報を生成してください。

論文タイトル（英語）：${title}
論文タイトル（日本語）：${titleJa ?? ""}
著者：${authors ?? ""}
雑誌：${journal ?? ""}
発行年：${year ?? ""}
既存の要約：${summary ?? ""}

以下のJSON形式のみで回答してください：
{
  "summaryJa": "研究目的・方法・結果・結論を含む日本語要約（5〜8行、改行なし）",
  "clinicalPoints": [
    "臨床で活かせるポイント1（この結果をどう臨床応用するか）",
    "臨床で活かせるポイント2（どんな患者に応用できるか）",
    "臨床で活かせるポイント3（注意すべき点）",
    "臨床で活かせるポイント4（エビデンスの限界）"
  ],
  "evidenceLevel": "A" or "B" or "C" or "D",
  "evidenceLevelReason": "エビデンスレベルの判定根拠（1文）"
}

エビデンスレベル判定基準：
A = システマティックレビュー・メタ解析
B = RCT（無作為化比較試験）
C = コホート研究・前後比較研究
D = 症例報告・専門家意見`,
      }],
    });

    const raw = message.content[0];
    if (raw.type !== "text") throw new Error("no text");

    const match = raw.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no json");

    const parsed = JSON.parse(match[0]) as LiteratureDetailResponse;
    return NextResponse.json(parsed);

  } catch (err) {
    console.error("[literature-detail]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "生成に失敗しました。もう一度お試しください。" }, { status: 500 });
  }
}
