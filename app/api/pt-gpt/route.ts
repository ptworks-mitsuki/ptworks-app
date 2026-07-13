import { NextRequest } from "next/server";
import { createClient, getApiKey, isBalanceError, translateError, notifyAdmin } from "@/lib/api-error";

export const maxDuration = 120;

// ── Intent detection ──────────────────────────────────────────────────────

export type GptIntent =
  | "disease"   // 疾患・術式・医療知識
  | "consult"   // 臨床の具体的な相談
  | "service"   // 専用サービス誘導
  | "career";   // キャリア・副業

interface ServiceSuggestion {
  name: string;
  url:  string;
  desc: string;
}

function detectIntent(query: string): GptIntent {
  const q = query;

  // 専用サービス（優先チェック）
  if (/スライド|発表資料|プレゼン/.test(q))   return "service";
  if (/算定日数|加算|診療報酬|点数|減算/.test(q)) return "service";
  if (/自主トレ|指導書|ホームエクサ/.test(q))  return "service";
  if (/文献|論文|エビデンス|参考書/.test(q))   return "service";

  // キャリア・副業
  if (/副業|開業|独立|キャリア|収入|働き方|稼ぐ/.test(q)) return "career";

  // 臨床相談
  if (/この患者|どうすれ|迷って|相談|困って|教えて|先輩|アドバイス/.test(q)) return "consult";
  if (/どう対応|なぜ|どのよう|何をすべき|どうしたら/.test(q)) return "consult";

  // 疾患・医療知識（デフォルト）
  return "disease";
}

function getServiceSuggestion(query: string): ServiceSuggestion {
  if (/スライド|発表資料|プレゼン/.test(query))
    return { name: "スライド自動生成", url: "/stage1/slides", desc: "発表スライドを自動で作成できます" };
  if (/算定日数|加算|診療報酬|点数|減算/.test(query))
    return { name: "診療報酬・算定ガイド", url: "/learn/reimbursement", desc: "算定ルールをすぐに確認できます" };
  if (/自主トレ|指導書|ホームエクサ/.test(query))
    return { name: "自主トレ指導書作成", url: "/stage1/homeexercise", desc: "患者向け指導書を自動生成できます" };
  if (/文献|論文|エビデンス|参考書/.test(query))
    return { name: "文献検索", url: "/stage1/literature", desc: "論文・参考書を横断検索できます" };
  return { name: "何でも相談する", url: "/stage1", desc: "詳しく相談できます" };
}

// ── System prompts ────────────────────────────────────────────────────────

const SUGGEST_RULES = `

回答の最後に必ず以下の形式で関連機能を1〜3個提案する（質問に関連するもののみ）：

---
💡 PT Worksの関連機能
[関連機能名]:::URL
（例：AI治療考察で個別プランを作成:::/stage1/treatment?q=QUERY）

機能とURL対応（QUERYは質問内容に置き換える）：
・AI治療考察でこの患者の個別プランを作成:::/stage1/treatment?q=QUERY
・自主トレ指導書を作成する:::/stage1/homeexercise
・文献検索で根拠を確認する:::/stage1/literature?q=QUERY
・スライド自動生成で発表資料を作成:::/stage1/slides
・診療報酬・算定ガイドで算定日数を確認:::/learn/reimbursement

質問タイプと推奨機能：
疾患・症状・解剖 → AI治療考察、文献検索、自主トレ指導書
治療・リハビリ → AI治療考察、自主トレ指導書、文献検索
学会発表・スライド → スライド自動生成、文献検索
算定・診療報酬 → 診療報酬・算定ガイド
自主トレ・患者指導 → 自主トレ指導書、AI治療考察
文献・根拠 → 文献検索

関係ない機能は絶対に提案しない。`;

const BASE_SYSTEM = `PT専用AIアシスタント。理学療法士・医療従事者の質問に答える。
医療・臨床の質問は教科書・ガイドライン基準で回答。臨床相談は経験豊富な先輩PT目線で回答。
MMT・NRS・ROM・FIM等の評価指標・算定ルール・禁忌を考慮する。
前置き・あいさつ・指示文は出力しない。マークダウン形式で記述する。

表現ルール：
・断定を避け「〜とされています」「〜の可能性があります」「〜が推奨されます」「〜が一般的です」を使う
・禁忌・安全上の絶対的注意のみ断定してよい
・治療法・評価法について説明する際はエビデンスレベル（A・B・C・Dなど）の記号は使用しないでください。代わりに「〜という考え方が広く支持されています」「〜という報告があります」「〜が推奨されることが多いです」「専門家の間では〜という意見もあります」のような自然な文章表現で情報の性質を伝えてください。
・回答の本文末尾に必ず「最終的な臨床判断は担当PTであるあなたが行ってください。」を付ける
・回答の末尾に必ず「## 関連情報（AI選定）」セクションを追加し、このテーマに関連する文献・教科書・ガイドラインを3冊以上リスト形式で明記すること${SUGGEST_RULES}`;

const APPROACH_RULES = `
複数のアプローチを提示する場合は以下の形式で記述する：

【ガイドライン推奨】
・現在の学会ガイドラインで推奨されているアプローチ
・根拠：○○ガイドライン（年）

【最新エビデンスに基づく】
・最新の研究・RCTで支持されているアプローチ
・根拠：○○（年）の研究・ガイドラインに基づく

2つのアプローチに明確な違いがない場合は無理に分けず1つにまとめる。`;

const DISEASE_SYSTEM = `${BASE_SYSTEM}${APPROACH_RULES}

疾患・医療知識は以下の構成で回答：
## 定義・概要 ## 主な症状（3点以内） ## 評価・検査（3点以内） ## 予後予測・ゴール設定（3点以内） ## 治療方針・リハビリアプローチ（上記のアプローチ形式を使用） ## 注意事項・禁忌（3点以内） ## 臨床ポイント（3点以内） ## 関連情報（AI選定）（教科書・ガイドライン3冊以上）`;

const CONSULT_SYSTEM = `${BASE_SYSTEM}${APPROACH_RULES}

臨床相談は先輩PTとして後輩に語りかける自然な敬語で回答。Markdown形式で2〜4セクションに整理。
治療・アプローチが関係する相談では上記のアプローチ形式（ガイドライン推奨／最新エビデンス）で2つの考え方を提示する。
最後に必ずエビデンスセクションを追加してから関連機能を提案する：
━━━━━━━━━━━━━━━━
根拠：[根拠の概要1〜2文（エビデンスレベル記号は使わず自然な文章で）]
参考文献：[著者. タイトル. 雑誌名/書名, 年.]
文献検索：[関連キーワード]`;

const CAREER_SYSTEM = `${BASE_SYSTEM}

PTの副業・キャリアアップについて実践的なアドバイスをMarkdown形式で回答。PT Works副業支援パック・開業パックへ自然につなげる。`;

function getSystemPrompt(intent: GptIntent): string {
  switch (intent) {
    case "disease": return DISEASE_SYSTEM;
    case "consult": return CONSULT_SYSTEM;
    case "career":  return CAREER_SYSTEM;
    default:        return BASE_SYSTEM;
  }
}

// ── SSE event types ────────────────────────────────────────────────────────

export type PtGptEvent =
  | { type: "intent";   intent: GptIntent; service?: ServiceSuggestion }
  | { type: "chunk";    text: string }
  | { type: "done" }
  | { type: "error";    error: string };

// ── Transient error check ─────────────────────────────────────────────────

function isTransient(e: unknown): boolean {
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return m.includes("429") || m.includes("529") || m.includes("overloaded") ||
    m.includes("rate_limit") || m.includes("timeout") || m.includes("fetch failed");
}

// ── Route handler ─────────────────────────────────────────────────────────

export interface PtGptRequest {
  query:    string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function POST(req: NextRequest) {
  const body  = await req.json() as { query?: unknown; history?: unknown };
  const query = typeof body.query === "string" ? body.query.trim() : "";

  if (!query) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: "質問を入力してください" })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } },
    );
  }
  if (!getApiKey()) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: "現在メンテナンス中です。しばらくお待ちください。" })}\n\n`,
      { status: 503, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const intent  = detectIntent(query);
  const history = Array.isArray(body.history)
    ? (body.history as Array<{ role: string; content: string }>)
        .filter(m => m.role === "user" || m.role === "assistant")
        .slice(-10)                         // 直近10ターン
        .map(m => ({ role: m.role as "user" | "assistant", content: String(m.content) }))
    : [];

  const encoder = new TextEncoder();
  const client  = createClient();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PtGptEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      // まず intent を通知
      if (intent === "service") {
        const service = getServiceSuggestion(query);
        send({ type: "intent", intent, service });
        send({ type: "done" });
        controller.close();
        return;
      }

      send({ type: "intent", intent });

      async function run(): Promise<void> {
        const messages: Array<{ role: "user" | "assistant"; content: string }> = [
          ...history,
          { role: "user", content: query },
        ];

        const anthropicStream = client.messages.stream({
          model:      "claude-sonnet-4-6",
          max_tokens: intent === "disease" ? 2500 : 1500,
          system: [{ type: "text", text: getSystemPrompt(intent), cache_control: { type: "ephemeral" } }],
          messages,
        });

        for await (const event of anthropicStream) {
          if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
          const text = event.delta.text;
          if (text) send({ type: "chunk", text });
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
