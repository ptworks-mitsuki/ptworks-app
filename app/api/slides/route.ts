import { NextRequest, NextResponse } from "next/server";
import {
  createClient, getApiKey,
  withRetry, isBalanceError,
  translateError, notifyAdmin,
} from "@/lib/api-error";

export const maxDuration = 60;

// ── Types ─────────────────────────────────────────────────────────────────

export type SlideType     = "case" | "research" | "study" | "discharge";
export type TemplateType  = "title" | "case-intro" | "evaluation" | "timeline" | "summary";

export interface TitleContent      { mainTitle: string; subtitle: string; presenter: string; date: string; targetPatient: string; }
export interface CaseIntroContent  { sectionTitle: string; tableRows: { label: string; value: string }[]; }
export interface EvaluationContent { sectionTitle: string; evaluationTable: { item: string; before: string; after: string }[]; notes: string[]; }
export interface TimelineContent   { sectionTitle: string; events: { period: string; content: string; outcome?: string }[]; }
export interface SummaryContent    { sectionTitle: string; considerations: string[]; conclusionBox: string; }

export type SlideContentMap = {
  title:        TitleContent;
  "case-intro": CaseIntroContent;
  evaluation:   EvaluationContent;
  timeline:     TimelineContent;
  summary:      SummaryContent;
};

export interface GeneratedSlide<T extends TemplateType = TemplateType> {
  id:               number;
  templateType:     T;
  content:          SlideContentMap[T];
  manuscript:       string;
  estimatedSeconds: number;
}

export interface SlideOutline {
  id:           number;
  templateType: TemplateType;
  heading:      string;
}

export interface OutlineResult {
  title:         string;
  presenter:     string;
  slideType:     SlideType;
  totalDuration: number;
  outlines:      SlideOutline[];
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

export function calcSlideCount(duration: number): number {
  if (duration <= 5)  return 5;
  if (duration <= 10) return 10;
  if (duration <= 15) return 15;
  return Math.min(Math.round(duration * 1.2), 25);
}

// ── Form → context string ─────────────────────────────────────────────────

function formToContext(type: SlideType, form: AnyForm): string {
  if (type === "case") {
    const f = form as CaseForm;
    return [
      f.disease    && `疾患名: ${f.disease}`,
      f.patient    && `患者背景: ${f.patient}`,
      f.evaluation && `理学療法評価: ${f.evaluation}`,
      f.treatment  && `治療内容: ${f.treatment}`,
      f.outcome    && `結果・考察: ${f.outcome}`,
      f.presenter  && `発表者: ${f.presenter}`,
    ].filter(Boolean).join("\n");
  }
  if (type === "research") {
    const f = form as ResearchForm;
    return [
      f.title      && `タイトル: ${f.title}`,
      f.background && `背景: ${f.background}`,
      f.purpose    && `目的: ${f.purpose}`,
      f.method     && `方法: ${f.method}`,
      f.result     && `結果: ${f.result}`,
      f.discussion && `考察: ${f.discussion}`,
      f.presenter  && `発表者: ${f.presenter}`,
    ].filter(Boolean).join("\n");
  }
  if (type === "study") {
    const f = form as StudyForm;
    return [
      f.theme      && `テーマ: ${f.theme}`,
      f.disease    && `対象疾患: ${f.disease}`,
      f.keyPoints  && `主要ポイント: ${f.keyPoints}`,
      f.references && `参考文献: ${f.references}`,
      f.presenter  && `発表者: ${f.presenter}`,
    ].filter(Boolean).join("\n");
  }
  const f = form as DischargeForm;
  return [
    f.patientBg && `患者背景: ${f.patientBg}`,
    f.reason    && `入院経緯: ${f.reason}`,
    f.rehab     && `リハビリ内容: ${f.rehab}`,
    f.condition && `退院時状態: ${f.condition}`,
    f.notes     && `注意事項: ${f.notes}`,
    f.presenter && `発表者: ${f.presenter}`,
  ].filter(Boolean).join("\n");
}

// ── STEP 1: アウトライン（構成）生成 ─────────────────────────────────────

function buildOutlinePrompt(type: SlideType, form: AnyForm, targetSlides: number): string {
  const ctx = formToContext(type, form);
  return `あなたは理学療法士向けの発表スライド構成を設計するプロです。
以下の情報をもとに、${targetSlides}枚分のスライド構成をJSONで返してください。
説明文不要・JSONのみ出力してください。

【発表情報】
${ctx}

【使えるテンプレートタイプ】
- "title"      : タイトルスライド（必ず1枚目）
- "case-intro" : 症例紹介・背景（表形式）
- "evaluation" : 評価結果・データ（比較表）
- "timeline"   : 治療経過・方法（タイムライン）
- "summary"    : 考察・まとめ（箇条書き）

【出力JSON形式】
{
  "title": "発表タイトル（日本語）",
  "presenter": "発表者名",
  "outlines": [
    { "id": 1, "templateType": "title",      "heading": "発表タイトル" },
    { "id": 2, "templateType": "case-intro", "heading": "症例紹介" },
    ...合計${targetSlides}枚...
  ]
}`;
}

// ── STEP 2: 1枚のスライドを詳細展開 ──────────────────────────────────────

const TEMPLATE_SCHEMA: Record<TemplateType, string> = {
  title:        `{ "mainTitle": "...", "subtitle": "...", "presenter": "...", "date": "...", "targetPatient": "..." }`,
  "case-intro": `{ "sectionTitle": "...", "tableRows": [{ "label": "年齢・性別", "value": "..." }, ...5〜8行] }`,
  evaluation:   `{ "sectionTitle": "...", "evaluationTable": [{ "item": "...", "before": "...", "after": "..." }, ...], "notes": ["..."] }`,
  timeline:     `{ "sectionTitle": "...", "events": [{ "period": "...", "content": "...", "outcome": "..." }, ...3〜6件] }`,
  summary:      `{ "sectionTitle": "...", "considerations": ["...", "..."], "conclusionBox": "2〜3行のまとめ文" }`,
};

function buildExpandPrompt(
  type: SlideType,
  form: AnyForm,
  outline: SlideOutline,
  index: number,
  totalSlides: number,
  charPerSlide: number,
): string {
  const ctx    = formToContext(type, form);
  const schema = TEMPLATE_SCHEMA[outline.templateType];

  return `あなたは理学療法士向けの発表スライドを作成するプロです。
以下のスライド1枚分のコンテンツと原稿をJSONで返してください。
説明文不要・JSONのみ出力してください。

【発表情報】
${ctx}

【このスライドの情報】
- 番号: ${index + 1} / ${totalSlides}
- テンプレート: ${outline.templateType}
- 見出し: ${outline.heading}

【contentのJSON形式（templateType: "${outline.templateType}"）】
${schema}

【出力JSON形式】
{
  "id": ${outline.id},
  "templateType": "${outline.templateType}",
  "content": ${schema},
  "manuscript": "約${charPerSlide}文字の読み上げ原稿（このスライドの説明として自然な日本語）",
  "estimatedSeconds": ${Math.round(charPerSlide / 5)}
}`;
}

// ── Handler ───────────────────────────────────────────────────────────────

interface OutlineBody {
  action:   "outline";
  type:     SlideType;
  form:     AnyForm;
  duration: number;
}

interface ExpandBody {
  action:       "expand";
  type:         SlideType;
  form:         AnyForm;
  outline:      SlideOutline;
  index:        number;
  totalSlides:  number;
  charPerSlide: number;
}

type RequestBody = OutlineBody | ExpandBody;

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: "リクエストの解析に失敗しました" }, { status: 400 });
  }

  if (!body.type || !body.form) {
    return NextResponse.json({ error: "type と form は必須です" }, { status: 400 });
  }

  if (!getApiKey()) {
    return NextResponse.json({ error: "現在メンテナンス中です。しばらくお待ちください。" }, { status: 503 });
  }

  try {
    const client = createClient();

    // ── STEP 1: 構成生成 ──────────────────────────────────────────────────
    if (body.action === "outline") {
      const { type, form, duration } = body;
      const targetSlides = calcSlideCount(duration);
      const prompt = buildOutlinePrompt(type, form, targetSlides);

      const msg = await withRetry(() =>
        client.messages.create({
          model:      "claude-haiku-4-5-20251001",
          max_tokens: 1200,
          messages:   [{ role: "user", content: prompt }],
        })
      );

      const raw     = msg.content[0].type === "text" ? msg.content[0].text : "";
      const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      const parsed  = JSON.parse(cleaned) as { title: string; presenter: string; outlines: SlideOutline[] };

      const result: OutlineResult = {
        title:         parsed.title,
        presenter:     parsed.presenter,
        slideType:     type,
        totalDuration: duration,
        outlines:      parsed.outlines,
      };
      return NextResponse.json(result);
    }

    // ── STEP 2: 1枚展開 ─────────────────────────────────────────────────
    if (body.action === "expand") {
      const { type, form, outline, index, totalSlides, charPerSlide } = body;
      const prompt = buildExpandPrompt(type, form, outline, index, totalSlides, charPerSlide);

      const msg = await withRetry(() =>
        client.messages.create({
          model:      "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          messages:   [{ role: "user", content: prompt }],
        })
      );

      const raw     = msg.content[0].type === "text" ? msg.content[0].text : "";
      const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      const slide   = JSON.parse(cleaned) as GeneratedSlide;
      return NextResponse.json(slide);
    }

    return NextResponse.json({ error: "不明なアクションです" }, { status: 400 });

  } catch (err) {
    if (isBalanceError(err)) void notifyAdmin(err);
    const msg = translateError(err);
    console.error("[slides]", msg);

    const isTimeout = (err instanceof Error && err.message.toLowerCase().includes("timeout")) ||
                      String(err).toLowerCase().includes("timeout");
    if (isTimeout) {
      return NextResponse.json(
        { error: "生成に時間がかかっています。もう一度お試しください。" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
