import { NextRequest } from "next/server";
import type { NewSectionKey } from "@/types/medical";
import { NEW_SECTION_ORDER } from "@/types/medical";
import {
  createClient, getApiKey,
  isBalanceError, translateError, notifyAdmin,
} from "@/lib/api-error";

export const maxDuration = 60;

// ── Section delimiters ────────────────────────────────────────────────────

const MARKERS: Record<NewSectionKey, string> = {
  definition:        "===DEFINITION===",
  symptoms:          "===SYMPTOMS===",
  assessment:        "===ASSESSMENT===",
  treatment:         "===TREATMENT===",
  contraindications: "===CONTRAINDICATIONS===",
  clinical_points:   "===CLINICAL===",
  references:        "===REFERENCES===",
};

const MAX_MARKER_LEN = Math.max(...Object.values(MARKERS).map(m => m.length));

// ── Prompts ────────────────────────────────────────────────────────────────

const STEP1_PROMPT = `理学療法士向けに疾患情報を回答してください。
以下の7項目について、各項目3点以内の箇条書きで簡潔に回答してください。
前置き・説明文は不要です。すぐに内容を出力してください。

===DEFINITION===
定義・概要（3点以内の箇条書き）

===SYMPTOMS===
主な症状（3点以内の箇条書き）

===ASSESSMENT===
評価方法（3点以内）評価スケール名は[[スケール名]]で囲む

===TREATMENT===
治療方針・リハビリアプローチ（3点以内の箇条書き）

===CONTRAINDICATIONS===
注意事項・禁忌（3点以内の箇条書き）

===CLINICAL===
臨床ポイント（3点以内の箇条書き）

===REFERENCES===
関連書籍・ガイドライン（3件以内）`;

const STEP2_PROMPT = `理学療法士向けに疾患の詳細情報を回答してください。
先ほどの7項目についてそれぞれ詳しい内容を追加してください。
各項目の詳細・補足・注意点を**マークダウン形式**で追記してください。
（**太字**・- 箇条書き・## 見出しを適切に使用してください）

各セクションに関連する日本の理学療法**教科書・参考書**を1〜2件追加してください。
文献はセクションテキストの直後に「|||REF|||」の区切りを入れて追加してください:
|||REF|||
書籍タイトル | 著者・出版社 | 書籍検索キーワード

===REFERENCESセクションのみ===
関連する主要教科書・参考書を疾患カテゴリに応じて3〜5件選んで追加してください。
形式: 書籍タイトル | 著者・出版社 | 書籍検索キーワード

疾患カテゴリ別の推奨教科書（疾患に応じて適切なものを選ぶこと）:
- 運動器疾患: 整形外科理学療法の理論と技術（石川斉ほか・メジカルビュー社）、運動器疾患の理学療法（工藤慎太郎・医歯薬出版）、標準理学療法学 運動器障害理学療法学（医学書院）
- 脳血管疾患: 脳卒中の理学療法（石川誠・三輪書店）、神経障害理学療法学（石川朗・医学書院）、標準理学療法学 神経障害理学療法学（医学書院）
- 内部障害: 内部障害理学療法学（木村貞治・医歯薬出版）、心臓リハビリテーション（日本心臓リハビリテーション学会）、呼吸理学療法（石川朗・中山書店）
- 老年・廃用: 老年理学療法学（鈴木隆雄・医歯薬出版）、廃用症候群のリハビリテーション（三上靖夫）
- 小児: 小児理学療法学（津山直一・医学書院）

同じ区切り記号（===DEFINITION=== 等）を使用してください。前置き不要、すぐに出力してください。

===DEFINITION===
===SYMPTOMS===
===ASSESSMENT===
===TREATMENT===
===CONTRAINDICATIONS===
===CLINICAL===
===REFERENCES===`;

// ── SSE event types ────────────────────────────────────────────────────────

type SseEvent =
  | { type: "section_start"; key: NewSectionKey; step: 1 | 2 }
  | { type: "text";          key: NewSectionKey; text: string; step: 1 | 2 }
  | { type: "section_end";   key: NewSectionKey; step: 1 | 2 }
  | { type: "done";          step: 1 | 2 }
  | { type: "error"; error: string };

// ── Buffer parser ─────────────────────────────────────────────────────────

function findEarliestMarker(
  text: string,
): { key: NewSectionKey; start: number; end: number } | null {
  let best: { key: NewSectionKey; start: number; end: number } | null = null;
  for (const key of NEW_SECTION_ORDER) {
    const m   = MARKERS[key];
    const idx = text.indexOf(m);
    if (idx !== -1 && (best === null || idx < best.start)) {
      best = { key, start: idx, end: idx + m.length };
    }
  }
  return best;
}

function partialMarkerStart(text: string): number {
  for (let i = Math.max(0, text.length - MAX_MARKER_LEN); i < text.length; i++) {
    const suffix = text.slice(i);
    if (suffix.length === 0) break;
    for (const m of Object.values(MARKERS)) {
      if (m.startsWith(suffix)) return i;
    }
  }
  return text.length;
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body    = await req.json() as { disease?: unknown; step?: unknown };
  const disease = body.disease;
  const step    = (body.step === 2 ? 2 : 1) as 1 | 2;

  if (!disease || typeof disease !== "string") {
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: "検索キーワードを入力してください" })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } },
    );
  }
  if (!getApiKey()) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: "現在メンテナンス中です。しばらくお待ちください。" })}\n\n`,
      { status: 503, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const encoder = new TextEncoder();
  const client  = createClient();

  const systemPrompt = step === 1 ? STEP1_PROMPT : STEP2_PROMPT;
  const maxTokens    = step === 1 ? 800 : 2000;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      async function runStream(): Promise<void> {
        const anthropicStream = client.messages.stream({
          model:      "claude-sonnet-4-6",
          max_tokens: maxTokens,
          system:     systemPrompt,
          messages:   [{ role: "user", content: `疾患名：${disease}` }],
        });

        let buffer     = "";
        let currentKey: NewSectionKey | null = null;

        for await (const event of anthropicStream) {
          if (
            event.type !== "content_block_delta" ||
            event.delta.type !== "text_delta"
          ) continue;

          buffer += event.delta.text;

          let changed = true;
          while (changed) {
            changed = false;
            const marker = findEarliestMarker(buffer);

            if (marker) {
              if (currentKey && marker.start > 0) {
                const flushed = buffer.slice(0, marker.start).trimEnd();
                if (flushed) send({ type: "text", key: currentKey, text: flushed, step });
                send({ type: "section_end", key: currentKey, step });
              } else if (currentKey) {
                send({ type: "section_end", key: currentKey, step });
              }

              currentKey = marker.key;
              send({ type: "section_start", key: marker.key, step });
              buffer = buffer.slice(marker.end).replace(/^\n/, "");
              changed = true;
            } else {
              const safeEnd = partialMarkerStart(buffer);
              if (currentKey && safeEnd > 0) {
                send({ type: "text", key: currentKey, text: buffer.slice(0, safeEnd), step });
                buffer = buffer.slice(safeEnd);
              } else if (!currentKey) {
                buffer = buffer.slice(safeEnd);
              }
            }
          }
        }

        if (currentKey && buffer.trim()) {
          send({ type: "text", key: currentKey, text: buffer.trim(), step });
          send({ type: "section_end", key: currentKey, step });
        }
      }

      const transient = (e: unknown) => {
        const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
        return (
          m.includes("429") || m.includes("529") || m.includes("overloaded") ||
          m.includes("rate_limit") || m.includes("timeout") || m.includes("fetch failed")
        );
      };

      try {
        await runStream();
      } catch (firstErr) {
        if (transient(firstErr)) {
          await new Promise<void>(r => setTimeout(r, 1200));
          try {
            await runStream();
          } catch (secondErr) {
            if (isBalanceError(secondErr)) void notifyAdmin(secondErr);
            send({ type: "error", error: translateError(secondErr) });
            controller.close();
            return;
          }
        } else {
          if (isBalanceError(firstErr)) void notifyAdmin(firstErr);
          send({ type: "error", error: translateError(firstErr) });
          controller.close();
          return;
        }
      }

      send({ type: "done", step });
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
