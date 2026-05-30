import { NextRequest, NextResponse } from "next/server";
import {
  createClient, getApiKey,
  withRetry, isBalanceError,
  translateError, notifyAdmin,
} from "@/lib/api-error";

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const body = await req.json() as { term?: string; disease?: string };
  const { term, disease } = body;

  if (!term) {
    return NextResponse.json({ explanation: "説明を取得できませんでした" });
  }

  // No API key → graceful fallback
  if (!getApiKey()) {
    return NextResponse.json({ explanation: `${term}：現在メンテナンス中です。` });
  }

  try {
    const client = createClient();

    const message = await withRetry(() =>
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `理学療法・医療の文脈で「${term}」を2〜3文で簡潔に説明してください。${disease ? `（疾患：${disease}）` : ""}
JSON形式のみ: {"explanation":"説明文"}`,
        }],
      })
    );

    const raw = message.content[0];
    if (raw.type !== "text") throw new Error("no text");

    const match = raw.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no json");

    const parsed = JSON.parse(match[0]) as { explanation: string };
    return NextResponse.json(parsed);

  } catch (err) {
    if (isBalanceError(err)) void notifyAdmin(err);
    console.error("[explain] Error:", translateError(err));
    // Graceful fallback — never break the UI
    return NextResponse.json({ explanation: `${term}：説明を取得できませんでした` });
  }
}
