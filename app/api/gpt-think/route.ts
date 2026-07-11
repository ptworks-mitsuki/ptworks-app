import { NextRequest, NextResponse } from "next/server";
import { createClient, getApiKey } from "@/lib/api-error";

export const maxDuration = 30;

const SYSTEM = `理学療法士向けAI。以下の回答を読んでPTがさらに深く考えるための質問を3〜4個生成する。JSONのみ出力。前置き・説明不要。`;

export async function POST(req: NextRequest) {
  const { content } = await req.json() as { content?: string };
  if (!content?.trim() || !getApiKey()) {
    return NextResponse.json({ buttons: [] });
  }

  try {
    const client = createClient();
    const msg = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system:     [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages:   [{
        role:    "user",
        content: `回答内容：\n${content.slice(0, 1200)}\n\n出力形式（JSONのみ）：\n{"buttons":["質問1（20文字以内）","質問2（20文字以内）","質問3（20文字以内）","質問4（20文字以内）"]}`,
      }],
    });

    const raw     = msg.content[0].type === "text" ? msg.content[0].text : "";
    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    const parsed  = JSON.parse(cleaned) as { buttons: string[] };
    const buttons = (parsed.buttons ?? []).filter(b => typeof b === "string" && b.trim()).slice(0, 4);
    return NextResponse.json({ buttons });
  } catch {
    return NextResponse.json({ buttons: [] });
  }
}
