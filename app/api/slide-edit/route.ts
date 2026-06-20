import { NextResponse } from "next/server";
import { createClient, withRetry, translateError } from "@/lib/api-error";

export const maxDuration = 60;

export interface SlideEditRequest {
  instruction:       string;
  currentSlideIndex: number;
  allSlides:         unknown[];
}

export type SlideEditResponse =
  | { type: "design";      message: string; themeKey?: string; fontKey?: string; sizeKey?: string }
  | { type: "content";     message: string; slides: unknown[] }
  | { type: "unsupported"; message: string }
  | { type: "error";       message: string };

const SYSTEM = `あなたはPTの発表スライドをチャットで編集するAIアシスタントです。
ユーザーの指示を解析し、指定のJSON形式のみを返してください。説明文は不要です。

【返せるJSONの型】

1. デザイン変更（配色・フォント・文字サイズのみ）:
{ "type": "design", "message": "（変更内容の説明）", "themeKey": "orange|green|mono|blue", "fontKey": "sans|mincho|round", "sizeKey": "sm|md|lg" }
※ 変更しない項目は省略してください。

2. コンテンツ変更（テキスト・箇条書きの文章量・内容の調整）:
{ "type": "content", "message": "（変更内容の説明）", "slides": [ ...変更後の全スライドデータ... ] }
※ slides は渡されたデータを改変したもの。templateType や content のキー名は絶対に変えないこと。

3. 対応不可（レイアウト・表の種類変更・グラフ形式変更）:
{ "type": "unsupported", "message": "レイアウトの大きな変更には対応していません。配色・文字サイズ・文章量の調整が可能です" }

【ターゲットスライドの判定ルール】
- 「全体的に」「全部」「すべて」「全スライド」を含む → 全スライドに適用
- 「○枚目」と明示 → その番号のスライド（1始まり）のみ適用
- 上記なし → 現在表示中のスライドのみ適用

【デザイン変更のマッピング例】
- 「大きくして」→ sizeKey: "lg"
- 「小さくして」→ sizeKey: "sm"
- 「オレンジ」→ themeKey: "orange"
- 「グリーン」「落ち着いた」「シック」→ themeKey: "green"
- 「モノトーン」「白黒」「シンプルな色」→ themeKey: "mono"
- 「ブルー」「青」→ themeKey: "blue"
- 「明朝体」→ fontKey: "mincho"
- 「丸ゴシック」「やわらかい」→ fontKey: "round"
- 「標準」「ゴシック」→ fontKey: "sans"

【コンテンツ変更のルール】
- 「シンプルにして」「減らして」→ 箇条書き項目を3〜4点に削減、各文を短く
- 「詳しくして」「増やして」→ 箇条書き項目を5〜6点に増やし、各文を具体的に
- 「文章を変えて」「書き直して」→ 同じ意味で表現を変える
- templateType は絶対に変更しない
- content のキー名（tableRows, evaluationTable, events, considerations など）は変更しない`;

export async function POST(req: Request) {
  try {
    const body = await req.json() as SlideEditRequest;
    const { instruction, currentSlideIndex, allSlides } = body;

    const client = createClient();

    const userMessage = `
指示：「${instruction}」
現在表示中のスライド番号：${currentSlideIndex + 1}（1始まり）

全スライドデータ：
${JSON.stringify(allSlides, null, 2)}
`.trim();

    const msg = await withRetry(() =>
      client.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 4000,
        system:     SYSTEM,
        messages:   [{ role: "user", content: userMessage }],
      })
    );

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const cleaned = raw
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();

    const parsed = JSON.parse(cleaned) as SlideEditResponse;
    return NextResponse.json(parsed);

  } catch (err) {
    console.error("[slide-edit]", err);
    return NextResponse.json(
      { type: "error", message: translateError(err) } satisfies SlideEditResponse,
      { status: 500 }
    );
  }
}
