import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple diagram type per section
const DIAGRAM_SPECS: Record<string, string> = {
  pathophysiology:
    "「原因 → 病理変化 → 症状」の3〜4ステップのシンプルな縦フローチャート。各ボックスに短いラベル（10字以内）。",
  anatomy:
    "関連する主要構造を3〜5個のラベル付きボックスで示す図。病変部位を赤枠で強調。シンプルな配置。",
  staging:
    "軽症・中等症・重症の3段階を横に並べたシンプルな段階図。各段階の特徴を1行で記載。",
  prognosis:
    "急性期・回復期・維持期の3段階を横に並べたタイムライン。各期の目安を短くラベル。",
  assessment:
    "主要評価項目を3〜5個のボックスに整理したシンプルな一覧図。スケール名と用途を表示。",
  treatment:
    "急性期・回復期・維持期のアプローチを3列に並べたシンプルな分類図。各列に主な介入を2〜3項目。",
  contraindications:
    "絶対禁忌（赤）・相対禁忌（黄）・注意（青）の3区分を色分けしたシンプルなボックス図。各区分に主な項目を2〜3個。",
};

const SVG_SYSTEM = `あなたは医療教育用の**シンプルなSVGダイアグラム**を作成する専門家です。

【絶対ルール】
- <svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" width="100%" height="auto"> で開始
- 背景: <rect width="560" height="360" fill="#ffffff"/>
- 要素数: ボックス・矢印合わせて最大8個（シンプルさ最優先）
- フォントサイズ: タイトル16px、本文14px（最小14px厳守）
- フォント: font-family="'Hiragino Sans','Yu Gothic',sans-serif"
- 角丸ボックス: rx="8" stroke-width="2"
- テキストはすべて日本語
- 長いテキストは<tspan>で改行（1行15字以内）
- 矢印は太め（marker-end使用、stroke-width="2.5"）

【カラーパレット】
- ボックス背景: #eff6ff（青系）、#f0fdf4（緑系）、#fef2f2（赤系）、#fffbeb（黄系）
- ボックス枠: #2563eb（青）、#16a34a（緑）、#dc2626（赤）、#d97706（黄）
- テキスト: #1e3a5f（濃青、視認性最優先）
- 矢印: #475569

【出力形式】
<svg から </svg> までのSVGコードのみ。前置き・説明・コードフェンスは一切不要。`;

/** Strip script tags and event handlers as basic XSS protection */
function sanitizeSVG(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
}

/** Extract the <svg>...</svg> block from Claude's output */
function extractSVG(text: string): string | null {
  const match = text.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? sanitizeSVG(match[0]) : null;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { disease?: string; sectionKey?: string; sectionTitle?: string };
  const { disease, sectionKey, sectionTitle } = body;

  if (!disease || !sectionKey || !sectionTitle) {
    return NextResponse.json({ error: "パラメータが不足しています" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "APIキー未設定" }, { status: 500 });
  }

  const spec = DIAGRAM_SPECS[sectionKey] ?? `「${disease}」の${sectionTitle}を示すシンプルな図。最大5要素。`;

  const userPrompt = `疾患：${disease}
セクション：${sectionTitle}
描く内容：${spec}

シンプルで見やすいSVGを生成してください。`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      system: SVG_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content[0];
    if (raw.type !== "text") {
      return NextResponse.json({ error: "生成に失敗しました" }, { status: 500 });
    }

    const svg = extractSVG(raw.text);
    if (!svg) {
      return NextResponse.json({ error: "SVGの抽出に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ svg });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
