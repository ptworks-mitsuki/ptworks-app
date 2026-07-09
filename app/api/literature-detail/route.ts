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

    const { title, titleJa, authors, journal, year, summary, citation } = body as typeof body & { citation?: string };
    if (!title && !citation) return NextResponse.json({ error: "タイトルまたは文献情報が必要です" }, { status: 400 });

    const citationText = citation
      ? `文献：${citation}`
      : [
          `論文タイトル（英語）：${title}`,
          titleJa  ? `論文タイトル（日本語）：${titleJa}` : "",
          authors  ? `著者：${authors}` : "",
          journal  ? `雑誌：${journal}` : "",
          year     ? `発行年：${year}` : "",
          summary  ? `既存の要約：${summary}` : "",
        ].filter(Boolean).join("\n");

    const LITDETAIL_SYSTEM = `PT向け文献解説AI。JSON形式のみで回答。前置き・指示文は出力しない。エビデンスレベル：A=RCT・メタ解析・SR、B=コホート・前後比較、C=専門家意見・GL、D=症例報告・経験則。`;
    const message = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1000,
      system:     [{ type: "text", text: LITDETAIL_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: `以下の文献を日本語で説明してください。\n\n${citationText}\n\n以下のJSON形式のみで回答：\n{"summaryJa":"目的・方法・結果・結論を3〜4行でまとめた日本語要約","clinicalPoints":["PTが臨床で活かせるポイント1","ポイント2","ポイント3"],"evidenceLevel":"A|B|C|D","evidenceLevelReason":"判定根拠1文"}`,
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
