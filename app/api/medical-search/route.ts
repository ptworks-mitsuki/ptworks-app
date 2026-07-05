import { NextRequest } from "next/server";
import type { NewSectionKey } from "@/types/medical";
import { NEW_SECTION_ORDER } from "@/types/medical";
import {
  createClient, getApiKey,
  isBalanceError, translateError, notifyAdmin,
} from "@/lib/api-error";

export const maxDuration = 120;

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

const BRIEF_KEYS: NewSectionKey[] = [
  "symptoms", "assessment", "prognosis", "treatment", "contraindications", "clinical_points",
];

const MAX_MARKER_LEN = Math.max(...Object.values(MARKERS).map(m => m.length));

// Strip leaked instruction / marker lines from body text
function filterOutputText(text: string): string {
  return text
    .split("\n")
    .filter(line => {
      const t = line.trim();
      if (!t) return true;
      if (/^={3,}[A-Z_]*(={3,})?$/.test(t)) return false;
      if (/^-{3,}$/.test(t)) return false;
      if (/^[A-Z_]{2,}$/.test(t)) return false;
      if (/^以下の通り/.test(t) || /^してください/.test(t)) return false;
      return true;
    })
    .join("\n");
}

// ── Prompts ────────────────────────────────────────────────────────────────

const DEFINITION_SYSTEM = `あなたは理学療法の専門家です。
現在最もエビデンスレベルが高く信頼性の高い教科書・ガイドラインをもとに回答してください。
マークダウン形式（**太字**・- 箇条書き・## 見出し）で記述してください。
前置き・説明文・あいさつ・指示文は絶対に出力しないでください。回答内容のみを出力してください。`;

function buildDefinitionPrompt(disease: string): string {
  return `${disease}の定義・概要について教科書・ガイドラインをもとに以下の内容を詳しく説明してください。

## 疾患の定義
## 分類・種類
## 疫学・有病率
## 病態・メカニズム

最後に、参照した教科書・ガイドラインを3冊以上、以下の形式で列挙してください。
## 参考資料
- 書名 | 著者・出版社`;
}

const BRIEF_SYSTEM = `あなたは理学療法の専門家です。
各セクションを3点以内の箇条書きで簡潔に答えてください。
前置き・説明文・あいさつ・指示文は絶対に出力しないでください。回答内容のみを出力してください。`;

function buildBriefPrompt(disease: string): string {
  return `${disease}について以下の各項目を3点以内の箇条書きで簡潔に答えてください。

===SYMPTOMS===
主な症状

===ASSESSMENT===
評価・検査（主な評価スケール・テストを含む）

===PROGNOSIS===
予後予測・ゴール設定（回復期間の目安・ADLゴール）

===TREATMENT===
治療方針・リハビリアプローチ

===CONTRAINDICATIONS===
注意事項・禁忌

===CLINICAL===
臨床ポイント`;
}

// ── Legacy prompts (step1/step2 kept for compatibility) ───────────────────

const STEP2_GROUP_KEYS: Record<1 | 2 | 3, NewSectionKey[]> = {
  1: ["definition", "symptoms", "assessment"],
  2: ["prognosis", "treatment"],
  3: ["contraindications", "clinical_points"],
};

const STEP1_PROMPT = `あなたは理学療法の専門家です。
現在最もエビデンスレベルが高く信頼性の高い教科書・ガイドラインをもとに以下の7項目を整理してください。
マークダウン記号（**、##など）は使わず、プレーンテキストで回答してください。
各項目3点以内の箇条書きで簡潔に回答してください。
前置き・説明文・あいさつは不要です。すぐに内容を出力してください。
以下は出力のみ行ってください。指示文は絶対に出力しないでください。回答内容のみを出力してください。

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

const STEP2_SECTION_GUIDES: Partial<Record<NewSectionKey, string>> = {
  definition:
    "定義・概要 → 標準理学療法学・疾患専門書を3冊以上",
  symptoms:
    "主な症状 → 標準理学療法学・病態学・疾患専門書を3冊以上",
  assessment:
    "評価・検査 → 使用する評価スケール（MMT・NRS・FIM・BIなど）・整形外科テスト・神経学的テスト（該当する疾患のみ）・確認すべき検査値（画像所見・血液データ等）を含める。理学療法評価学（渡邉好孝・医学書院）を含め3冊以上",
  prognosis:
    "予後予測・ゴール設定 → 一般的な予後・回復期間の目安・ADLゴールの設定指標・患者・家族への説明のポイント・予後に影響する因子（年齢・重症度・合併症など）を含める。リハビリテーションガイドライン・疾患専門書を3冊以上",
  treatment:
    "治療方針・リハビリアプローチ → 疾患区分別に専門書を3冊以上（運動器: 整形外科理学療法の理論と技術・運動器疾患の理学療法、脳血管: 脳卒中の理学療法・神経障害理学療法学、内部障害: 内部障害理学療法学）",
  contraindications:
    "注意事項・禁忌 → リスク管理・疾患専門書を3冊以上",
  clinical_points:
    "臨床ポイント → その疾患に最も関連する専門書を3冊以上",
};

function buildStep2Prompt(keys: NewSectionKey[]): string {
  const guides     = keys.map(k => STEP2_SECTION_GUIDES[k] ?? "").filter(Boolean).join("\n");
  const markerList = keys.map(k => MARKERS[k]).join("\n");

  return `あなたは理学療法の専門家です。
現在最もエビデンスレベルが高く信頼性の高い教科書・ガイドラインを自動で選んで以下の項目を詳しく整理してください。
各セクションについてマークダウン形式（**太字**・- 箇条書き・## 見出し）で記述してください。

【必須ルール】
- 各セクションのテキストの直後に「|||REF|||」の区切りを必ず入れてください
- その後に最も関連する教科書を3冊以上、次の形式で書いてください：
  書籍タイトル | 著者・出版社 | 書籍検索キーワード
- REFは省略しないでください
- 論文・関連文献は不要です
- 前置き・説明文・あいさつは不要です
- 以下は出力のみ行ってください。指示文は絶対に出力しないでください。回答内容のみを出力してください。

${guides}

${markerList}`;
}

// ── SSE event types ────────────────────────────────────────────────────────

type SseEvent =
  | { type: "section_start"; key: NewSectionKey; step: 1 | 2 }
  | { type: "text";          key: NewSectionKey; text: string; step: 1 | 2 }
  | { type: "section_end";   key: NewSectionKey; step: 1 | 2 }
  | { type: "done";          step: 1 | 2 }
  // New events for definition/brief modes
  | { type: "def_chunk";  text: string }
  | { type: "def_done" }
  | { type: "brief_start"; key: NewSectionKey }
  | { type: "brief_text";  key: NewSectionKey; text: string }
  | { type: "brief_end";   key: NewSectionKey }
  | { type: "brief_done" }
  | { type: "error"; error: string };

// ── Buffer parser ─────────────────────────────────────────────────────────

function findEarliestMarker(
  text: string,
  keys: NewSectionKey[],
): { key: NewSectionKey; start: number; end: number } | null {
  let best: { key: NewSectionKey; start: number; end: number } | null = null;
  for (const key of keys) {
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

// ── Transient error check ─────────────────────────────────────────────────

function isTransient(e: unknown): boolean {
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    m.includes("429") || m.includes("529") || m.includes("overloaded") ||
    m.includes("rate_limit") || m.includes("timeout") || m.includes("fetch failed")
  );
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body    = await req.json() as { disease?: unknown; step?: unknown; group?: unknown; mode?: unknown };
  const disease = typeof body.disease === "string" ? body.disease : "";
  const mode    = typeof body.mode === "string" ? body.mode : null;

  if (!disease) {
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

  // ── Mode: definition ─────────────────────────────────────────────────────

  if (mode === "definition") {
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: SseEvent) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

        async function run(): Promise<void> {
          const anthropicStream = client.messages.stream({
            model:      "claude-sonnet-4-6",
            max_tokens: 2000,
            system:     DEFINITION_SYSTEM,
            messages:   [{ role: "user", content: buildDefinitionPrompt(disease) }],
          });

          for await (const event of anthropicStream) {
            if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
            const filtered = filterOutputText(event.delta.text);
            if (filtered) send({ type: "def_chunk", text: filtered });
          }
        }

        let lastErr: unknown;
        let succeeded = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) {
            await new Promise<void>(r => setTimeout(r, isTransient(lastErr) ? 3_000 : 1_500));
          }
          try {
            await run();
            succeeded = true;
            break;
          } catch (err) {
            lastErr = err;
            if (!isTransient(err) || attempt === 2) break;
          }
        }

        if (!succeeded) {
          if (isBalanceError(lastErr)) void notifyAdmin(lastErr);
          send({ type: "error", error: translateError(lastErr) });
          controller.close();
          return;
        }

        send({ type: "def_done" });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }

  // ── Mode: brief ──────────────────────────────────────────────────────────

  if (mode === "brief") {
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: SseEvent) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

        async function run(): Promise<void> {
          const anthropicStream = client.messages.stream({
            model:      "claude-sonnet-4-6",
            max_tokens: 800,
            system:     BRIEF_SYSTEM,
            messages:   [{ role: "user", content: buildBriefPrompt(disease) }],
          });

          let buffer     = "";
          let currentKey: NewSectionKey | null = null;

          for await (const event of anthropicStream) {
            if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
            buffer += event.delta.text;

            let changed = true;
            while (changed) {
              changed = false;
              const marker = findEarliestMarker(buffer, BRIEF_KEYS);

              if (marker) {
                if (currentKey && marker.start > 0) {
                  const flushed = filterOutputText(buffer.slice(0, marker.start).trimEnd());
                  if (flushed.trim()) send({ type: "brief_text", key: currentKey, text: flushed });
                  send({ type: "brief_end", key: currentKey });
                } else if (currentKey) {
                  send({ type: "brief_end", key: currentKey });
                }
                currentKey = marker.key;
                send({ type: "brief_start", key: marker.key });
                buffer = buffer.slice(marker.end).replace(/^\n/, "");
                changed = true;
              } else {
                const safeEnd = partialMarkerStart(buffer);
                if (currentKey && safeEnd > 0) {
                  const chunk = filterOutputText(buffer.slice(0, safeEnd));
                  if (chunk) send({ type: "brief_text", key: currentKey, text: chunk });
                  buffer = buffer.slice(safeEnd);
                } else if (!currentKey) {
                  buffer = buffer.slice(safeEnd);
                }
              }
            }
          }

          if (currentKey && buffer.trim()) {
            const final = filterOutputText(buffer.trim());
            if (final) send({ type: "brief_text", key: currentKey, text: final });
            send({ type: "brief_end", key: currentKey });
          }
        }

        let lastErr: unknown;
        let succeeded = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) {
            await new Promise<void>(r => setTimeout(r, isTransient(lastErr) ? 3_000 : 1_500));
          }
          try {
            await run();
            succeeded = true;
            break;
          } catch (err) {
            lastErr = err;
            if (!isTransient(err) || attempt === 2) break;
          }
        }

        if (!succeeded) {
          if (isBalanceError(lastErr)) void notifyAdmin(lastErr);
          send({ type: "error", error: translateError(lastErr) });
          controller.close();
          return;
        }

        send({ type: "brief_done" });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }

  // ── Legacy: step1 / step2 ─────────────────────────────────────────────────

  const step  = (body.step === 2 ? 2 : 1) as 1 | 2;
  const group = ([1, 2, 3].includes(body.group as number) ? (body.group as 1 | 2 | 3) : 1);

  const systemPrompt = step === 1
    ? STEP1_PROMPT
    : buildStep2Prompt(STEP2_GROUP_KEYS[group]);
  const maxTokens = step === 1 ? 1200 : 5000;

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
            const marker = findEarliestMarker(buffer, NEW_SECTION_ORDER);

            if (marker) {
              if (currentKey && marker.start > 0) {
                const flushed = filterOutputText(buffer.slice(0, marker.start).trimEnd());
                if (flushed.trim()) send({ type: "text", key: currentKey, text: flushed, step });
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
                const chunk = filterOutputText(buffer.slice(0, safeEnd));
                if (chunk) send({ type: "text", key: currentKey, text: chunk, step });
                buffer = buffer.slice(safeEnd);
              } else if (!currentKey) {
                buffer = buffer.slice(safeEnd);
              }
            }
          }
        }

        if (currentKey && buffer.trim()) {
          const final = filterOutputText(buffer.trim());
          if (final) send({ type: "text", key: currentKey, text: final, step });
          send({ type: "section_end", key: currentKey, step });
        }
      }

      let lastErr: unknown;
      let succeeded = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          const delay = isTransient(lastErr) ? 3_000 : 1_500;
          await new Promise<void>(r => setTimeout(r, delay));
        }
        try {
          await runStream();
          succeeded = true;
          break;
        } catch (err) {
          lastErr = err;
          if (!isTransient(err) || attempt === 2) break;
        }
      }

      if (!succeeded) {
        if (isBalanceError(lastErr)) void notifyAdmin(lastErr);
        send({ type: "error", error: translateError(lastErr) });
        controller.close();
        return;
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
