import { NextRequest, NextResponse } from "next/server";
import { createClient, getApiKey, withRetry, translateError } from "@/lib/api-error";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { type?: string; form?: Record<string, string> };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "リクエストの解析に失敗しました" }, { status: 400 });
  }

  if (!getApiKey()) {
    return NextResponse.json({ error: "現在メンテナンス中です。" }, { status: 503 });
  }

  const { type, form = {} } = body;

  const ctx = Object.entries(form)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const prompt = `あなたは理学療法・リハビリテーション分野の専門家です。
以下の発表内容に関連する参考文献を3〜5件提案してください。

注意：
- 実在する可能性が高い文献のみ提案してください（架空の文献は絶対に含めない）
- 不明な場合は提案件数を少なくしても構いません
- 日本理学療法士協会誌、理学療法学、PTジャーナルなどの日本語文献を優先
- フォーマット：「著者名. タイトル. 雑誌名. 年;巻(号):ページ.」

【発表タイプ】${type ?? "症例発表"}
【発表内容】
${ctx || "情報なし"}

【出力】JSONのみ（説明文不要）：
{ "suggestions": ["著者名 他. タイトル. 雑誌名. 年;巻(号):ページ.", ...] }`;

  try {
    const client = createClient();
    const msg = await withRetry(() =>
      client.messages.create({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages:   [{ role: "user", content: prompt }],
      })
    );

    const raw     = msg.content[0].type === "text" ? msg.content[0].text : "";
    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    const parsed  = JSON.parse(cleaned) as { suggestions: string[] };
    return NextResponse.json(parsed);

  } catch (err) {
    console.error("[suggest-refs]", err);
    return NextResponse.json({ error: translateError(err) }, { status: 503 });
  }
}
