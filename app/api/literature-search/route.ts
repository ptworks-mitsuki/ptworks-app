import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

export interface LiteratureSearchResponse {
  keywordsJa: string[];
  keywordsEn: string[];
  all:        string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { query?: string };
    const query = (body.query ?? "").trim();
    if (!query) {
      return NextResponse.json({ keywordsJa: [query], keywordsEn: [], all: [query] });
    }

    const message = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `理学療法・リハビリテーション分野の文献検索において、ユーザーの入力キーワードを拡張してください。

入力：「${query}」

以下のJSON形式のみで回答してください：
{
  "keywordsJa": ["日本語キーワード1", "日本語キーワード2", "日本語キーワード3", "日本語キーワード4", "日本語キーワード5"],
  "keywordsEn": ["english keyword1", "english keyword2", "english keyword3", "english keyword4"]
}

・日本語キーワードは5〜7個、英語キーワードは4〜6個
・同義語・関連語・上位概念・下位概念を含める
・略語・一般名・学術名の両方を含める
・理学療法・リハビリテーション文脈に特化すること`,
      }],
    });

    const raw = message.content[0];
    if (raw.type !== "text") throw new Error("no text");

    const match = raw.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no json");

    const parsed = JSON.parse(match[0]) as { keywordsJa: string[]; keywordsEn: string[] };
    const all = [query, ...parsed.keywordsJa, ...parsed.keywordsEn];

    return NextResponse.json({ keywordsJa: parsed.keywordsJa, keywordsEn: parsed.keywordsEn, all });
  } catch {
    // fallback: return the original query as-is
    const query = "";
    return NextResponse.json({ keywordsJa: [], keywordsEn: [], all: [query] });
  }
}
