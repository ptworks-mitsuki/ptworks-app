import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 15;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { query?: string; disease?: string };
    const { query, disease } = body;

    if (!query || !disease) {
      return NextResponse.json({ answer: "" });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `理学療法士向けに、以下の質問に対して「${disease}」の観点から具体的・簡潔に回答してください。

質問：「${query}」
疾患：${disease}

回答条件：
・3〜5行程度、箇条書き可
・臨床で即使える具体的な内容
・「${query}」に直接関係する内容に絞る
・「${disease}」の観点から答える
・冒頭に「${disease}について：」などの疾患名の繰り返しは不要
・マークダウン記号（**など）は使わない`,
      }],
    });

    const raw = message.content[0];
    const answer = raw.type === "text" ? raw.text.trim() : "";
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ answer: "" });
  }
}
