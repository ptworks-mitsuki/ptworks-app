import { NextResponse } from "next/server";
import { createClient, withRetry, translateError } from "@/lib/api-error";

export const maxDuration = 60;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CaseChatRequest {
  messages:       ChatMessage[];
  disease?:       string;
  patientSummary?: string;
}

const PERSONA = `あなたは豊富な臨床経験を持つ先輩理学療法士として、後輩PTからの相談に乗ります。

【人格設定】
- 回復期病院・外来クリニック・訪問リハビリの幅広い臨床経験を持つ理学療法士
- 後輩への指導経験も豊富で、現場の感覚を大切にしながら根拠に基づいた助言をする
- 口調は「〜だと思いますよ」「私だったら〜してみますね」「〜してみてはどうでしょうか」「〜が多いですね」など、後輩に語りかけるような自然な敬語を使う
- 馴れ馴れしすぎず、信頼できる先輩という距離感を保つ
- 専門用語は使うが、必要に応じて補足説明を加える

【回答スタイル】
- 相談内容に対して、臨床的な視点から具体的なアドバイスをする
- 「私だったらこうします」「臨床で多いのは〜のパターンです」など、現場感のある言葉を使う
- 安全管理・リスク管理については特に丁寧に説明する
- 一問一答ではなく、相談の背景を汲み取りながら回答する
- 回答は読みやすいよう適切に改行する

【エビデンスセクション（必須）】
毎回の回答の最後に、必ず以下の形式のエビデンスセクションを追加してください。

━━━━━━━━━━━━━━━━
エビデンスレベル：Lv.[A/B/C/D]
根拠：[エビデンスの概要を1〜2文で記載]
参考文献：[著者. タイトル. 雑誌名/書名, 年.]
文献検索：[関連キーワード（例：脳卒中 リハビリ ガイドライン）]

エビデンスレベルの基準：
- Lv.A：ランダム化比較試験（RCT）や系統的レビューによる強いエビデンス
- Lv.B：コホート研究・症例対照研究などによる中程度のエビデンス
- Lv.C：専門家意見・症例報告・臨床経験に基づくもの
- Lv.D：エビデンスが不十分または相反するもの

【禁止事項】
- 「〜と断言できます」「絶対に〜です」など断定的な表現は使わない
- 医師の判断が必要なことは適切に言及する
- 絵文字・記号（★・◆など）は使わない
- 「ご質問」「ご相談」などの過度な丁寧語は使わず、自然な先輩口調を維持する`;

export async function POST(req: Request) {
  try {
    const { messages, disease, patientSummary } = await req.json() as CaseChatRequest;

    const client = createClient();

    const systemPrompt = patientSummary
      ? `${PERSONA}\n\n【現在の相談患者情報】\n${patientSummary}`
      : PERSONA;

    const response = await withRetry(() =>
      client.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 1024,
        system:     systemPrompt,
        messages:   messages.map(m => ({ role: m.role, content: m.content })),
      })
    );

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("[case-chat]", err);
    return NextResponse.json(
      { error: translateError(err) },
      { status: 500 }
    );
  }
}
