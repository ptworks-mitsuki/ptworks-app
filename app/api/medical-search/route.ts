import { NextRequest, NextResponse } from "next/server";
import { SectionKey, SECTION_TITLES } from "@/types/medical";
import {
  createClient, getApiKey,
  isBalanceError, translateError, notifyAdmin,
} from "@/lib/api-error";

export const maxDuration = 90;

// Streaming order: primary sections first for faster visible feedback
const SECTION_KEYS: SectionKey[] = [
  "pathophysiology", "anatomy", "treatment",
  "staging", "prognosis", "assessment", "contraindications",
];

const SYSTEM_PROMPT = `あなたは日本の理学療法士向けの医療情報専門AIです。
入力は疾患名・症状・身体部位などさまざまな形式で届きます。
入力が疾患名でない場合は、最も関連性の高い代表的な疾患・障害を1つ特定して回答してください。

以下の7項目を「要点（summary）」と「詳細（detail）」の2段階で回答してください。

【summary の書き方 — 最初から見せる簡潔な要点】
・2〜3行の箇条書きのみ
・最重要ポイントだけを端的に
・assessmentは：推奨スケール名をリストアップするだけ
・treatmentは：主な介入アプローチ名をリストアップするだけ

【detail の書き方 — 「詳しく見る」タップで展開】
・summaryの繰り返しにならないこと（重複禁止）
・なぜそのアプローチをするのかの根拠・機序
・エビデンスレベル（RCT・SR・ガイドライン等）の説明
・臨床での具体的な使い方・判定基準・注意点
・assessmentは：各スケールの測定方法・カットオフ値・臨床的意義
・treatmentは：各アプローチの具体的なプロトコル・適応・タイミング
・4〜6行の箇条書きで記載

必ず以下のJSON形式のみで回答してください。コードブロック・前置き・後置きは一切不要です：

{
  "pathophysiology": {
    "summary": "・〇〇\n・〇〇\n・〇〇",
    "detail": "・〇〇\n・〇〇\n・〇〇\n・〇〇\n・〇〇",
    "references": ["著者. 書名. 出版社, 年."]
  },
  "anatomy": {
    "summary": "・〇〇\n・〇〇\n・〇〇",
    "detail": "・〇〇\n・〇〇\n・〇〇\n・〇〇\n・〇〇",
    "references": ["著者. 書名. 出版社, 年."]
  },
  "treatment": {
    "summary": "・主なアプローチ名1\n・アプローチ名2\n・アプローチ名3",
    "detail": "・アプローチ1の根拠・プロトコル・タイミング\n・アプローチ2の...\n・...",
    "references": ["著者. 書名. 出版社, 年."]
  },
  "staging": {
    "summary": "・〇〇\n・〇〇",
    "detail": "・〇〇\n・〇〇\n・〇〇\n・〇〇",
    "references": ["著者. 書名. 出版社, 年."]
  },
  "prognosis": {
    "summary": "・〇〇\n・〇〇",
    "detail": "・〇〇\n・〇〇\n・〇〇\n・〇〇",
    "references": ["著者. 書名. 出版社, 年."]
  },
  "assessment": {
    "summary": "・[[FIM]]\n・[[Barthel Index]]\n・[[TUG]]（など推奨スケール名のみ）",
    "detail": "・FIMの測定方法・カットオフ・臨床的意義\n・TUGの...\n・...",
    "references": ["著者. 書名. 出版社, 年."]
  },
  "contraindications": {
    "summary": "・〇〇\n・〇〇",
    "detail": "・〇〇\n・〇〇\n・〇〇\n・〇〇",
    "references": ["著者. 書名. 出版社, 年."]
  }
}

referencesには実際に存在する日本語の教科書・ガイドライン・論文を2〜3件。
「著者名. 書名. 出版社, 年.」形式で記載してください。

【専門用語のマークアップ】
summary・detailフィールド内で、以下の種類の用語を [[用語名]] で囲んでください：
- 評価スケール名（例：[[FIM]]、[[Barthel Index]]、[[NIHSS]]、[[MBI]]）
- 医学的分類法（例：[[Kellgren-Lawrence分類]]、[[NYHA分類]]、[[Brunnstrom Stage]]）
- 略語・専門略称（例：[[ROM]]、[[MMT]]、[[ADL]]、[[IADL]]）
一般的な日本語（疼痛・筋力・可動域など）には付けないでください。`;

function extractSection(
  accumulated: string,
  key: string
): { summary: string; detail: string; references: string[] } | null {
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
            summary:    string;
            detail:     string;
            references: string[];
          };
          if (
            typeof parsed.summary === "string" &&
            typeof parsed.detail  === "string" &&
            Array.isArray(parsed.references)
          ) {
            return parsed;
          }
        } catch { /* wait for more data */ }
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
  if (!getApiKey()) {
    return NextResponse.json(
      { error: "現在メンテナンス中です。しばらくお待ちください。" },
      { status: 503 }
    );
  }

  const encoder = new TextEncoder();
  const client  = createClient();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      async function runStream(): Promise<void> {
        const anthropicStream = client.messages.stream({
          model:      "claude-sonnet-4-6",
          max_tokens: 6000,
          system:     SYSTEM_PROMPT,
          messages:   [{ role: "user", content: `検索キーワード：${disease}` }],
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

        // Final pass
        for (const key of SECTION_KEYS) {
          if (sent.has(key)) continue;
          const data = extractSection(accumulated, key);
          if (data) send({ section: key, data: { title: SECTION_TITLES[key], ...data } });
        }
      }

      try {
        await runStream();
      } catch (firstErr) {
        const transient = (e: unknown) => {
          const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
          return m.includes("429") || m.includes("529") || m.includes("overloaded") ||
                 m.includes("rate_limit") || m.includes("timeout") || m.includes("fetch failed");
        };

        if (transient(firstErr)) {
          await new Promise<void>(r => setTimeout(r, 1200));
          try {
            await runStream();
          } catch (secondErr) {
            if (isBalanceError(secondErr)) void notifyAdmin(secondErr);
            send({ error: translateError(secondErr) });
            controller.close();
            return;
          }
        } else {
          if (isBalanceError(firstErr)) void notifyAdmin(firstErr);
          send({ error: translateError(firstErr) });
          controller.close();
          return;
        }
      }

      send({ done: true });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      Connection:       "keep-alive",
    },
  });
}
