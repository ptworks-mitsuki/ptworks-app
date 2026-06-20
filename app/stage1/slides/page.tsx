"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type {
  GeneratedSlideData, GeneratedSlide, TemplateType,
  TitleContent, CaseIntroContent, EvaluationContent,
  TimelineContent, SummaryContent,
} from "@/app/api/slides/route";

// ── テーマ・フォント・サイズ定義 ────────────────────────────────────────

interface Theme {
  key: string; label: string;
  headerBg: string; accentColor: string; lightBg: string; dotColor: string;
}

const THEMES: Theme[] = [
  { key: "orange", label: "オレンジ系", headerBg: "#E85D04", accentColor: "#c44b00", lightBg: "#FFF7ED", dotColor: "#E85D04" },
  { key: "green",  label: "グリーン系", headerBg: "#1B4332", accentColor: "#2D6A4F", lightBg: "#F0FDF4", dotColor: "#1B4332" },
  { key: "mono",   label: "モノトーン", headerBg: "#1F2937", accentColor: "#4B5563", lightBg: "#F9FAFB", dotColor: "#6B7280" },
  { key: "blue",   label: "ブルー系",   headerBg: "#1E40AF", accentColor: "#1D4ED8", lightBg: "#EFF6FF", dotColor: "#3B82F6" },
];

const FONTS = [
  { key: "sans",   label: "標準",   css: "'Hiragino Sans', 'Yu Gothic UI', sans-serif" },
  { key: "mincho", label: "明朝体", css: "'Hiragino Mincho ProN', 'Yu Mincho', serif" },
  { key: "round",  label: "丸ゴシック", css: "'Hiragino Maru Gothic ProN', 'M PLUS Rounded 1c', sans-serif" },
];

const FONT_SIZES = [
  { key: "sm", label: "小", scale: 0.85 },
  { key: "md", label: "中", scale: 1 },
  { key: "lg", label: "大", scale: 1.15 },
];

const SLIDE_TYPES = [
  { id: "case",      label: "症例発表",        desc: "症例の経過・治療・考察をまとめたスライド" },
  { id: "research",  label: "研究発表",        desc: "研究の目的・方法・結果・考察のスライド" },
  { id: "study",     label: "勉強会資料",      desc: "テーマに沿った教育・勉強会用スライド" },
  { id: "discharge", label: "退院サマリー発表", desc: "退院カンファレンス用のサマリースライド" },
];

// ── 発表時間 ─────────────────────────────────────────────────────────────

const DURATION_OPTS = [
  { value: 5,   label: "5分" },
  { value: 10,  label: "10分" },
  { value: 15,  label: "15分" },
  { value: -1,  label: "その他" },
];

function calcSlideCount(duration: number): number {
  if (duration <= 5)  return 5;
  if (duration <= 10) return 10;
  if (duration <= 15) return 15;
  return Math.min(Math.round(duration * 1.2), 25);
}

function secToDisplay(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? (s > 0 ? `${m}分${s}秒` : `${m}分`) : `${s}秒`;
}

// ── スライドテンプレート レンダラー ───────────────────────────────────────

interface TemplateProps {
  slide:  GeneratedSlide;
  index:  number;
  total:  number;
  theme:  Theme;
  font:   string;
  scale:  number;
}

function SlideFooter({ index, total, theme }: { index: number; total: number; theme: Theme }) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-t border-gray-100"
      style={{ background: theme.lightBg }}>
      <span className="text-[9px] font-bold tracking-widest text-gray-400">PT WORKS</span>
      <span className="text-[9px] text-gray-400">{index + 1} / {total}</span>
    </div>
  );
}

function TitleTemplate({ slide, index, total, theme, font, scale }: TemplateProps) {
  const c = slide.content as TitleContent;
  return (
    <div className="aspect-video rounded-xl overflow-hidden shadow-lg border border-gray-200 flex flex-col"
      style={{ fontFamily: font, background: theme.headerBg }}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-10 h-1 rounded-full mb-5" style={{ background: "rgba(255,255,255,0.5)" }} />
        <h2 className="text-white font-black leading-tight mb-3"
          style={{ fontSize: `${1.35 * scale}rem` }}>{c.mainTitle}</h2>
        <p className="font-medium mb-2" style={{ color: "rgba(255,255,255,0.75)", fontSize: `${0.8 * scale}rem` }}>{c.subtitle}</p>
        {c.targetPatient && (
          <div className="mt-1 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)", fontSize: `${0.7 * scale}rem` }}>
            {c.targetPatient}
          </div>
        )}
        <div className="mt-5 space-y-1">
          {c.presenter && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: `${0.7 * scale}rem` }}>発表者：{c.presenter}</p>}
          {c.date && <p style={{ color: "rgba(255,255,255,0.45)", fontSize: `${0.65 * scale}rem` }}>{c.date}</p>}
        </div>
      </div>
      <div className="h-1" style={{ background: "rgba(255,255,255,0.3)" }} />
      <div className="flex items-center justify-between px-4 py-1.5" style={{ background: "rgba(0,0,0,0.15)" }}>
        <span className="text-[9px] font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>PT WORKS</span>
        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{index + 1} / {total}</span>
      </div>
    </div>
  );
}

function CaseIntroTemplate({ slide, index, total, theme, font, scale }: TemplateProps) {
  const c = slide.content as CaseIntroContent;
  return (
    <div className="aspect-video rounded-xl overflow-hidden shadow-lg border border-gray-200 flex flex-col bg-white"
      style={{ fontFamily: font }}>
      <div className="h-1.5" style={{ background: theme.headerBg }} />
      <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-2" style={{ background: theme.lightBg }}>
        <div className="w-1 h-5 rounded-full" style={{ background: theme.headerBg }} />
        <h3 className="font-black text-gray-900" style={{ fontSize: `${1 * scale}rem` }}>{c.sectionTitle}</h3>
      </div>
      <div className="flex flex-1 min-h-0">
        {/* 表 */}
        <div className="flex-1 px-5 py-3 overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <tbody>
              {c.tableRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="py-1 px-2 font-semibold text-gray-500 w-1/3 border-b border-gray-100"
                    style={{ fontSize: `${0.65 * scale}rem` }}>{row.label}</td>
                  <td className="py-1 px-2 text-gray-800 border-b border-gray-100"
                    style={{ fontSize: `${0.65 * scale}rem` }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 写真枠 */}
        <div className="w-28 border-l border-gray-100 flex flex-col items-center justify-center shrink-0 m-3">
          <div className="w-full h-full rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1" style={{ background: theme.lightBg }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-gray-300">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 17l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[8px] text-gray-300">写真挿入</span>
          </div>
        </div>
      </div>
      <SlideFooter index={index} total={total} theme={theme} />
    </div>
  );
}

function EvaluationTemplate({ slide, index, total, theme, font, scale }: TemplateProps) {
  const c = slide.content as EvaluationContent;
  return (
    <div className="aspect-video rounded-xl overflow-hidden shadow-lg border border-gray-200 flex flex-col bg-white"
      style={{ fontFamily: font }}>
      <div className="h-1.5" style={{ background: theme.headerBg }} />
      <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-2" style={{ background: theme.lightBg }}>
        <div className="w-1 h-5 rounded-full" style={{ background: theme.headerBg }} />
        <h3 className="font-black text-gray-900" style={{ fontSize: `${1 * scale}rem` }}>{c.sectionTitle}</h3>
      </div>
      <div className="flex-1 px-5 py-3 overflow-hidden">
        <table className="w-full text-xs border-collapse mb-2">
          <thead>
            <tr style={{ background: theme.headerBg }}>
              <th className="py-1 px-2 text-left font-bold text-white" style={{ fontSize: `${0.65 * scale}rem` }}>評価項目</th>
              <th className="py-1 px-2 text-center font-bold text-white" style={{ fontSize: `${0.65 * scale}rem` }}>初期評価</th>
              <th className="py-1 px-2 text-center font-bold text-white" style={{ fontSize: `${0.65 * scale}rem` }}>最終評価</th>
            </tr>
          </thead>
          <tbody>
            {c.evaluationTable.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                <td className="py-1 px-2 font-medium text-gray-700 border-b border-gray-100" style={{ fontSize: `${0.65 * scale}rem` }}>{row.item}</td>
                <td className="py-1 px-2 text-center text-gray-600 border-b border-gray-100" style={{ fontSize: `${0.65 * scale}rem` }}>{row.before}</td>
                <td className="py-1 px-2 text-center font-bold border-b border-gray-100" style={{ fontSize: `${0.65 * scale}rem`, color: theme.accentColor }}>{row.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {c.notes && c.notes.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {c.notes.map((n, i) => (
              <p key={i} className="text-gray-500" style={{ fontSize: `${0.6 * scale}rem` }}>
                <span className="font-bold" style={{ color: theme.dotColor }}>※</span> {n}
              </p>
            ))}
          </div>
        )}
      </div>
      <SlideFooter index={index} total={total} theme={theme} />
    </div>
  );
}

function TimelineTemplate({ slide, index, total, theme, font, scale }: TemplateProps) {
  const c = slide.content as TimelineContent;
  return (
    <div className="aspect-video rounded-xl overflow-hidden shadow-lg border border-gray-200 flex flex-col bg-white"
      style={{ fontFamily: font }}>
      <div className="h-1.5" style={{ background: theme.headerBg }} />
      <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-2" style={{ background: theme.lightBg }}>
        <div className="w-1 h-5 rounded-full" style={{ background: theme.headerBg }} />
        <h3 className="font-black text-gray-900" style={{ fontSize: `${1 * scale}rem` }}>{c.sectionTitle}</h3>
      </div>
      <div className="flex-1 px-6 py-3 overflow-hidden">
        <div className="relative">
          {/* タイムライン縦線 */}
          <div className="absolute left-8 top-2 bottom-2 w-0.5 bg-gray-200" />
          <div className="space-y-2">
            {c.events.map((ev, i) => (
              <div key={i} className="flex items-start gap-3">
                {/* ドット */}
                <div className="shrink-0 w-4 h-4 rounded-full border-2 border-white shadow-sm mt-0.5 relative z-10 ml-6"
                  style={{ background: theme.dotColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                      style={{ background: theme.headerBg, fontSize: `${0.6 * scale}rem` }}>{ev.period}</span>
                    <span className="font-bold text-gray-800" style={{ fontSize: `${0.7 * scale}rem` }}>{ev.content}</span>
                  </div>
                  {ev.outcome && (
                    <p className="text-gray-500 mt-0.5" style={{ fontSize: `${0.6 * scale}rem` }}>{ev.outcome}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SlideFooter index={index} total={total} theme={theme} />
    </div>
  );
}

function SummaryTemplate({ slide, index, total, theme, font, scale }: TemplateProps) {
  const c = slide.content as SummaryContent;
  return (
    <div className="aspect-video rounded-xl overflow-hidden shadow-lg border border-gray-200 flex flex-col bg-white"
      style={{ fontFamily: font }}>
      <div className="h-1.5" style={{ background: theme.headerBg }} />
      <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-2" style={{ background: theme.lightBg }}>
        <div className="w-1 h-5 rounded-full" style={{ background: theme.headerBg }} />
        <h3 className="font-black text-gray-900" style={{ fontSize: `${1 * scale}rem` }}>{c.sectionTitle}</h3>
      </div>
      <div className="flex-1 px-5 py-3 flex gap-4 overflow-hidden">
        {/* 箇条書き */}
        <div className="flex-1 space-y-1.5">
          {c.considerations.map((pt, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5"
                style={{ background: theme.lightBg, border: `1.5px solid ${theme.dotColor}` }}>
                <span className="font-black" style={{ color: theme.dotColor, fontSize: "8px" }}>{i + 1}</span>
              </div>
              <span className="text-gray-800 leading-snug" style={{ fontSize: `${0.7 * scale}rem` }}>{pt}</span>
            </div>
          ))}
        </div>
        {/* まとめ枠 */}
        {c.conclusionBox && (
          <div className="w-36 shrink-0 rounded-xl p-3 flex flex-col justify-center"
            style={{ background: theme.headerBg }}>
            <p className="text-white/60 font-bold mb-1" style={{ fontSize: `${0.55 * scale}rem` }}>まとめ</p>
            <p className="text-white font-medium leading-snug" style={{ fontSize: `${0.6 * scale}rem` }}>{c.conclusionBox}</p>
          </div>
        )}
      </div>
      <SlideFooter index={index} total={total} theme={theme} />
    </div>
  );
}

function SlideRenderer(props: TemplateProps) {
  switch (props.slide.templateType as TemplateType) {
    case "title":      return <TitleTemplate {...props} />;
    case "case-intro": return <CaseIntroTemplate {...props} />;
    case "evaluation": return <EvaluationTemplate {...props} />;
    case "timeline":   return <TimelineTemplate {...props} />;
    case "summary":    return <SummaryTemplate {...props} />;
    default:           return <div className="aspect-video bg-gray-100 rounded-xl" />;
  }
}

// ── Form helpers ──────────────────────────────────────────────────────────

function FLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-600 mb-1">{children}</label>;
}
function FInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder-gray-300" />
  );
}
function FTextarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder-gray-300 resize-none" />
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function SlidesPage() {
  // ── ステップ管理
  const [step, setStep] = useState<"form" | "preview">("form");

  // ── フォーム
  const [slideType,    setSlideType]    = useState("case");
  const [durationOpt,  setDurationOpt]  = useState(10);
  const [customMin,    setCustomMin]    = useState("");

  const [caseForm,  setCaseForm]  = useState({ disease: "", patient: "", evaluation: "", treatment: "", outcome: "", presenter: "" });
  const [resForm,   setResForm]   = useState({ title: "", background: "", purpose: "", method: "", result: "", discussion: "", presenter: "" });
  const [studyForm, setStudyForm] = useState({ theme: "", disease: "", keyPoints: "", references: "", presenter: "" });
  const [disForm,   setDisForm]   = useState({ patientBg: "", reason: "", rehab: "", condition: "", notes: "", presenter: "" });

  // ── 生成結果
  const [slideData,    setSlideData]    = useState<GeneratedSlideData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  // ── 編集パネル
  const [themeKey,  setThemeKey]  = useState("orange");
  const [fontKey,   setFontKey]   = useState("sans");
  const [sizeKey,   setSizeKey]   = useState("md");

  // ── チャット編集
  const [chatInput,    setChatInput]    = useState("");
  const [chatLoading,  setChatLoading]  = useState(false);
  const [chatStatus,   setChatStatus]   = useState<string | null>(null);  // "変更しました" など
  const [chatUnsupported, setChatUnsupported] = useState<string | null>(null);
  const [slideHistory, setSlideHistory] = useState<GeneratedSlide[][]>([]); // undo用
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const theme    = THEMES.find(t => t.key === themeKey)!;
  const fontCss  = FONTS.find(f => f.key === fontKey)!.css;
  const scale    = FONT_SIZES.find(s => s.key === sizeKey)!.scale;

  const effectiveDuration = durationOpt === -1
    ? Math.max(1, parseInt(customMin) || 10)
    : durationOpt;

  const expectedSlides = calcSlideCount(effectiveDuration);

  // ── 生成
  async function generate() {
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
        body:    JSON.stringify({ type: slideType, form, duration: effectiveDuration }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as GeneratedSlideData;
      setSlideData(data);
      setCurrentSlide(0);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  // ── 原稿ダウンロード（.txt）
  function downloadManuscript() {
    if (!slideData) return;
    const lines = slideData.slides.map((s, i) => {
      const secLabel = secToDisplay(s.estimatedSeconds);
      return `【スライド ${i + 1}】（想定読み上げ時間：約${secLabel}）\n${s.manuscript}`;
    });
    const totalSec = slideData.slides.reduce((a, s) => a + s.estimatedSeconds, 0);
    const text = `${slideData.title}\n発表者：${slideData.presenter}\n発表時間：${slideData.totalDuration}分\n\n` +
      `合計原稿（想定読み上げ：${secToDisplay(totalSec)}）\n${"=".repeat(40)}\n\n` +
      lines.join("\n\n" + "-".repeat(30) + "\n\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${slideData.title}_原稿.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── チャット編集送信 ─────────────────────────────────────────────────────

  async function handleChat() {
    const instr = chatInput.trim();
    if (!instr || chatLoading || !slideData) return;

    setChatLoading(true);
    setChatStatus(null);
    setChatUnsupported(null);

    try {
      const res = await fetch("/api/slide-edit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          instruction:       instr,
          currentSlideIndex: currentSlide,
          allSlides:         slideData.slides,
        }),
      });
      const data = await res.json() as {
        type: "design" | "content" | "unsupported" | "error";
        message: string;
        themeKey?: string; fontKey?: string; sizeKey?: string;
        slides?: GeneratedSlide[];
      };

      if (data.type === "design") {
        // undo スタック：デザイン変更は state のみなので不要だが一応記録
        if (data.themeKey) setThemeKey(data.themeKey);
        if (data.fontKey)  setFontKey(data.fontKey);
        if (data.sizeKey)  setSizeKey(data.sizeKey);
        setChatStatus(data.message || "デザインを変更しました");
        setChatInput("");
      }

      if (data.type === "content" && data.slides) {
        // undo のためにスタックに現在のスライドを保存
        setSlideHistory(prev => [...prev.slice(-9), slideData.slides]);
        setSlideData(prev => prev ? { ...prev, slides: data.slides! } : prev);
        setChatStatus(data.message || "変更しました");
        setChatInput("");
      }

      if (data.type === "unsupported" || data.type === "error") {
        setChatUnsupported(data.message);
      }
    } catch {
      setChatUnsupported("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setChatLoading(false);
    }
  }

  // ── 1つ前に戻す ─────────────────────────────────────────────────────────

  function handleUndo() {
    if (slideHistory.length === 0 || !slideData) return;
    const prev = slideHistory[slideHistory.length - 1];
    setSlideHistory(h => h.slice(0, -1));
    setSlideData(d => d ? { ...d, slides: prev } : d);
    setChatStatus("元に戻しました");
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">

      {/* ── ヘッダー ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/stage1" className="text-gray-400 hover:text-gray-600 transition text-lg">←</Link>
        <div>
          <h1 className="text-xl font-black text-gray-900">発表スライド自動生成</h1>
          <p className="text-xs text-gray-500 mt-0.5">症例発表・研究発表・勉強会資料をAIが自動作成</p>
        </div>
      </div>

      {/* ── FORM STEP ── */}
      {step === "form" && (
        <div className="space-y-5">

          {/* ① 発表時間 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-black text-gray-900 mb-3">発表時間</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {DURATION_OPTS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDurationOpt(opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition ${
                    durationOpt === opt.value
                      ? "text-white border-transparent"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                  style={durationOpt === opt.value ? { background: "#E85D04", borderColor: "#E85D04" } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {durationOpt === -1 && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number" min="1" max="60"
                  value={customMin}
                  onChange={e => setCustomMin(e.target.value)}
                  placeholder="例：7"
                  className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
                <span className="text-sm text-gray-500">分</span>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">
              目安スライド枚数：<span className="font-bold text-gray-700">{expectedSlides} 枚</span>
            </p>
          </div>

          {/* ② スライド種類 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-black text-gray-900 mb-3">スライドの種類</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SLIDE_TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSlideType(t.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition ${
                    slideType === t.id
                      ? "border-[#E85D04] bg-orange-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{t.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                  </div>
                  {slideType === t.id && (
                    <span className="shrink-0 font-bold text-[#E85D04]">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ③ 内容入力 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <p className="text-sm font-black text-gray-900">内容を入力（詳しいほど精度が上がります）</p>

            {slideType === "case" && (<>
              <div><FLabel>疾患名</FLabel><FInput value={caseForm.disease} onChange={v => setCaseForm(p => ({...p, disease: v}))} placeholder="例：変形性膝関節症" /></div>
              <div><FLabel>患者背景</FLabel><FTextarea value={caseForm.patient} onChange={v => setCaseForm(p => ({...p, patient: v}))} placeholder="例：70歳女性、BMI 28、入院リハビリ中..." /></div>
              <div><FLabel>理学療法評価</FLabel><FTextarea value={caseForm.evaluation} onChange={v => setCaseForm(p => ({...p, evaluation: v}))} placeholder="例：MMT 右下肢 3/5、ROM 膝屈曲 90°..." /></div>
              <div><FLabel>治療内容</FLabel><FTextarea value={caseForm.treatment} onChange={v => setCaseForm(p => ({...p, treatment: v}))} placeholder="例：大腿四頭筋強化訓練、歩行訓練..." /></div>
              <div><FLabel>結果・考察</FLabel><FTextarea value={caseForm.outcome} onChange={v => setCaseForm(p => ({...p, outcome: v}))} placeholder="例：3週間で歩行距離 200m→500mに改善..." /></div>
              <div><FLabel>発表者名</FLabel><FInput value={caseForm.presenter} onChange={v => setCaseForm(p => ({...p, presenter: v}))} placeholder="例：山田 太郎 PT" /></div>
            </>)}

            {slideType === "research" && (<>
              <div><FLabel>発表タイトル</FLabel><FInput value={resForm.title} onChange={v => setResForm(p => ({...p, title: v}))} placeholder="例：変形性膝関節症患者への運動療法の効果検証" /></div>
              <div><FLabel>研究背景</FLabel><FTextarea value={resForm.background} onChange={v => setResForm(p => ({...p, background: v}))} placeholder="例：変形性膝関節症は超高齢社会において..." /></div>
              <div><FLabel>研究目的</FLabel><FTextarea value={resForm.purpose} onChange={v => setResForm(p => ({...p, purpose: v}))} rows={2} placeholder="例：本研究の目的は..." /></div>
              <div><FLabel>研究方法</FLabel><FTextarea value={resForm.method} onChange={v => setResForm(p => ({...p, method: v}))} placeholder="例：対象は〇〇名、期間は〇週間..." /></div>
              <div><FLabel>結果</FLabel><FTextarea value={resForm.result} onChange={v => setResForm(p => ({...p, result: v}))} placeholder="例：介入群でVASスコアが有意に改善..." /></div>
              <div><FLabel>考察</FLabel><FTextarea value={resForm.discussion} onChange={v => setResForm(p => ({...p, discussion: v}))} placeholder="例：本研究の結果から..." /></div>
              <div><FLabel>発表者名</FLabel><FInput value={resForm.presenter} onChange={v => setResForm(p => ({...p, presenter: v}))} placeholder="例：山田 太郎 PT" /></div>
            </>)}

            {slideType === "study" && (<>
              <div><FLabel>勉強会テーマ</FLabel><FInput value={studyForm.theme} onChange={v => setStudyForm(p => ({...p, theme: v}))} placeholder="例：肩関節周囲炎の理学療法" /></div>
              <div><FLabel>対象疾患</FLabel><FInput value={studyForm.disease} onChange={v => setStudyForm(p => ({...p, disease: v}))} placeholder="例：肩関節周囲炎（五十肩）" /></div>
              <div><FLabel>主要ポイント・内容</FLabel><FTextarea value={studyForm.keyPoints} onChange={v => setStudyForm(p => ({...p, keyPoints: v}))} placeholder="例：解剖学的特徴、病期分類、評価方法、治療介入..." /></div>
              <div><FLabel>参考文献</FLabel><FTextarea value={studyForm.references} onChange={v => setStudyForm(p => ({...p, references: v}))} rows={2} placeholder="例：○○ガイドライン2023..." /></div>
              <div><FLabel>発表者名</FLabel><FInput value={studyForm.presenter} onChange={v => setStudyForm(p => ({...p, presenter: v}))} placeholder="例：山田 太郎 PT" /></div>
            </>)}

            {slideType === "discharge" && (<>
              <div><FLabel>患者背景</FLabel><FTextarea value={disForm.patientBg} onChange={v => setDisForm(p => ({...p, patientBg: v}))} rows={2} placeholder="例：80歳男性、要介護2、脳梗塞後遺症..." /></div>
              <div><FLabel>入院経緯</FLabel><FTextarea value={disForm.reason} onChange={v => setDisForm(p => ({...p, reason: v}))} rows={2} placeholder="例：自宅内転倒にて右大腿骨頸部骨折..." /></div>
              <div><FLabel>リハビリ内容</FLabel><FTextarea value={disForm.rehab} onChange={v => setDisForm(p => ({...p, rehab: v}))} placeholder="例：術後3日目よりPT介入開始..." /></div>
              <div><FLabel>退院時の状態・ADL</FLabel><FTextarea value={disForm.condition} onChange={v => setDisForm(p => ({...p, condition: v}))} rows={2} placeholder="例：T字杖使用にて屋内歩行自立..." /></div>
              <div><FLabel>退院後の注意事項</FLabel><FTextarea value={disForm.notes} onChange={v => setDisForm(p => ({...p, notes: v}))} rows={2} placeholder="例：外来リハ継続、転倒予防の家族指導済み..." /></div>
              <div><FLabel>発表者名</FLabel><FInput value={disForm.presenter} onChange={v => setDisForm(p => ({...p, presenter: v}))} placeholder="例：山田 太郎 PT" /></div>
            </>)}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
          )}

          <button
            onClick={generate}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-white text-base transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            style={{ background: "#E85D04" }}
          >
            {loading ? (
              <><span className="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />AIがスライドと原稿を生成中…（少々お待ちください）</>
            ) : (
              `スライドを生成する → （${expectedSlides}枚・${effectiveDuration}分）`
            )}
          </button>
        </div>
      )}

      {/* ── PREVIEW STEP ── */}
      {step === "preview" && slideData && (
        <div className="space-y-4">

          {/* ── 上部：編集パネル ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">デザイン編集</p>
            <div className="flex flex-wrap gap-6">
              {/* 配色 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-1.5">配色テーマ</p>
                <div className="flex gap-2">
                  {THEMES.map(t => (
                    <button key={t.key} type="button" onClick={() => setThemeKey(t.key)}
                      className={`flex flex-col items-center gap-1 transition`}>
                      <div className={`w-7 h-7 rounded-full border-2 ${themeKey === t.key ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
                        style={{ background: t.headerBg, borderColor: t.accentColor }} />
                      <span className={`text-[9px] font-medium ${themeKey === t.key ? "text-gray-900" : "text-gray-400"}`}>
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {/* フォント */}
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-1.5">フォント</p>
                <div className="flex gap-1.5">
                  {FONTS.map(f => (
                    <button key={f.key} type="button" onClick={() => setFontKey(f.key)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                        fontKey === f.key ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                      style={fontKey === f.key ? { background: "#1B4332" } : {}}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* 文字サイズ */}
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-1.5">文字サイズ</p>
                <div className="flex gap-1.5">
                  {FONT_SIZES.map(s => (
                    <button key={s.key} type="button" onClick={() => setSizeKey(s.key)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                        sizeKey === s.key ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                      style={sizeKey === s.key ? { background: "#1B4332" } : {}}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── チャット型編集パネル ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">チャットで編集</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  現在表示中：<span className="font-bold text-gray-700">スライド {currentSlide + 1}</span> を基準に指示が反映されます
                </p>
              </div>
              {slideHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleUndo}
                  className="text-xs font-bold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
                >
                  1つ前に戻す
                </button>
              )}
            </div>

            <div className="relative">
              <textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={e => { setChatInput(e.target.value); setChatStatus(null); setChatUnsupported(null); }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleChat();
                  }
                }}
                rows={2}
                placeholder={`例：「2枚目をもっとシンプルにして」「全体的に文字を大きくして」`}
                className="w-full px-4 pt-3 pb-10 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none placeholder-gray-300 leading-relaxed transition"
                style={{
                  // フォーカス時オレンジ枠
                  boxShadow: chatInput ? "0 0 0 2px #E85D04" : undefined,
                  borderColor: chatInput ? "#E85D04" : undefined,
                }}
                onFocus={e => { e.currentTarget.style.boxShadow = "0 0 0 2px #E85D04"; e.currentTarget.style.borderColor = "#E85D04"; }}
                onBlur={e  => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = ""; }}
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <p className="text-[10px] text-gray-300">Enter で送信</p>
                <button
                  type="button"
                  onClick={handleChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-4 py-1.5 text-xs font-bold text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition hover:opacity-90"
                  style={{ background: "#E85D04" }}
                >
                  {chatLoading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      調整中
                    </span>
                  ) : "送信"}
                </button>
              </div>
            </div>

            {/* ステータス表示 */}
            {chatStatus && (
              <div className="mt-2 flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg"
                style={{ background: "#F0FDF4", color: "#15803d" }}>
                <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0">
                  <circle cx="8" cy="8" r="7" stroke="#16a34a" strokeWidth="1.5"/>
                  <path d="M5 8.5l2.5 2.5 3.5-5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {chatStatus}
              </div>
            )}
            {chatUnsupported && (
              <div className="mt-2 text-xs px-3 py-2 rounded-lg border"
                style={{ background: "#FFF7ED", color: "#9A3412", borderColor: "#FDBA74" }}>
                {chatUnsupported}
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                `スライド${currentSlide + 1}をシンプルにして`,
                "全体的に文字を大きくして",
                "もっと落ち着いた色合いにして",
                "箇条書きを減らして",
              ].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setChatInput(s); chatInputRef.current?.focus(); }}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-500 hover:border-[#E85D04] hover:text-[#E85D04] transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* ── ヘッダー行 ── */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-gray-900 text-base">{slideData.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{slideData.slides.length}枚 / {slideData.totalDuration}分</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setStep("form")}
                className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                ← 内容を修正
              </button>
              <button onClick={generate} disabled={loading}
                className="px-3 py-1.5 text-xs text-white rounded-lg transition hover:opacity-90 disabled:opacity-60"
                style={{ background: "#E85D04" }}>
                {loading ? "再生成中…" : "再生成"}
              </button>
            </div>
          </div>

          {/* ── メインコンテンツ：左スライド / 右原稿 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* 左：スライドプレビュー */}
            <div className="lg:col-span-3 space-y-3">
              <SlideRenderer
                slide={slideData.slides[currentSlide]}
                index={currentSlide}
                total={slideData.slides.length}
                theme={theme}
                font={fontCss}
                scale={scale}
              />

              {/* ナビゲーション */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentSlide(p => Math.max(0, p - 1))}
                  disabled={currentSlide === 0}
                  className="px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-30 transition">
                  ← 前へ
                </button>
                <div className="flex items-center gap-1">
                  {slideData.slides.map((_, i) => (
                    <button key={i} onClick={() => setCurrentSlide(i)}
                      className="w-2 h-2 rounded-full transition"
                      style={{
                        background: i === currentSlide ? theme.headerBg : "#D1D5DB",
                        transform: i === currentSlide ? "scale(1.3)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setCurrentSlide(p => Math.min(slideData.slides.length - 1, p + 1))}
                  disabled={currentSlide === slideData.slides.length - 1}
                  className="px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-30 transition">
                  次へ →
                </button>
              </div>

              {/* サムネイル一覧 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2">全スライド一覧</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slideData.slides.map((s, i) => (
                    <button key={i} onClick={() => setCurrentSlide(i)}
                      className="relative rounded-lg overflow-hidden transition"
                      style={{ outline: i === currentSlide ? `2px solid ${theme.headerBg}` : "2px solid transparent" }}>
                      <div style={{ transform: "scale(0.38)", transformOrigin: "top left", width: "263%", height: "263%", pointerEvents: "none" }}>
                        <SlideRenderer slide={s} index={i} total={slideData.slides.length} theme={theme} font={fontCss} scale={scale} />
                      </div>
                      <div className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-white px-1 rounded"
                        style={{ background: "rgba(0,0,0,0.45)" }}>{i + 1}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 右：原稿パネル */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-4">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
                  style={{ background: theme.lightBg }}>
                  <p className="text-sm font-black text-gray-900">
                    スライド {currentSlide + 1} の原稿
                  </p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: theme.headerBg }}>
                    約{secToDisplay(slideData.slides[currentSlide].estimatedSeconds)}
                  </span>
                </div>
                <div className="px-4 py-4 max-h-80 overflow-y-auto">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {slideData.slides[currentSlide].manuscript}
                  </p>
                </div>
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                  <p className="text-[10px] text-gray-400">
                    合計想定時間：
                    <span className="font-bold text-gray-600">
                      {secToDisplay(slideData.slides.reduce((a, s) => a + s.estimatedSeconds, 0))}
                    </span>
                    （目標：{slideData.totalDuration}分）
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── ダウンロードボタン ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-black text-gray-900 mb-3">ダウンロード</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm transition hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: "#E85D04" }}>
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                スライドをダウンロード（PDF）
              </button>
              <button
                onClick={downloadManuscript}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition hover:opacity-90 flex items-center justify-center gap-2 border-2"
                style={{ borderColor: "#1B4332", color: "#1B4332" }}>
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                原稿をダウンロード（テキスト）
              </button>
              <div className="flex-1 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 flex items-center justify-center gap-2 cursor-not-allowed">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                .pptx形式
                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">近日公開</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              PDF保存：ブラウザの印刷ダイアログで「PDFに保存」を選択してください
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
