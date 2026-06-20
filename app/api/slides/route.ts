import { NextRequest, NextResponse } from "next/server";
import {
  createClient, getApiKey,
  withRetry, isBalanceError,
  translateError, notifyAdmin,
} from "@/lib/api-error";

export const maxDuration = 60;

// ── Types ─────────────────────────────────────────────────────────────────

export type SlideType = "case" | "research" | "study" | "discharge";

export type TemplateType = "title" | "case-intro" | "evaluation" | "timeline" | "summary";

// Template content shapes
export interface TitleContent {
  mainTitle:     string;
  subtitle:      string;
  presenter:     string;
  date:          string;
  targetPatient: string;
}
export interface CaseIntroContent {
  sectionTitle: string;
  tableRows:    { label: string; value: string }[];
}
export interface EvaluationContent {
  sectionTitle:    string;
  evaluationTable: { item: string; before: string; after: string }[];
  notes:           string[];
}
export interface TimelineContent {
  sectionTitle: string;
  events:       { period: string; content: string; outcome?: string }[];
}
export interface SummaryContent {
  sectionTitle:   string;
  considerations: string[];
  conclusionBox:  string;
}

export type SlideContentMap = {
  title:       TitleContent;
  "case-intro": CaseIntroContent;
  evaluation:  EvaluationContent;
  timeline:    TimelineContent;
  summary:     SummaryContent;
};

export interface GeneratedSlide<T extends TemplateType = TemplateType> {
  id:               number;
  templateType:     T;
  content:          SlideContentMap[T];
  manuscript:       string;
  estimatedSeconds: number;
}

export interface GeneratedSlideData {
  title:         string;
  presenter:     string;
  slideType:     SlideType;
  totalDuration: number;
  slides:        GeneratedSlide[];
}

// ── Input forms ───────────────────────────────────────────────────────────

interface CaseForm      { disease: string; patient: string; evaluation: string; treatment: string; outcome: string; presenter: string; }
interface ResearchForm  { title: string; background: string; purpose: string; method: string; result: string; discussion: string; presenter: string; }
interface StudyForm     { theme: string; disease: string; keyPoints: string; references: string; presenter: string; }
interface DischargeForm { patientBg: string; reason: string; rehab: string; condition: string; notes: string; presenter: string; }

type AnyForm = CaseForm | ResearchForm | StudyForm | DischargeForm;

// ── Slide count from duration ─────────────────────────────────────────────

function calcSlideCount(duration: number): number {
  if (duration <= 5)  return 5;
  if (duration <= 10) return 10;
  if (duration <= 15) return 15;
  return Math.min(Math.round(duration * 1.2), 25);
}

// ── Prompt builder ────────────────────────────────────────────────────────

function buildPrompt(type: SlideType, form: AnyForm, targetSlides: number, durationMin: number): string {
  const wordsPerMin   = 300;
  const totalChars    = durationMin * wordsPerMin;
  const charPerSlide  = Math.round(totalChars / targetSlides);

  const templateGuide = `
テンプレートタイプと必要なcontentフィールド：

1. "title" → { mainTitle, subtitle, presenter, date, targetPatient }
2. "case-intro" → { sectionTitle, tableRows: [{label, value}] } ← 5〜8行の表
3. "evaluation" → { sectionTitle, evaluationTable: [{item, before, after}], notes: [string] }
4. "timeline" → { sectionTitle, events: [{period, content, outcome?}] } ← 3〜6イベント
5. "summary" → { sectionTitle, considerations: [string], conclusionBox: string }

スライド枚数配分の目安（合計 ${targetSlides} 枚）：
- タイトル: 1枚
- 症例紹介/背景: 1〜2枚（case-intro）
- 評価結果/データ: 1〜3枚（evaluation）
- 治療経過/方法: 1〜3枚（timeline）
- 考察・まとめ: 1〜2枚（summary）
- 残りは内容に応じて適切に配分する`;

  const jsonSchema = `
出力JSON形式（コードブロックなし・純粋なJSONのみ）：
{
  "title": "発表タイトル",
  "presenter": "発表者名",
  "slideType": "${type}",
  "totalDuration": ${durationMin},
  "slides": [
    {
      "id": 1,
      "templateType": "title",
      "content": { "mainTitle": "...", "subtitle": "...", "presenter": "...", "date": "...", "targetPatient": "..." },
      "manuscript": "（約${charPerSlide}文字の読み上げ原稿）",
      "estimatedSeconds": ${Math.round(charPerSlide / 5)}
    }
  ]
}`;

  const base = `あなたは理学療法士向けの発表スライド原稿を作成するプロフェッショナルです。
全テキストは日本語で記述してください。
合計スライド数は必ず${targetSlides}枚にしてください。
各スライドの原稿（manuscript）は約${charPerSlide}文字を目安にしてください。
全スライドの原稿合計文字数が${totalChars}文字（発表${durationMin}分・1分あたり${wordsPerMin}文字）になるよう調整してください。

${templateGuide}
${jsonSchema}

`;

  if (type === "case") {
    const f = form as CaseForm;
    return `${base}
以下の症例情報をもとに症例発表スライドを作成してください。
- 疾患名: ${f.disease}
- 患者背景: ${f.patient}
- 理学療法評価: ${f.evaluation}
- 治療内容: ${f.treatment}
- 結果・考察: ${f.outcome}
- 発表者: ${f.presenter || "発表者名未入力"}`;
  }

  if (type === "research") {
    const f = form as ResearchForm;
    return `${base}
以下の研究情報をもとに研究発表スライドを作成してください。
- タイトル: ${f.title}
- 背景: ${f.background}
- 目的: ${f.purpose}
- 方法: ${f.method}
- 結果: ${f.result}
- 考察: ${f.discussion}
- 発表者: ${f.presenter || "発表者名未入力"}`;
  }

  if (type === "study") {
    const f = form as StudyForm;
    return `${base}
以下の情報をもとに勉強会用スライドを作成してください。
- テーマ: ${f.theme}
- 対象疾患: ${f.disease}
- 主要ポイント: ${f.keyPoints}
- 参考文献: ${f.references}
- 発表者: ${f.presenter || "発表者名未入力"}`;
  }

  const f = form as DischargeForm;
  return `${base}
以下の情報をもとに退院サマリー発表スライドを作成してください。
- 患者背景: ${f.patientBg}
- 入院経緯: ${f.reason}
- リハビリ内容: ${f.rehab}
- 退院時状態: ${f.condition}
- 注意事項: ${f.notes}
- 発表者: ${f.presenter || "発表者名未入力"}`;
}

// ── Handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { type?: SlideType; form?: AnyForm; duration?: number };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "リクエストの解析に失敗しました" }, { status: 400 });
  }

  const { type, form, duration = 10 } = body;
  if (!type || !form) {
    return NextResponse.json({ error: "type と form は必須です" }, { status: 400 });
  }

  if (!getApiKey()) {
    return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 503 });
  }

  const targetSlides = calcSlideCount(duration);

  try {
    const client  = createClient();
    const prompt  = buildPrompt(type, form, targetSlides, duration);

    const msg = await withRetry(() =>
      client.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 6000,
        messages:   [{ role: "user", content: prompt }],
      })
    );

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const cleaned = raw
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();

    const parsed = JSON.parse(cleaned) as GeneratedSlideData;
    return NextResponse.json(parsed);

  } catch (err) {
    if (isBalanceError(err)) void notifyAdmin(err);
    console.error("[slides] Error:", translateError(err));
    return NextResponse.json({ error: translateError(err) }, { status: 503 });
  }
}
