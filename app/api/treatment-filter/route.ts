import { NextRequest, NextResponse } from "next/server";
import {
  createClient, getApiKey,
  withRetry, isBalanceError,
  translateError, notifyAdmin,
} from "@/lib/api-error";

export const maxDuration = 60;

// ── Types (must match TreatmentFilter.tsx) ────────────────────────────────

interface RomDirection {
  direction: string;
  degree: string;
}

interface RomJointEntry {
  joint: string;
  otherJointName: string;
  directions: RomDirection[];
}

interface FilterState {
  ageGroups: string[];
  gender: string;
  painTimings: string[];
  painTimingFreeText: string;
  strengthLevel: string;
  strengthMMT: string;
  romLevel: string;
  /** New per-joint structure (current) */
  romJoints?: RomJointEntry[];
  /** Legacy flat-direction structure (backward-compat) */
  romDirections?: RomDirection[];
  otherConditions: string[];
  otherConditionFreeText: string;
  environment: string;
  surgery: string;
  surgeryOther: string;
  postOpDays: string;
  visitFrequency: string;
  phase: string;
  specialNotes?: string;
}

// ── Condition text builder ─────────────────────────────────────────────────
// All field accesses use ?. / ?? so this never throws even with malformed input

function buildConditionText(f: FilterState): string {
  const lines: string[] = [];

  if ((f.ageGroups?.length ?? 0) > 0) lines.push(`年代：${f.ageGroups.join("・")}`);
  if (f.gender) lines.push(`性別：${f.gender}`);

  if ((f.painTimings?.length ?? 0) > 0) lines.push(`痛みが出るタイミング：${f.painTimings.join("・")}`);
  if (f.painTimingFreeText?.trim()) lines.push(`痛みのタイミング（詳細）：${f.painTimingFreeText.trim()}`);

  if (f.strengthLevel && f.strengthLevel !== "なし") {
    const mmt = f.strengthMMT ? `（実測 MMT${f.strengthMMT}）` : "";
    lines.push(`筋力低下：${f.strengthLevel}${mmt}`);
  }

  if (f.romLevel && f.romLevel !== "なし") {
    const joints = f.romJoints ?? [];
    const legacy = f.romDirections ?? [];

    if (joints.length > 0) {
      const jointTexts = joints.map(entry => {
        const name = entry.joint === "その他" && entry.otherJointName
          ? entry.otherJointName
          : entry.joint ?? "不明";
        const dirs = (entry.directions ?? [])
          .map(d => d.degree ? `${d.direction} ${d.degree}°` : d.direction)
          .join("・");
        return dirs ? `${name}（${dirs}）` : name;
      });
      lines.push(`関節可動域制限：${f.romLevel}　対象関節：${jointTexts.join("、")}`);
    } else if (legacy.length > 0) {
      const dirs = legacy
        .map(d => d.degree ? `${d.direction} ${d.degree}°` : d.direction)
        .join("・");
      lines.push(`関節可動域制限：${f.romLevel}（${dirs}）`);
    } else {
      lines.push(`関節可動域制限：${f.romLevel}`);
    }
  }

  if ((f.otherConditions?.length ?? 0) > 0) lines.push(`その他の状態：${f.otherConditions.join("・")}`);
  if (f.otherConditionFreeText?.trim()) lines.push(`その他（詳細）：${f.otherConditionFreeText.trim()}`);

  if (f.environment === "入院") {
    lines.push("受療環境：入院");
    const surg = f.surgery === "その他" ? `その他（${f.surgeryOther ?? ""}）` : (f.surgery ?? "");
    if (surg) lines.push(`術式：${surg}`);
    if (f.postOpDays) lines.push(`術後経過：${f.postOpDays}`);
  } else if (f.environment === "外来") {
    lines.push("受療環境：外来");
    if (f.visitFrequency) lines.push(`通院頻度：${f.visitFrequency}`);
    if (f.phase) lines.push(`症状の経過：${f.phase}`);
  }

  if (f.specialNotes?.trim()) lines.push(`特記事項：${f.specialNotes.trim()}`);

  return lines.join("\n") || "（条件の指定なし）";
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Everything is wrapped in a single top-level try-catch so that no
  //    error (even unexpected ones) can bubble up as an HTML error page.
  try {
    // ① Parse request body
    let body: { disease?: string; filters?: FilterState };
    try {
      body = await req.json() as typeof body;
    } catch {
      return NextResponse.json({ error: "リクエストの解析に失敗しました" }, { status: 400 });
    }

    const { disease, filters } = body;
    if (!disease || !filters) {
      return NextResponse.json({ error: "疾患名と患者条件が必要です" }, { status: 400 });
    }

    // ② API key check
    if (!getApiKey()) {
      return NextResponse.json(
        { error: "現在メンテナンス中です。しばらくお待ちください。" },
        { status: 503 },
      );
    }

    // ③ Build prompts (inside top-level try so any edge-case throw is caught)
    const conditionText = buildConditionText(filters);

    const systemPrompt = [
      "あなたは日本の理学療法士向け医療情報AIです。",
      "患者の具体的な状態・条件に基づき、根拠ある実践的な治療・リハビリアプローチを提案してください。",
      "",
      "回答はJSONのみ。前置き・後置き・コードブロック不要：",
      '{"recommendations":"・具体的な介入1\\n・介入2\\n（計7〜10項目）","references":["著者. 書名/論文名. 出版社/雑誌, 年."]}',
      "",
      "・各項目は「・」で始め、1行以内で具体的かつ実践的に",
      "・患者の条件（術後日数、痛みのタイミング、ROM制限方向・角度など）を必ず反映する",
      "・フリーテキストの詳細情報も考慮した提案にする",
      "・禁忌・注意事項があれば先頭に「注意：」と記載する",
      "・参考文献は日本のガイドライン・教科書・RCTを2〜4件",
    ].join("\n");

    const userPrompt =
      `疾患：${disease}\n\n患者の状態・条件：\n${conditionText}\n\nこの患者に対する具体的な治療・リハビリアプローチを提案してください。`;

    // ④ API call with retry
    const client = createClient();

    const message = await withRetry(() =>
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1400,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    );

    // ⑤ Parse response
    const raw = message.content[0];
    if (raw.type !== "text") {
      return NextResponse.json(
        { error: "現在メンテナンス中です。しばらくお待ちください。" },
        { status: 500 },
      );
    }

    // Extract JSON (handles both raw JSON and markdown code blocks)
    const jsonMatch = raw.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[treatment-filter] No JSON in response:", raw.text.slice(0, 200));
      return NextResponse.json(
        { error: "現在メンテナンス中です。しばらくお待ちください。" },
        { status: 500 },
      );
    }

    let parsed: { recommendations: string; references: string[] };
    try {
      parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
    } catch (parseErr) {
      console.error("[treatment-filter] JSON parse error:", parseErr);
      return NextResponse.json(
        { error: "現在メンテナンス中です。しばらくお待ちください。" },
        { status: 500 },
      );
    }

    if (typeof parsed.recommendations !== "string") {
      return NextResponse.json(
        { error: "現在メンテナンス中です。しばらくお待ちください。" },
        { status: 500 },
      );
    }

    return NextResponse.json(parsed);

  } catch (err) {
    // Top-level safety net — catches everything not handled above
    if (isBalanceError(err)) void notifyAdmin(err);

    const translated = translateError(err);
    console.error("[treatment-filter] Unhandled error:", err instanceof Error ? err.message : err);

    return NextResponse.json({ error: translated }, { status: 503 });
  }
}
