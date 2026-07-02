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
      return NextResponse.json({ keywordsJa: [], keywordsEn: [], all: [query] });
    }

    const message = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: `理学療法・リハビリテーション分野の文献検索専門AIです。
ユーザー入力キーワードを医学的・理学療法的観点から大幅に拡張してください。

入力：「${query}」

拡張ルール：
1. 疾患名は同義語・略語・英語名・病態名を含める
   例）糖尿病 → 糖尿病性神経障害, 糖尿病性足病変, HbA1c, 2型糖尿病, diabetes mellitus, diabetic neuropathy
2. 部位名は関連疾患・障害・手技名を含める
   例）肩 野球 → 野球肩, 投球障害肩, 肩インピンジメント症候群, 腱板損傷, baseball shoulder, rotator cuff, pitching injury
3. 症状名は評価スケール・介入法を含める
   例）疼痛 → NRS, VAS, 慢性疼痛, 神経障害性疼痛, pain assessment, chronic pain
4. 日本語7〜9個、英語5〜7個を生成すること

以下のJSON形式のみで回答（余分なテキスト不要）：
{
  "keywordsJa": ["日本語1", "日本語2", "日本語3", "日本語4", "日本語5", "日本語6", "日本語7"],
  "keywordsEn": ["english1", "english2", "english3", "english4", "english5"]
}`,
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
    return NextResponse.json({ keywordsJa: [], keywordsEn: [], all: [] });
  }
}
