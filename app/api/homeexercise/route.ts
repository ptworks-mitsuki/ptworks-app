import { NextRequest, NextResponse } from "next/server";
import { createClient, getApiKey } from "@/lib/api-error";

function translateError(err: unknown): string {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (m.includes("429") || m.includes("overload")) return "現在アクセスが集中しています。しばらくお待ちください。";
  if (m.includes("timeout")) return "通信に時間がかかっています。";
  return "エラーが発生しました。もう一度お試しください。";
}

export const maxDuration = 120;

export interface ExerciseItem {
  id:           string;
  name:         string;
  purpose:      string;
  steps:        string[];
  reps:         string;
  frequency:    string;
  points:       string;
  stopCriteria: string;
  evidence:     string;
}

export interface HomeExerciseResult {
  items:      ExerciseItem[];
  cautions:   string[];
  references: string[];
  raw:        string;
}

function parseExerciseText(text: string): HomeExerciseResult {
  const blocks = text.split(/\n(?=運動名[：:])/).filter(b => b.trim());

  const items: ExerciseItem[] = blocks.map((block, idx) => {
    const get = (key: string) => {
      const re = new RegExp(`${key}[：:]\\s*(.+?)(?=\\n(?:目的|やり方|回数|頻度|ポイント|やめるべき時|根拠)[：:]|$)`, "s");
      return block.match(re)?.[1]?.trim() ?? "";
    };

    const stepsMatch = block.match(/やり方[：:]\s*([\s\S]+?)(?=\n(?:回数|頻度|ポイント|やめるべき時|根拠)[：:]|$)/);
    const stepsRaw = stepsMatch?.[1]?.trim() ?? "";
    const steps = stepsRaw
      .split(/\n/)
      .map(s => s.replace(/^\d+[.．)）]\s*/, "").trim())
      .filter(Boolean);

    return {
      id:           `ex-${Date.now()}-${idx}`,
      name:         get("運動名"),
      purpose:      get("目的"),
      steps,
      reps:         get("回数"),
      frequency:    get("頻度"),
      points:       get("ポイント"),
      stopCriteria: get("やめるべき時"),
      evidence:     get("根拠"),
    };
  }).filter(item => item.name);

  const refMatch = text.match(/参照した文献[・参考書]*[：:]([\s\S]+?)(?:\n\n|$)/);
  const references = refMatch
    ? refMatch[1].split(/\n/).map(r => r.replace(/^[・\-]\s*/, "").trim()).filter(Boolean)
    : [];

  const cautionMatch = text.match(/注意事項[：:]([\s\S]+?)(?=\n\n運動名|参照した|$)/);
  const cautions = cautionMatch
    ? cautionMatch[1].split(/\n/).map(c => c.replace(/^[・\-]\s*/, "").trim()).filter(Boolean)
    : ["痛みが強い時は無理をしない", "めまいがしたらすぐに止める", "不安な時は担当PTに相談する"];

  return { items, cautions, references, raw: text };
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKey();
  if (!apiKey) return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });

  const {
    disease,
    treatmentContent,
    references: treatmentRefs,
    level,
    patientName,
    ptName,
    notes,
  } = await req.json() as {
    disease:          string;
    treatmentContent: string;
    references:       string[];
    level:            string;
    patientName?:     string;
    ptName?:          string;
    notes?:           string;
  };

  const refList = treatmentRefs.length > 0
    ? treatmentRefs.map((r, i) => `${i + 1}. ${r}`).join("\n")
    : "（文献情報なし）";

  const prompt = `以下の治療内容をもとに患者さんが自宅で行う自主トレーニング指導書を作成してください。

疾患名：${disease}
治療内容：${treatmentContent}
運動レベル：${level}
AI治療考察で参照した文献・参考書：
${refList}
${notes ? `特記事項：${notes}` : ""}

【重要】
全ての運動メニューは必ず以下に基づいて作成してください：
・AI治療考察で使用した文献・参考書を最優先で参照する
・該当する文献・参考書がない場合は理学療法ガイドライン・標準理学療法学シリーズ・各疾患の最新エビデンスに基づいて作成する
・根拠のないメニューは絶対に含めない
・3〜5種類の運動メニューを作成する

各運動メニューを以下の形式で厳密に作成してください（この形式を崩さないこと）：

運動名：（わかりやすい名前）
目的：（なぜこの運動をするか・1行）
やり方：
1. （ステップ1）
2. （ステップ2）
3. （ステップ3）
回数：○回 × ○セット
頻度：1日○回
ポイント：（患者への注意点）
やめるべき時：（痛みなどの基準）
根拠：（参照した文献・参考書名）

全メニュー出力後に以下を追加：

注意事項：
・（注意事項1）
・（注意事項2）
・（注意事項3）

参照した文献・参考書：
・（文献名1）
・（文献名2）

専門用語は使わず患者さんが理解できる言葉で書いてください。指示文・説明文・前置きは出力しないでください。最初の運動名から直接始めてください。`;

  const client = createClient();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      try {
        let fullText = "";
        const response = await client.messages.create({
          model:      "claude-sonnet-4-6",
          max_tokens: 3000,
          stream:     true,
          messages:   [{ role: "user", content: prompt }],
        });

        for await (const ev of response) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            fullText += ev.delta.text;
            send({ type: "chunk", text: ev.delta.text });
          }
        }

        const result = parseExerciseText(fullText);
        send({ type: "done", result });
      } catch (err) {
        send({ type: "error", message: translateError(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      Connection:      "keep-alive",
    },
  });
}
