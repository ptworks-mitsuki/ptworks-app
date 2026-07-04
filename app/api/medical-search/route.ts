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
  prognosis:         "===PROGNOSIS===",
  treatment:         "===TREATMENT===",
  contraindications: "===CONTRAINDICATIONS===",
  clinical_points:   "===CLINICAL===",
  references:        "===REFERENCES===",
};

const MAX_MARKER_LEN = Math.max(...Object.values(MARKERS).map(m => m.length));

// ── Prompts ────────────────────────────────────────────────────────────────

const STEP1_PROMPT = `あなたは理学療法の専門家です。
現在最もエビデンスレベルが高く信頼性の高い教科書・ガイドラインをもとに以下の7項目を整理してください。
マークダウン記号（**、##など）は使わず、プレーンテキストで回答してください。
各項目3点以内の箇条書きで簡潔に回答してください。
前置き・説明文・あいさつは不要です。すぐに内容を出力してください。

===DEFINITION===
定義・概要（3点以内の箇条書き）

===SYMPTOMS===
主な症状（3点以内の箇条書き）

===ASSESSMENT===
評価・検査（3点以内）評価スケール・整形外科テスト・確認すべき検査値を含める。評価スケール名は[[スケール名]]で囲む

===PROGNOSIS===
予後予測・ゴール設定（3点以内）一般的な予後・回復期間の目安・ADLゴールの設定指標を含める

===TREATMENT===
治療方針・リハビリアプローチ（3点以内の箇条書き）

===CONTRAINDICATIONS===
注意事項・禁忌（3点以内の箇条書き）

===CLINICAL===
臨床ポイント（3点以内の箇条書き）`;

const STEP2_PROMPT = `あなたは理学療法の専門家です。
現在最もエビデンスレベルが高く信頼性の高い教科書・ガイドラインを自動で選んで以下の7項目を整理してください。
各セクションについて、詳しい内容をマークダウン形式（**太字**・- 箇条書き・## 見出し）で記述し、
そのセクションに関連する**日本の理学療法教科書・参考書を3冊以上**追加してください。

【必須ルール】
- 各セクションのテキストの直後に「|||REF|||」の区切りを必ず入れてください
- その後に、そのセクションに最も関連する教科書を3冊以上、以下の形式で書いてください：
  書籍タイトル | 著者・出版社 | 書籍検索キーワード
- REFは省略しないでください。必ず全セクションにREFを付けてください
- 論文・関連文献は不要です
- 前置き・説明文・あいさつは不要です。すぐに内容を出力してください

【セクション別の内容と推奨教科書】

定義・概要（DEFINITION）→ 標準理学療法学・疾患専門書を3冊以上
主な症状（SYMPTOMS）→ 標準理学療法学・病態学・疾患専門書を3冊以上
評価・検査（ASSESSMENT）→ 使用する評価スケール（MMT・NRS・FIM・BIなど）・整形外科テスト・神経学的テスト（該当する疾患のみ）・確認すべき検査値（画像所見・血液データ等）を含める。理学療法評価学（渡邉好孝・医学書院）を含め3冊以上
予後予測・ゴール設定（PROGNOSIS）→ この疾患の一般的な予後・回復の目安となる期間・ADLゴールの設定指標・患者・家族への説明のポイント・予後に影響する因子（年齢・重症度・合併症など）を含める。疾患専門書・リハビリテーションガイドラインを3冊以上
治療方針（TREATMENT）→ 疾患区分別に3冊以上：
  ・運動器: 整形外科理学療法の理論と技術（石川斉・メジカルビュー社）、運動器疾患の理学療法（工藤慎太郎・医歯薬出版）
  ・脳血管: 脳卒中の理学療法（石川誠・三輪書店）、神経障害理学療法学（石川朗・医学書院）
  ・内部障害: 内部障害理学療法学（木村貞治・医歯薬出版）、呼吸理学療法（石川朗・中山書店）
  ・小児: 小児理学療法学（津山直一・医学書院）
  ・老年: 老年理学療法学（鈴木隆雄・医歯薬出版）
注意事項・禁忌（CONTRAINDICATIONS）→ リスク管理・疾患専門書を3冊以上
臨床ポイント（CLINICAL）→ その疾患に最も関連する専門書を3冊以上

同じ区切り記号（===DEFINITION=== 等）を使用してください。

===DEFINITION===
===SYMPTOMS===
===ASSESSMENT===
===PROGNOSIS===
===TREATMENT===
===CONTRAINDICATIONS===
===CLINICAL===`;

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
