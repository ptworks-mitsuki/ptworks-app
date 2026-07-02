import { NextRequest, NextResponse } from "next/server";
import { Suggestion } from "@/types/medical";
import {
  createClient, getApiKey,
  withRetry, isBalanceError,
  translateError, notifyAdmin,
} from "@/lib/api-error";

export const maxDuration = 15;

export interface ResolveResult {
  direct: boolean;
  disease: string | null;
  candidates: Suggestion[];
}

const PROMPT = `あなたは理学療法士向け疾患検索システムのAIです。
入力が「特定の疾患・障害名（正式名称）」か「症状・部位・曖昧な表現・複合的なキーワード」かを判断してください。

判断基準：
- 疾患名の場合（例：脳梗塞、変形性膝関節症、パーキンソン病、COPD）→ direct: true
- 症状・部位・曖昧表現・複合キーワード（例：膝が痛い、人工股関節の禁忌、脳卒中後の歩行、肩が上がらない）→ direct: false

必ず以下のJSON形式のみで回答してください：
- 疾患名の場合: {"direct":true,"disease":"正式疾患名","candidates":[]}
- 症状等の場合: {"direct":false,"disease":null,"candidates":[{"name":"疾患名","description":"15字以内の説明","annotation":"※ユーザーの質問に関連する具体的な内容（例：人工股関節術後の禁忌肢位）についての回答を含みます"},...]} ※3〜5件・関連度が高い順`;

export async function POST(req: NextRequest) {
  const body = await req.json() as { query?: unknown };
  const query = body.query;

  if (!query || typeof query !== "string" || query.trim().length < 1) {
    return NextResponse.json({ direct: false, disease: null, candidates: [] });
  }

  // No API key → fall back to direct search silently (UX should not break)
  if (!getApiKey()) {
    return NextResponse.json({ direct: true, disease: query.trim(), candidates: [] });
  }

  try {
    const client = createClient();

    const message = await withRetry(() =>
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: PROMPT,
        messages: [{ role: "user", content: `入力：「${query.trim()}」` }],
      })
    );

    const raw = message.content[0];
    if (raw.type !== "text") throw new Error("no text");

    const match = raw.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no json");

    const result = JSON.parse(match[0]) as ResolveResult;
    return NextResponse.json(result);

  } catch (err) {
    if (isBalanceError(err)) void notifyAdmin(err);
    // Suggest falls back gracefully — never shows error to user
    console.error("[suggest] Error:", translateError(err));
    return NextResponse.json({ direct: true, disease: query.trim(), candidates: [] });
  }
}
