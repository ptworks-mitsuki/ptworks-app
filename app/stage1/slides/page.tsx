"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { SlideType } from "@/app/api/slides/route";

// ── Types ─────────────────────────────────────────────────────────────────

type Step = "type" | "form" | "preview" | "download";

interface TitleSlide {
  id: number; type: "title";
  title: string; subtitle: string; presenter: string; date: string;
}
interface ContentSlide {
  id: number; type: "content";
  title: string; bullets: string[];
}
interface SummarySlide {
  id: number; type: "summary";
  title: string; points: string[];
}
type Slide = TitleSlide | ContentSlide | SummarySlide;

interface SlideData {
  title:     string;
  presenter: string;
  slideType: SlideType;
  slides:    Slide[];
}

// ── Slide type config ─────────────────────────────────────────────────────

const SLIDE_TYPES = [
  { id: "case"      as SlideType, icon: "🏥", label: "症例発表",       desc: "症例の経過・治療・考察をまとめたスライド" },
  { id: "research"  as SlideType, icon: "🔬", label: "研究発表",       desc: "研究の目的・方法・結果・考察のスライド" },
  { id: "study"     as SlideType, icon: "📚", label: "勉強会資料",     desc: "テーマに沿った教育・勉強会用スライド" },
  { id: "discharge" as SlideType, icon: "🏃", label: "退院サマリー発表", desc: "退院カンファレンス用のサマリースライド" },
];

// ── Form components ───────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{children}</label>;
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 placeholder-gray-300 dark:placeholder-gray-600"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 placeholder-gray-300 dark:placeholder-gray-600 resize-none"
    />
  );
}

// ── Slide Renderer ────────────────────────────────────────────────────────

function SlideCard({ slide, index, total }: { slide: Slide; index: number; total: number }) {
  const base = "aspect-video rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col";

  if (slide.type === "title") {
    return (
      <div className={`${base}`} style={{ background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)" }}>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-8 h-1 rounded-full mb-4" style={{ background: "#E85D04" }} />
          <h2 className="text-white font-black text-xl sm:text-2xl mb-2 leading-tight">{slide.title}</h2>
          <p className="text-white/70 text-sm mb-4">{slide.subtitle}</p>
          <div className="mt-2 space-y-1">
            {slide.presenter && <p className="text-white/60 text-xs">発表者：{slide.presenter}</p>}
            {slide.date && <p className="text-white/50 text-xs">{slide.date}</p>}
          </div>
        </div>
        <div className="h-1" style={{ background: "#E85D04" }} />
        <div className="px-4 py-2 flex items-center justify-between">
          <p className="text-white/30 text-[10px] font-semibold tracking-widest">PT WORKS</p>
          <p className="text-white/30 text-[10px]">{index + 1} / {total}</p>
        </div>
      </div>
    );
  }

  if (slide.type === "summary") {
    return (
      <div className={`${base}`} style={{ background: "linear-gradient(135deg, #E85D04 0%, #c44b00 100%)" }}>
        <div className="flex-1 flex flex-col px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-white rounded-full" />
            <h3 className="text-white font-black text-lg">{slide.title}</h3>
          </div>
          <ul className="space-y-2 flex-1">
            {slide.points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-white/60 font-bold text-xs mt-0.5 shrink-0">{i + 1}.</span>
                <span className="text-white/90 text-sm leading-snug">{pt}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-4 py-2 bg-black/10 flex items-center justify-between">
          <p className="text-white/40 text-[10px] font-semibold tracking-widest">PT WORKS</p>
          <p className="text-white/40 text-[10px]">{index + 1} / {total}</p>
        </div>
      </div>
    );
  }

  // content slide
  return (
    <div className={`${base} bg-white dark:bg-gray-900`}>
      {/* Header bar */}
      <div className="h-1.5" style={{ background: "linear-gradient(90deg, #E85D04, #c44b00)" }} />
      <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-black text-gray-900 dark:text-white text-base">{slide.title}</h3>
      </div>
      <div className="flex-1 px-6 py-4">
        <ul className="space-y-2">
          {slide.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-2" style={{ background: "#E85D04" }} />
              <span className="leading-snug">{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="px-4 py-1.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <p className="text-gray-300 dark:text-gray-600 text-[10px] font-semibold tracking-widest">PT WORKS</p>
        <p className="text-gray-300 dark:text-gray-600 text-[10px]">{index + 1} / {total}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function SlidesPage() {
  const [step,        setStep]        = useState<Step>("type");
  const [slideType,   setSlideType]   = useState<SlideType | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [slideData,   setSlideData]   = useState<SlideData | null>(null);
  const [currentSlide,setCurrentSlide]= useState(0);
  const printRef = useRef<HTMLDivElement>(null);

  // ── Form states ──────────────────────────────────────────────────────
  const [caseForm, setCaseForm] = useState({ disease: "", patient: "", evaluation: "", treatment: "", outcome: "", presenter: "" });
  const [resForm,  setResForm]  = useState({ title: "", background: "", purpose: "", method: "", result: "", discussion: "", presenter: "" });
  const [studyForm,setStudyForm]= useState({ theme: "", disease: "", keyPoints: "", references: "", presenter: "" });
  const [disForm,  setDisForm]  = useState({ patientBg: "", reason: "", rehab: "", condition: "", notes: "", presenter: "" });

  // ── Generate ─────────────────────────────────────────────────────────
  async function generate() {
    if (!slideType) return;
    setLoading(true);
    setError("");

    const form =
      slideType === "case"      ? caseForm  :
      slideType === "research"  ? resForm   :
      slideType === "study"     ? studyForm :
      disForm;

    try {
      const res = await fetch("/api/slides", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: slideType, form }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSlideData(data);
      setCurrentSlide(0);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  // ── Print handler ─────────────────────────────────────────────────────
  function handlePrint() {
    window.print();
  }

  // ── Step indicator ────────────────────────────────────────────────────
  const STEPS = [
    { key: "type",     label: "形式選択" },
    { key: "form",     label: "内容入力" },
    { key: "preview",  label: "プレビュー" },
  ];

  const stepIdx = STEPS.findIndex(s => s.key === step);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/stage1" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">発表スライド自動生成</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">症例発表・研究発表・勉強会資料をAIが自動作成</p>
        </div>
      </div>

      {/* Step indicator */}
      {step !== "download" && (
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                i <= stepIdx
                  ? "text-white"
                  : "text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800"
              }`} style={i <= stepIdx ? { background: "#E85D04" } : {}}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                  i < stepIdx ? "bg-white/30" : i === stepIdx ? "bg-white/20" : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                }`}>{i + 1}</span>
                {s.label}
              </div>
              {i < STEPS.length - 1 && <span className="text-gray-200 dark:text-gray-700">→</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── Step 1: Type Selection ── */}
      {step === "type" && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">作成したいスライドの種類を選んでください</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {SLIDE_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setSlideType(t.id)}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition hover:border-orange-300 dark:hover:border-orange-700 ${
                  slideType === t.id
                    ? "border-[#E85D04] bg-orange-50 dark:bg-orange-900/20"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                }`}
              >
                <span className="text-2xl shrink-0 mt-0.5">{t.icon}</span>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{t.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</p>
                </div>
                {slideType === t.id && (
                  <span className="ml-auto shrink-0 text-[#E85D04]">✓</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => slideType && setStep("form")}
              disabled={!slideType}
              className="px-6 py-2.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#E85D04" }}
            >
              次へ：内容を入力 →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Form ── */}
      {step === "form" && slideType && (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">{SLIDE_TYPES.find(t => t.id === slideType)?.icon}</span>
            <h2 className="font-bold text-gray-900 dark:text-white">{SLIDE_TYPES.find(t => t.id === slideType)?.label}</h2>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">

            {/* Case form */}
            {slideType === "case" && (<>
              <div><Label>疾患名 *</Label><Input value={caseForm.disease} onChange={v => setCaseForm(p => ({...p, disease: v}))} placeholder="例：変形性膝関節症" /></div>
              <div><Label>患者背景</Label><Textarea value={caseForm.patient} onChange={v => setCaseForm(p => ({...p, patient: v}))} placeholder="例：70歳女性、BMI 28、変形性膝関節症による右膝痛で入院..." /></div>
              <div><Label>理学療法評価</Label><Textarea value={caseForm.evaluation} onChange={v => setCaseForm(p => ({...p, evaluation: v}))} placeholder="例：MMT 右下肢 3/5、ROM 膝屈曲 90°、歩行 T字杖使用..." /></div>
              <div><Label>治療内容</Label><Textarea value={caseForm.treatment} onChange={v => setCaseForm(p => ({...p, treatment: v}))} placeholder="例：大腿四頭筋強化訓練、関節可動域訓練、歩行訓練..." /></div>
              <div><Label>結果・考察</Label><Textarea value={caseForm.outcome} onChange={v => setCaseForm(p => ({...p, outcome: v}))} placeholder="例：3週間で歩行距離が200m → 500mに改善..." /></div>
              <div><Label>発表者名</Label><Input value={caseForm.presenter} onChange={v => setCaseForm(p => ({...p, presenter: v}))} placeholder="例：山田 太郎 PT" /></div>
            </>)}

            {/* Research form */}
            {slideType === "research" && (<>
              <div><Label>発表タイトル *</Label><Input value={resForm.title} onChange={v => setResForm(p => ({...p, title: v}))} placeholder="例：変形性膝関節症患者への運動療法の効果検証" /></div>
              <div><Label>研究背景</Label><Textarea value={resForm.background} onChange={v => setResForm(p => ({...p, background: v}))} placeholder="例：変形性膝関節症は超高齢社会において..." /></div>
              <div><Label>研究目的</Label><Textarea value={resForm.purpose} onChange={v => setResForm(p => ({...p, purpose: v}))} placeholder="例：本研究の目的は..." rows={2} /></div>
              <div><Label>研究方法</Label><Textarea value={resForm.method} onChange={v => setResForm(p => ({...p, method: v}))} placeholder="例：対象は〇〇名、期間は〇週間、評価項目は..." /></div>
              <div><Label>結果</Label><Textarea value={resForm.result} onChange={v => setResForm(p => ({...p, result: v}))} placeholder="例：介入群では疼痛VAS スコアが有意に改善..." /></div>
              <div><Label>考察</Label><Textarea value={resForm.discussion} onChange={v => setResForm(p => ({...p, discussion: v}))} placeholder="例：本研究の結果から..." /></div>
              <div><Label>発表者名</Label><Input value={resForm.presenter} onChange={v => setResForm(p => ({...p, presenter: v}))} placeholder="例：山田 太郎 PT" /></div>
            </>)}

            {/* Study form */}
            {slideType === "study" && (<>
              <div><Label>勉強会テーマ *</Label><Input value={studyForm.theme} onChange={v => setStudyForm(p => ({...p, theme: v}))} placeholder="例：肩関節周囲炎の理学療法" /></div>
              <div><Label>対象疾患</Label><Input value={studyForm.disease} onChange={v => setStudyForm(p => ({...p, disease: v}))} placeholder="例：肩関節周囲炎（五十肩）" /></div>
              <div><Label>主要ポイント・内容</Label><Textarea value={studyForm.keyPoints} onChange={v => setStudyForm(p => ({...p, keyPoints: v}))} placeholder="例：解剖学的特徴、病期分類、評価方法、治療介入..." /></div>
              <div><Label>参考文献</Label><Textarea value={studyForm.references} onChange={v => setStudyForm(p => ({...p, references: v}))} placeholder="例：○○ガイドライン2023、△△教科書 第5版..." rows={2} /></div>
              <div><Label>発表者名</Label><Input value={studyForm.presenter} onChange={v => setStudyForm(p => ({...p, presenter: v}))} placeholder="例：山田 太郎 PT" /></div>
            </>)}

            {/* Discharge form */}
            {slideType === "discharge" && (<>
              <div><Label>患者背景</Label><Textarea value={disForm.patientBg} onChange={v => setDisForm(p => ({...p, patientBg: v}))} placeholder="例：80歳男性、要介護2、脳梗塞後遺症..." rows={2} /></div>
              <div><Label>入院経緯</Label><Textarea value={disForm.reason} onChange={v => setDisForm(p => ({...p, reason: v}))} placeholder="例：自宅内転倒にて右大腿骨頸部骨折..." rows={2} /></div>
              <div><Label>リハビリテーション内容</Label><Textarea value={disForm.rehab} onChange={v => setDisForm(p => ({...p, rehab: v}))} placeholder="例：術後3日目よりPT介入開始、筋力強化・歩行訓練..." /></div>
              <div><Label>退院時の状態・ADL</Label><Textarea value={disForm.condition} onChange={v => setDisForm(p => ({...p, condition: v}))} placeholder="例：T字杖使用にて屋内歩行自立、入浴は一部介助..." rows={2} /></div>
              <div><Label>退院後の注意事項・引き継ぎ</Label><Textarea value={disForm.notes} onChange={v => setDisForm(p => ({...p, notes: v}))} placeholder="例：外来リハ継続、転倒予防の家族指導済み..." rows={2} /></div>
              <div><Label>発表者名</Label><Input value={disForm.presenter} onChange={v => setDisForm(p => ({...p, presenter: v}))} placeholder="例：山田 太郎 PT" /></div>
            </>)}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              ⚠ {error}
            </div>
          )}

          <div className="flex items-center justify-between mt-5">
            <button onClick={() => setStep("type")}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
              ← 種類を変更
            </button>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90 disabled:opacity-60"
              style={{ background: "#E85D04" }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  AIが生成中...
                </>
              ) : (
                <>✨ スライドを生成する</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview ── */}
      {step === "preview" && slideData && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">{slideData.title}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{slideData.slides.length} 枚のスライド</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setStep("form")}
                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                ← 内容を修正
              </button>
              <button
                onClick={generate}
                disabled={loading}
                className="px-3 py-1.5 text-xs text-white rounded-lg transition hover:opacity-90 disabled:opacity-60"
                style={{ background: "#E85D04" }}>
                {loading ? "再生成中..." : "🔄 再生成"}
              </button>
            </div>
          </div>

          {/* Current slide preview */}
          <div className="mb-4" ref={printRef}>
            <SlideCard slide={slideData.slides[currentSlide]} index={currentSlide} total={slideData.slides.length} />
          </div>

          {/* Slide navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentSlide(p => Math.max(0, p - 1))}
              disabled={currentSlide === 0}
              className="px-3 py-1.5 text-sm font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition">
              ← 前へ
            </button>
            <div className="flex items-center gap-1">
              {slideData.slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition ${
                    i === currentSlide ? "scale-125" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                  style={i === currentSlide ? { background: "#E85D04" } : {}}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrentSlide(p => Math.min(slideData.slides.length - 1, p + 1))}
              disabled={currentSlide === slideData.slides.length - 1}
              className="px-3 py-1.5 text-sm font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition">
              次へ →
            </button>
          </div>

          {/* All slides thumbnail grid */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">全スライド一覧</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {slideData.slides.map((slide, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`relative rounded-lg overflow-hidden transition ring-2 ${
                    i === currentSlide ? "ring-[#E85D04]" : "ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600"
                  }`}
                >
                  <div className="scale-[0.4] origin-top-left" style={{ width: "250%", height: "250%" }}>
                    <SlideCard slide={slide} index={i} total={slideData.slides.length} />
                  </div>
                  <div className="absolute inset-0 bg-transparent" />
                  <div className="absolute bottom-1 right-1 text-[9px] font-bold text-white bg-black/40 px-1 rounded">{i + 1}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Download actions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">ダウンロード</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm transition hover:opacity-90"
                style={{ background: "#E85D04" }}
              >
                🖨️ PDFとして保存（印刷）
              </button>
              <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed">
                📊 PPTX形式 <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">近日公開</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
              PDF保存：ブラウザの印刷ダイアログで「PDFに保存」を選択してください
            </p>
          </div>
        </div>
      )}

      {/* ── Print styles (injected via hidden style tag) ── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .slide-print-area, .slide-print-area * { visibility: visible; }
          .slide-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </main>
  );
}
