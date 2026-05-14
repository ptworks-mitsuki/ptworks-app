import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const client = new Anthropic();

// ── Types ─────────────────────────────────────────────────────────────────

export type SlideType = "case" | "research" | "study" | "discharge";

interface CaseForm {
  disease:    string;
  patient:    string;  // 患者背景
  evaluation: string;  // 理学療法評価
  treatment:  string;  // 治療内容
  outcome:    string;  // 結果・考察
  presenter:  string;
}

interface ResearchForm {
  title:      string;
  background: string;
  purpose:    string;
  method:     string;
  result:     string;
  discussion: string;
  presenter:  string;
}

interface StudyForm {
  theme:      string;
  disease:    string;
  keyPoints:  string;
  references: string;
  presenter:  string;
}

interface DischargeForm {
  patientBg:  string;
  reason:     string;  // 入院経緯
  rehab:      string;  // リハビリ内容
  condition:  string;  // 退院時状態
  notes:      string;  // 注意事項
  presenter:  string;
}

// ── Prompts ───────────────────────────────────────────────────────────────

function buildPrompt(type: SlideType, form: CaseForm | ResearchForm | StudyForm | DischargeForm): string {
  const baseInstruction = `You are a professional medical presentation creator for Japanese physical therapists.
Generate slide content in JSON format. All text must be in Japanese.
Each slide should be concise with clear bullet points. Maximum 5 bullets per slide.
Return ONLY valid JSON, no markdown code blocks.`;

  if (type === "case") {
    const f = form as CaseForm;
    return `${baseInstruction}

Generate a 症例発表 (case presentation) slide deck.
Input data:
- 疾患名: ${f.disease}
- 患者背景: ${f.patient}
- 理学療法評価: ${f.evaluation}
- 治療内容: ${f.treatment}
- 結果・考察: ${f.outcome}
- 発表者: ${f.presenter}

Output JSON format:
{
  "title": "presentation title",
  "presenter": "${f.presenter}",
  "slideType": "case",
  "slides": [
    { "id": 1, "type": "title", "title": "...", "subtitle": "症例発表", "presenter": "...", "date": "..." },
    { "id": 2, "type": "content", "title": "症例紹介", "bullets": ["...", "..."] },
    { "id": 3, "type": "content", "title": "理学療法評価", "bullets": ["...", "..."] },
    { "id": 4, "type": "content", "title": "治療プログラム", "bullets": ["...", "..."] },
    { "id": 5, "type": "content", "title": "経過・結果", "bullets": ["...", "..."] },
    { "id": 6, "type": "content", "title": "考察", "bullets": ["...", "..."] },
    { "id": 7, "type": "summary", "title": "まとめ", "points": ["...", "..."] }
  ]
}`;
  }

  if (type === "research") {
    const f = form as ResearchForm;
    return `${baseInstruction}

Generate a 研究発表 (research presentation) slide deck.
Input data:
- タイトル: ${f.title}
- 研究背景: ${f.background}
- 目的: ${f.purpose}
- 方法: ${f.method}
- 結果: ${f.result}
- 考察: ${f.discussion}
- 発表者: ${f.presenter}

Output JSON format:
{
  "title": "${f.title}",
  "presenter": "${f.presenter}",
  "slideType": "research",
  "slides": [
    { "id": 1, "type": "title", "title": "...", "subtitle": "研究発表", "presenter": "...", "date": "..." },
    { "id": 2, "type": "content", "title": "背景・目的", "bullets": ["...", "..."] },
    { "id": 3, "type": "content", "title": "研究方法", "bullets": ["...", "..."] },
    { "id": 4, "type": "content", "title": "結果", "bullets": ["...", "..."] },
    { "id": 5, "type": "content", "title": "考察", "bullets": ["...", "..."] },
    { "id": 6, "type": "summary", "title": "結論", "points": ["...", "..."] }
  ]
}`;
  }

  if (type === "study") {
    const f = form as StudyForm;
    return `${baseInstruction}

Generate a 勉強会資料 (study session) slide deck.
Input data:
- テーマ: ${f.theme}
- 対象疾患: ${f.disease}
- 主要ポイント: ${f.keyPoints}
- 参考文献: ${f.references}
- 発表者: ${f.presenter}

Output JSON format:
{
  "title": "${f.theme}",
  "presenter": "${f.presenter}",
  "slideType": "study",
  "slides": [
    { "id": 1, "type": "title", "title": "...", "subtitle": "勉強会", "presenter": "...", "date": "..." },
    { "id": 2, "type": "content", "title": "本日の目的", "bullets": ["...", "..."] },
    { "id": 3, "type": "content", "title": "解剖学的背景", "bullets": ["...", "..."] },
    { "id": 4, "type": "content", "title": "病態と評価", "bullets": ["...", "..."] },
    { "id": 5, "type": "content", "title": "治療アプローチ", "bullets": ["...", "..."] },
    { "id": 6, "type": "content", "title": "エビデンス・参考文献", "bullets": ["...", "..."] },
    { "id": 7, "type": "summary", "title": "まとめ・質疑応答", "points": ["...", "..."] }
  ]
}`;
  }

  // discharge
  const f = form as DischargeForm;
  return `${baseInstruction}

Generate a 退院サマリー発表 (discharge summary presentation) slide deck.
Input data:
- 患者背景: ${f.patientBg}
- 入院経緯: ${f.reason}
- リハビリ内容: ${f.rehab}
- 退院時状態: ${f.condition}
- 注意事項: ${f.notes}
- 発表者: ${f.presenter}

Output JSON format:
{
  "title": "退院サマリー",
  "presenter": "${f.presenter}",
  "slideType": "discharge",
  "slides": [
    { "id": 1, "type": "title", "title": "退院サマリー発表", "subtitle": "退院カンファレンス", "presenter": "...", "date": "..." },
    { "id": 2, "type": "content", "title": "患者情報・背景", "bullets": ["...", "..."] },
    { "id": 3, "type": "content", "title": "入院経緯・経過", "bullets": ["...", "..."] },
    { "id": 4, "type": "content", "title": "リハビリテーション内容", "bullets": ["...", "..."] },
    { "id": 5, "type": "content", "title": "退院時の状態・ADL", "bullets": ["...", "..."] },
    { "id": 6, "type": "summary", "title": "退院後の注意事項・引き継ぎ", "points": ["...", "..."] }
  ]
}`;
}

// ── Handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, form } = body as { type: SlideType; form: CaseForm | ResearchForm | StudyForm | DischargeForm };

    if (!type || !form) {
      return NextResponse.json({ error: "type and form are required" }, { status: 400 });
    }

    const prompt = buildPrompt(type, form);

    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";

    // Strip potential markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Slides API error:", err);
    return NextResponse.json({ error: "スライド生成に失敗しました" }, { status: 500 });
  }
}
