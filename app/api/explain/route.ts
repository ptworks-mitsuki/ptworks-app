import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json() as { term?: string; disease?: string };
  const { term, disease } = body;

  if (!term || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ explanation: "説明を取得できませんでした" });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `理学療法・医療の文脈で「${term}」を2〜3文で簡潔に説明してください。${disease ? `（疾患：${disease}）` : ""}
JSON形式のみ: {"explanation":"説明文"}`,
      }],
    });

    const raw = message.content[0];
    if (raw.type !== "text") throw new Error();

    const match = raw.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error();

    const parsed = JSON.parse(match[0]) as { explanation: string };
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ explanation: `${term}：説明を取得できませんでした` });
  }
}
