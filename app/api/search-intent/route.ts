import { NextRequest, NextResponse } from "next/server";
import { createClient, getApiKey, withRetry } from "@/lib/api-error";

export const maxDuration = 15;

const SYSTEM = `あなたは理学療法士向け検索システムのAIアシスタントです。
ユーザーが入力したキーワードに対して「何を知りたいか」の選択肢を4〜5個生成してください。

ルール：
- 各選択肢は「〜を知りたい」「〜を確認したい」「〜について調べたい」の形式
- 理学療法士の臨床・学習・業務に直結した内容
- 1行1選択肢、番号・記号・箇条書き記号なし
- 挨拶・説明・余分な文章は一切不要
- 4〜5個だけ出力`;

export async function POST(req: NextRequest) {
  const body = await req.json() as { query?: unknown };
  const query = typeof body.query === "string" ? body.query.trim() : "";

  if (!query || query.length < 2) return NextResponse.json({ options: [] });
  if (!getApiKey()) return NextResponse.json({ options: [] });

  try {
    const client = createClient();
    const msg = await withRetry(() =>
      client.messages.create({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system:     SYSTEM,
        messages:   [{ role: "user", content: `キーワード：「${query}」` }],
      })
    );

    const raw = msg.content[0];
    if (raw.type !== "text") return NextResponse.json({ options: [] });

    const options = raw.text
      .split("\n")
      .map((l: string) => l.replace(/^[-・*\d.)\s]+/, "").trim())
      .filter((l: string) => l.length > 3)
      .slice(0, 5);

    return NextResponse.json({ options });
  } catch {
    return NextResponse.json({ options: [] });
  }
}
