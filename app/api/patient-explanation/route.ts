import { NextRequest, NextResponse } from "next/server";
import {
  createClient, getApiKey,
  withRetry, isBalanceError,
  translateError, notifyAdmin,
} from "@/lib/api-error";
import type { PatientInfo } from "@/app/api/treatment-evidence/route";

export const maxDuration = 45;

const SYSTEM_PROMPT = `あなたは患者さんにわかりやすく説明することが得意な理学療法士です。
入力された疾患名と患者情報をもとに、患者さん・ご家族向けの説明文を作成してください。

【説明文のルール】
・専門用語は使わない（使う場合は必ずカッコ内でわかりやすく説明）
・「〜です」「〜しましょう」「〜してください」の丁寧な口調
・不安を解消し、前向きになれるような表現を使う
・患者さんの目標・生活背景に合わせた内容にする

【必ず含める項目】
1. 今の状態についての説明（何がどうなっているか、なぜ症状が出ているか）
2. リハビリで行うことの説明（何をするか・なぜするか）
3. ご自宅でできること（自主トレーニング・日常生活での注意点）
4. 回復のイメージ（どんな経過が想定されるか・目標のために何が大切か）

JSON形式で回答：
{
  "title": "わかりやすいタイトル（例：膝の痛みについて）",
  "sections": [
    {
      "heading": "見出し",
      "body": "本文（改行は\\nで）"
    }
  ],
  "encouragement": "最後の一言（励ましのメッセージ）"
}`;

export interface PatientExplanationResult {
  title:         string;
  sections:      { heading: string; body: string }[];
  encouragement: string;
}

export async function POST(req: NextRequest) {
  try {
    let body: { disease?: unknown; patientInfo?: unknown; treatmentSummary?: unknown };
    try { body = await req.json() as typeof body; }
    catch { return NextResponse.json({ error: "リクエストの解析に失敗しました" }, { status: 400 }); }

    const disease    = body.disease;
    const patientInfo = body.patientInfo as PatientInfo | undefined;
    if (!disease || typeof disease !== "string") {
      return NextResponse.json({ error: "疾患名が必要です" }, { status: 400 });
    }
    if (!getApiKey()) {
      return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 503 });
    }

    // Build patient context
    const patientLines: string[] = [`疾患名：${disease}`];
    if (patientInfo) {
      const p = patientInfo;
      if (p.age)         patientLines.push(`年齢：${p.age}歳`);
      if (p.gender)      patientLines.push(`性別：${p.gender}`);
      if (p.diagnosisNote) patientLines.push(`診断詳細：${p.diagnosisNote}`);
      if (p.complaint)   patientLines.push(`主訴：${p.complaint}`);
      if (p.goal)        patientLines.push(`目標・生活背景：${p.goal}`);
      if (p.nrs && p.nrs !== "0") patientLines.push(`疼痛（NRS）：${p.nrs}/10`);
      if (p.mmtLevel && p.mmtLevel !== "なし") patientLines.push(`筋力：${p.mmtLevel}`);
      if (p.fimTotal)    patientLines.push(`FIM合計：${p.fimTotal}点`);
      if (p.biTotal)     patientLines.push(`バーサルインデックス：${p.biTotal}点`);
      if (p.environment) patientLines.push(`受療環境：${p.environment}`);
      if (p.living)      patientLines.push(`生活環境：${p.living}`);
      if (p.comorbidities) patientLines.push(`合併症・既往歴：${p.comorbidities}`);
      if (p.freeText)    patientLines.push(`その他：${p.freeText}`);
    }
    if (body.treatmentSummary && typeof body.treatmentSummary === "string") {
      patientLines.push(`\n治療アプローチ概要：${body.treatmentSummary}`);
    }

    const userMessage = patientLines.join("\n");

    const client = createClient();
    const message = await withRetry(() =>
      client.messages.create({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 2500,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: "user", content: userMessage }],
      }),
    );

    const raw = message.content[0];
    if (raw.type !== "text") {
      return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 500 });
    }

    const jsonMatch = raw.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 500 });
    }

    let parsed: PatientExplanationResult;
    try { parsed = JSON.parse(jsonMatch[0]) as PatientExplanationResult; }
    catch { return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 500 }); }

    return NextResponse.json(parsed);

  } catch (err) {
    if (isBalanceError(err)) void notifyAdmin(err);
    return NextResponse.json({ error: translateError(err) }, { status: 503 });
  }
}
