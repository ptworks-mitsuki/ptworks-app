import { NextRequest } from "next/server";
import type { NewSectionKey, } from "@/types/medical";
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

const SYSTEM_PROMPT = `理学療法士向けに疾患情報を回答してください。
前置き・挨拶不要。各セクションを以下の区切り記号から始めてください。

===DEFINITION===
定義・概要（150文字以内）

===SYMPTOMS===
主な症状（箇条書き・で5項目以内）

===ASSESSMENT===
評価方法（箇条書き・で5項目以内）評価スケール名は[[スケール名]]で囲む

===TREATMENT===
治療方針・リハビリアプローチ（箇条書き・で7項目以内）

===CONTRAINDICATIONS===
注意事項・禁忌（箇条書き・で4項目以内）

===CLINICAL===
臨床ポイント（箇条書き・で3項目以内）

===REFERENCES===
関連文献3件以内（「著者. 書名. 出版社, 年.」形式）`;

// ── SSE event types (sent to client) ─────────────────────────────────────

type SseEvent =
  | { type: "section_start"; key: NewSectionKey }
  | { type: "text";          key: NewSectionKey; text: string }
  | { type: "section_end";   key: NewSectionKey }
  | { type: "done" }
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

/** Returns the index where a possible partial marker begins (or text.length if none). */
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
  const body    = await req.json() as { disease?: unknown };
  const disease = body.disease;

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

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );

      async function runStream(): Promise<void> {
        const anthropicStream = client.messages.stream({
          model:      "claude-sonnet-4-6",
          max_tokens: 900,
          system:     SYSTEM_PROMPT,
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

          // Process buffer: extract complete sections and safe text chunks
          let changed = true;
          while (changed) {
            changed = false;
            const marker = findEarliestMarker(buffer);

            if (marker) {
              // Flush text before this marker to current section
              if (currentKey && marker.start > 0) {
                const flushed = buffer.slice(0, marker.start).trimEnd();
                if (flushed) send({ type: "text", key: currentKey, text: flushed });
                send({ type: "section_end", key: currentKey });
              } else if (currentKey) {
                send({ type: "section_end", key: currentKey });
              }

              // Start new section
              currentKey = marker.key;
              send({ type: "section_start", key: marker.key });
              buffer = buffer.slice(marker.end).replace(/^\n/, "");
              changed = true;
            } else {
              // No complete marker — emit safe portion of buffer
              const safeEnd = partialMarkerStart(buffer);
              if (currentKey && safeEnd > 0) {
                send({ type: "text", key: currentKey, text: buffer.slice(0, safeEnd) });
                buffer = buffer.slice(safeEnd);
              } else if (!currentKey) {
                // Pre-first-marker preamble: discard safe portion
                buffer = buffer.slice(safeEnd);
              }
            }
          }
        }

        // Final flush of remaining buffer
        if (currentKey && buffer.trim()) {
          send({ type: "text", key: currentKey, text: buffer.trim() });
          send({ type: "section_end", key: currentKey });
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

      send({ type: "done" });
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
