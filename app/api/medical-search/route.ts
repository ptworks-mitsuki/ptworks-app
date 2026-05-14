import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SectionKey, SECTION_TITLES } from "@/types/medical";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Streaming order: primary sections first for faster visible feedback
const SECTION_KEYS: SectionKey[] = [
  "pathophysiology", "anatomy", "treatment",
  "staging", "prognosis", "assessment", "contraindications",
];

const SYSTEM_PROMPT = `あなたは日本の理学療法士向けの医療情報専門AIです。
入力は疾患名・症状・身体部位などさまざまな形式で届きます。
入力が疾患名でない場合は、最も関連性の高い代表的な疾患・障害を1つ特定して回答してください。

以下の7項目を箇条書き（「・」始まり）でまとめてください。
項目ごとに指定の行数を守ってください。

【詳細項目（6〜8行）— 一目でわかる図解的な箇条書きで】
・pathophysiology（病態）：発症機序→病理変化→症状・機能障害の流れを詳しく。数値・分類名も含める。
・anatomy（解剖学的背景）：関連する骨・筋・神経・靭帯の構造と役割、病変部位を詳しく。
・treatment（治療・アプローチ）：急性期・回復期・維持期ごとの具体的介入を詳しく。エビデンスベースで。

【コンパクト項目（3〜4行）】
・staging（病期・重症度分類）：主要分類法と各ステージの基準を簡潔に。
・prognosis（予後）：回復経過・予後因子をエビデンスベースで簡潔に。
・assessment（評価）：推奨評価スケールと測定方法を簡潔に。
・contraindications（禁忌・注意事項）：絶対禁忌・相対禁忌・注意事項を簡潔に。

必ず以下のJSON形式のみで回答してください。コードブロック・前置き・後置きは一切不要です：

{
  "pathophysiology": {
    "content": "・〇〇\n・〇〇\n・〇〇\n・〇〇\n・〇〇\n・〇〇",
    "references": ["著者. 書名. 出版社, 年."]
  },
  "anatomy": {
    "content": "・〇〇\n・〇〇\n・〇〇\n・〇〇\n・〇〇",
    "references": ["著者. 書名. 出版社, 年."]
  },
  "treatment": {
    "content": "・〇〇\n・〇〇\n・〇〇\n・〇〇\n・〇〇\n・〇〇\n・〇〇",
    "references": ["著者. 書名. 出版社, 年."]
  },
  "staging": {
    "content": "・〇〇\n・〇〇\n・〇〇",
    "references": ["著者. 書名. 出版社, 年."]
  },
  "prognosis": {
    "content": "・〇〇\n・〇〇\n・〇〇",
    "references": ["著者. 書名. 出版社, 年."]
  },
  "assessment": {
    "content": "・〇〇\n・〇〇\n・〇〇",
    "references": ["著者. 書名. 出版社, 年."]
  },
  "contraindications": {
    "content": "・〇〇\n・〇〇\n・〇〇",
    "references": ["著者. 書名. 出版社, 年."]
  }
}

referencesには実際に存在する日本語の教科書・ガイドライン・論文を2〜3件。
「著者名. 書名. 出版社, 年.」形式で記載してください。

【専門用語のマークアップ】
contentフィールド内で、以下の種類の用語を [[用語名]] で囲んでください：
- 評価スケール名（例：[[FIM]]、[[Barthel Index]]、[[NIHSS]]、[[MBI]]）
- 医学的分類法（例：[[Kellgren-Lawrence分類]]、[[NYHA分類]]、[[Brunnstrom Stage]]）
- 略語・専門略称（例：[[ROM]]、[[MMT]]、[[ADL]]、[[IADL]]）
一般的な日本語（疼痛・筋力・可動域など）には付けないでください。`;

function extractSection(
  accumulated: string,
  key: string
): { content: string; references: string[] } | null {
  const keyIdx = accumulated.indexOf(`"${key}"`);
  if (keyIdx === -1) return null;

  const braceStart = accumulated.indexOf("{", keyIdx + key.length + 2);
  if (braceStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = braceStart; i < accumulated.length; i++) {
    const ch = accumulated[i];
    if (escaped)                 { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true;  continue; }
    if (ch === '"')              { inString = !inString; continue; }
    if (inString)                continue;
    if (ch === "{")              { depth++; continue; }
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(accumulated.slice(braceStart, i + 1)) as {
            content: string;
            references: string[];
          };
          if (typeof parsed.content === "string" && Array.isArray(parsed.references)) {
            return parsed;
          }
        } catch { /* wait for more */ }
        return null;
      }
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { disease?: unknown };
  const disease = body.disease;

  if (!disease || typeof disease !== "string") {
    return NextResponse.json({ error: "検索キーワードを入力してください" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "APIキーが設定されていません。.env.local に ANTHROPIC_API_KEY を設定してください。" },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        const anthropicStream = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 5000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `検索キーワード：${disease}` }],
        });

        let accumulated = "";
        const sent = new Set<SectionKey>();

        for await (const event of anthropicStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            accumulated += event.delta.text;

            for (const key of SECTION_KEYS) {
              if (sent.has(key)) continue;
              const data = extractSection(accumulated, key);
              if (data) {
                send({ section: key, data: { title: SECTION_TITLES[key], ...data } });
                sent.add(key);
              }
            }
          }
        }

        // Final pass for anything not yet caught
        for (const key of SECTION_KEYS) {
          if (sent.has(key)) continue;
          const data = extractSection(accumulated, key);
          if (data) send({ section: key, data: { title: SECTION_TITLES[key], ...data } });
        }

        send({ done: true });
      } catch (err) {
        send({ error: err instanceof Error ? err.message : "不明なエラーが発生しました" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
