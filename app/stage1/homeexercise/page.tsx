"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveNewNote } from "@/lib/notes";
import { NoteToast, SaveIconButton } from "@/components/SaveNoteModal";
import type { ExerciseItem, HomeExerciseResult } from "@/app/api/homeexercise/route";

const ORANGE = "#E85D04";
const GREEN  = "#1B4332";

// ─── Types ────────────────────────────────────────────────────────────────

export interface TreatmentContext {
  disease:          string;
  treatmentContent: string;
  references:       string[];
}
export const TREATMENT_CONTEXT_KEY = "ptworks_treatment_for_exercise";

type TabId = "linked" | "standalone" | "instant";

const GOAL_OPTIONS = [
  "筋力強化", "ROM改善", "バランス・転倒予防",
  "歩行改善", "疼痛軽減", "ADL改善", "呼吸機能改善", "その他",
] as const;

// ─── PDF helper ───────────────────────────────────────────────────────────

type DownloadFn = (props: {
  patientName: string; ptName: string; date: string; disease: string;
  items: ExerciseItem[]; cautions: string[]; references: string[]; message: string;
}) => Promise<void>;

let cachedDownload: DownloadFn | null = null;
async function getPdfDownload(): Promise<DownloadFn> {
  if (cachedDownload) return cachedDownload;
  const mod = await import("@/components/HomeExercisePdf");
  cachedDownload = mod.downloadExercisePdf;
  return cachedDownload;
}

// ─── Web Speech API types ─────────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang:          string;
  continuous:    boolean;
  interimResults: boolean;
  start():  void;
  stop():   void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror:  ((e: Event) => void) | null;
  onend:    (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ─── Shared UI components ─────────────────────────────────────────────────

function LevelButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition"
      style={{
        background:  active ? ORANGE : "#fff",
        borderColor: active ? ORANGE : "#E5E7EB",
        color:       active ? "#fff" : "#374151",
      }}>
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition"
      style={{ color: "#1A1A1A" }} />
  );
}

function TextArea({ value, onChange, placeholder, rows = 2, inputRef }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; inputRef?: React.RefObject<HTMLTextAreaElement | null> }) {
  return (
    <textarea ref={inputRef} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition resize-none"
      style={{ color: "#1A1A1A" }} />
  );
}

// ─── VoiceInputButton ─────────────────────────────────────────────────────

type VoiceStatus = "idle" | "listening" | "done" | "error";

function VoiceInputButton({
  onAppend,
}: {
  onAppend: (text: string) => void;
}) {
  const [status, setStatus]   = useState<VoiceStatus>("idle");
  const recognizerRef         = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef          = useRef(false);

  const toggle = useCallback(() => {
    if (listeningRef.current) {
      recognizerRef.current?.stop();
      return;
    }

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
      return;
    }

    const rec        = new SR();
    rec.lang          = "ja-JP";
    rec.continuous    = true;
    rec.interimResults = false;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const finals = Array.from({ length: e.results.length }, (_, i) => e.results[i])
        .filter(r => r.isFinal)
        .map(r => r[0].transcript)
        .join("");
      if (finals) onAppend(finals);
    };

    rec.onerror = () => {
      listeningRef.current = false;
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    };

    rec.onend = () => {
      listeningRef.current = false;
      if (status !== "error") {
        setStatus("done");
        setTimeout(() => setStatus("idle"), 2000);
      }
    };

    rec.start();
    recognizerRef.current  = rec;
    listeningRef.current   = true;
    setStatus("listening");
  }, [onAppend, status]);

  const isListening = status === "listening";

  const label =
    status === "listening" ? "音声を認識中..." :
    status === "done"      ? "認識完了" :
    status === "error"     ? "音声を認識できませんでした。もう一度お試しください。" :
    "音声入力";

  return (
    <button onClick={toggle}
      className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition border-2 w-full justify-center"
      style={{
        background:  isListening ? "#FEF2F2" : "#fff",
        borderColor: isListening ? "#EF4444" : "#E5E7EB",
        color:       isListening ? "#EF4444" : "#374151",
      }}>
      {/* Mic icon */}
      <span className="relative shrink-0">
        {isListening && (
          <span className="absolute inset-0 rounded-full animate-ping"
            style={{ background: "#EF4444", opacity: 0.3 }} />
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className="w-5 h-5 relative z-10"
          style={{ color: isListening ? "#EF4444" : "#374151" }}>
          <rect x="9" y="1" width="6" height="11" rx="3"/>
          <path d="M5 10a7 7 0 0 0 14 0"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8"  y1="23" x2="16" y2="23"/>
        </svg>
      </span>
      <span>{label}</span>
    </button>
  );
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────

function ExerciseCard({
  item, index, total, onUpdate, onDelete, onMoveUp, onMoveDown,
}: {
  item: ExerciseItem; index: number; total: number;
  onUpdate: (id: string, patch: Partial<ExerciseItem>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name,    setName]    = useState(item.name);
  const [purpose, setPurpose] = useState(item.purpose);
  const [steps,   setSteps]   = useState(item.steps.join("\n"));
  const [reps,    setReps]    = useState(item.reps);
  const [freq,    setFreq]    = useState(item.frequency);
  const [points,  setPoints]  = useState(item.points);
  const [stop,    setStop]    = useState(item.stopCriteria);
  const [evid,    setEvid]    = useState(item.evidence);

  const saveEdit = () => {
    onUpdate(item.id, {
      name, purpose,
      steps:        steps.split("\n").map(s => s.trim()).filter(Boolean),
      reps, frequency: freq, points, stopCriteria: stop, evidence: evid,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: ORANGE }}>
        <p className="text-sm font-black" style={{ color: ORANGE }}>編集中 — {index + 1}. {item.name}</p>
        {([
          { label: "運動名", val: name, set: setName },
          { label: "目的",   val: purpose, set: setPurpose },
          { label: "回数",   val: reps,    set: setReps },
          { label: "頻度",   val: freq,    set: setFreq },
        ] as const).map(({ label, val, set }) => (
          <div key={label}>
            <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
            <input value={val} onChange={e => (set as (v: string) => void)(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400"
              style={{ color: "#1A1A1A" }} />
          </div>
        ))}
        {([
          { label: "やり方（1行ずつ）", val: steps,  set: setSteps,  rows: 4 },
          { label: "ポイント・患者への指示", val: points, set: setPoints, rows: 2 },
          { label: "やめるべき時",      val: stop,   set: setStop,   rows: 2 },
          { label: "根拠",              val: evid,   set: setEvid,   rows: 2 },
        ] as const).map(({ label, val, set, rows }) => (
          <div key={label}>
            <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
            <textarea value={val} onChange={e => (set as (v: string) => void)(e.target.value)} rows={rows}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 resize-none"
              style={{ color: "#1A1A1A" }} />
          </div>
        ))}
        <div className="flex gap-2">
          <button onClick={saveEdit}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: ORANGE }}>保存</button>
          <button onClick={() => setEditing(false)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-600 border border-gray-200 transition hover:bg-gray-50">
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3" style={{ background: GREEN }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-white px-2 py-0.5 rounded-full"
            style={{ background: ORANGE }}>{index + 1}</span>
          <p className="text-base font-black text-white">{item.name}</p>
        </div>
        <div className="flex items-center gap-1">
          {[
            { icon: "↑", action: () => onMoveUp(item.id),   disabled: index === 0 },
            { icon: "↓", action: () => onMoveDown(item.id), disabled: index === total - 1 },
          ].map(({ icon, action, disabled }) => (
            <button key={icon} onClick={action} disabled={disabled}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-30 text-white text-xs">
              {icon}
            </button>
          ))}
          <button onClick={() => setEditing(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={() => onDelete(item.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-red-500/40 transition text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {item.purpose && (
          <div className="rounded-xl px-3 py-2" style={{ background: "#EFF6FF" }}>
            <p className="text-xs font-bold text-blue-700 mb-0.5">目的</p>
            <p className="text-base text-blue-900 leading-relaxed">{item.purpose}</p>
          </div>
        )}
        {item.steps.length > 0 && (
          <div>
            <p className="text-sm font-bold text-gray-700 mb-2">やり方</p>
            <ol className="space-y-1.5">
              {item.steps.map((s, si) => (
                <li key={si} className="flex items-start gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-black text-white"
                    style={{ background: ORANGE }}>{si + 1}</span>
                  <p className="text-base text-gray-800 leading-relaxed pt-0.5">{s}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {item.reps && (
            <div className="rounded-xl border border-gray-200 px-3 py-2.5 text-center" style={{ background: "#F9FAFB" }}>
              <p className="text-xs text-gray-500 mb-0.5">回数</p>
              <p className="text-base font-black text-gray-900">{item.reps}</p>
            </div>
          )}
          {item.frequency && (
            <div className="rounded-xl border border-gray-200 px-3 py-2.5 text-center" style={{ background: "#F9FAFB" }}>
              <p className="text-xs text-gray-500 mb-0.5">頻度</p>
              <p className="text-base font-black text-gray-900">{item.frequency}</p>
            </div>
          )}
        </div>
        {item.points && (
          <div className="rounded-xl px-3 py-3 border-l-4"
            style={{ background: "#FFFBEB", borderLeftColor: ORANGE }}>
            <p className="text-xs font-bold mb-1" style={{ color: "#92400E" }}>ポイント・患者への指示</p>
            <p className="text-base leading-relaxed" style={{ color: "#92400E" }}>{item.points}</p>
          </div>
        )}
        {item.stopCriteria && (
          <div className="rounded-xl px-3 py-3 border-l-4"
            style={{ background: "#FEF2F2", borderLeftColor: "#DC2626" }}>
            <p className="text-xs font-bold text-red-700 mb-1">やめるべき時</p>
            <p className="text-base text-red-700 leading-relaxed">{item.stopCriteria}</p>
          </div>
        )}
        {item.evidence && (
          <div className="rounded-lg px-3 py-2" style={{ background: "#F9FAFB" }}>
            <p className="text-xs text-gray-400 font-medium">根拠：{item.evidence}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ResultPreview ────────────────────────────────────────────────────────

function ResultPreview({
  disease, patientName, ptName, date, result, message, pdfLoading, noteSaved,
  onUpdate, onDelete, onMoveUp, onMoveDown, onAddItem,
  onPdf, onSaveNote, onRegenerate, onMessageChange,
}: {
  disease: string; patientName: string; ptName: string; date: string;
  result: HomeExerciseResult; message: string; pdfLoading: boolean; noteSaved: boolean;
  onUpdate: (id: string, p: Partial<ExerciseItem>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onAddItem: () => void;
  onPdf: () => void;
  onSaveNote: () => void;
  onRegenerate: () => void;
  onMessageChange: (v: string) => void;
}) {
  return (
    <>
      {/* アクションバー */}
      <div className="rounded-2xl bg-white border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-400 mb-3">
          {[patientName, ptName, date, disease].filter(Boolean).join("　·　")}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onPdf} disabled={pdfLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: GREEN }}>
            {pdfLoading
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />生成中…</>
              : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>PDFをダウンロード</>
            }
          </button>
          <SaveIconButton saved={noteSaved} onClick={onSaveNote} />
          <button onClick={onRegenerate}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 border border-gray-200 transition hover:bg-gray-50">
            再生成
          </button>
        </div>
      </div>

      {/* 指導書ヘッダー */}
      <div className="rounded-2xl border-2 p-5 text-center"
        style={{ borderColor: GREEN, background: GREEN }}>
        <p className="text-xl font-black text-white mb-1">自主トレーニング指導書</p>
        {patientName && <p className="text-sm text-white/80">お名前：{patientName}</p>}
        {ptName      && <p className="text-sm text-white/80">担当PT：{ptName}</p>}
        <p className="text-sm text-white/80">作成日：{date}</p>
        {disease     && <p className="text-sm text-white/80">疾患：{disease}</p>}
      </div>

      {/* 運動メニュー */}
      {result.items.map((item, i) => (
        <ExerciseCard key={item.id} item={item} index={i} total={result.items.length}
          onUpdate={onUpdate} onDelete={onDelete}
          onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
      ))}

      <button onClick={onAddItem}
        className="w-full py-3 rounded-2xl border-2 border-dashed text-sm font-bold text-gray-400 hover:text-orange-500 transition"
        style={{ borderColor: "#E5E7EB" }}>
        + 運動メニューを追加
      </button>

      {/* 注意事項 */}
      {result.cautions.length > 0 && (
        <div className="rounded-2xl border border-orange-200 px-4 py-4"
          style={{ background: "#FFF7ED" }}>
          <p className="text-sm font-black mb-2" style={{ color: ORANGE }}>注意事項</p>
          <ul className="space-y-1">
            {result.cautions.map((c, i) => (
              <li key={i} className="text-base leading-relaxed" style={{ color: "#92400E" }}>・{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* PTからのメッセージ */}
      <div className="rounded-2xl border border-green-200 px-4 py-4">
        <p className="text-sm font-black text-green-800 mb-2">担当PTからのメッセージ</p>
        <textarea value={message} onChange={e => onMessageChange(e.target.value)}
          placeholder="患者さんへのメッセージを入力してください（PDF・ノートに反映されます）"
          rows={3}
          className="w-full text-base rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-green-400 transition resize-none"
          style={{ color: "#1A1A1A" }} />
      </div>

      {/* 参照文献 */}
      {result.references.length > 0 && (
        <div className="rounded-2xl border border-gray-200 px-4 py-4"
          style={{ background: "#F9FAFB" }}>
          <p className="text-sm font-black text-gray-700 mb-2">参照した文献・参考書</p>
          <ul className="space-y-1">
            {result.references.map((r, i) => (
              <li key={i} className="text-sm text-gray-500">・{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* フッター */}
      <div className="rounded-2xl border border-gray-100 px-4 py-3 text-center" style={{ background: "#F9FAFB" }}>
        <p className="text-sm font-black" style={{ color: ORANGE }}>PT Works</p>
        <p className="text-xs text-gray-400 mt-0.5">現役PTが作った臨床支援ツール</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-4">
        <button onClick={onPdf} disabled={pdfLoading}
          className="py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-1.5 transition hover:opacity-90 disabled:opacity-50"
          style={{ background: GREEN }}>
          {pdfLoading ? "生成中..." : "PDFをダウンロード"}
        </button>
        <div className="flex items-center justify-center">
          <SaveIconButton saved={noteSaved} onClick={onSaveNote} size={18} />
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function HomeExercisePage() {
  const router = useRouter();

  // タブ（デフォルト：標準作成）
  const [activeTab, setActiveTab] = useState<TabId>("standalone");

  // 治療考察からのデータ
  const [ctx, setCtx] = useState<TreatmentContext | null>(null);

  // 共通フォーム
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };
  const [patientName, setPatientName] = useState("");
  const [ptName,      setPtName]      = useState("");
  const [date,        setDate]        = useState(todayStr);
  const [level,       setLevel]       = useState<"軽度" | "中等度" | "高度">("中等度");
  const [notes,       setNotes]       = useState("");
  const [message,     setMessage]     = useState("");

  // 単独作成フォーム
  const [soDisease,           setSoDisease]           = useState("");
  const [soSymptoms,          setSoSymptoms]          = useState("");
  const [soContraindications, setSoContraindications] = useState("");
  const [soGoals,             setSoGoals]             = useState<string[]>([]);
  const [soOtherGoal,         setSoOtherGoal]         = useState("");

  // 即時まとめフォーム
  const [instInput,  setInstInput]  = useState("");
  const instTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 生成状態（全タブ共有）
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [result,     setResult]     = useState<HomeExerciseResult | null>(null);
  const [resultMode, setResultMode] = useState<TabId>("linked");
  const [error,      setError]      = useState("");

  // PDF / ノート
  const [pdfLoading, setPdfLoading] = useState(false);
  const [noteSaved,  setNoteSaved]  = useState(false);
  const [noteToast,  setNoteToast]  = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // localStorage から治療考察データを読み込む
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TREATMENT_CONTEXT_KEY);
      if (raw) setCtx(JSON.parse(raw) as TreatmentContext);
    } catch { /* ignore */ }
  }, []);

  // 即時まとめタブに切り替えたらテキストエリアをフォーカス
  useEffect(() => {
    if (activeTab === "instant" && !result) {
      setTimeout(() => instTextareaRef.current?.focus(), 100);
    }
  }, [activeTab, result]);

  // タブ切り替え時はリセット
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setResult(null);
    setStreamText("");
    setError("");
  };

  // 目的トグル
  const toggleGoal = (g: string) => {
    setSoGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  // ─── SSE 生成共通 ─────────────────────────────────────────────────────

  const runGenerate = useCallback(async (body: object, mode: TabId) => {
    setGenerating(true);
    setStreamText("");
    setResult(null);
    setError("");
    setNoteSaved(false);
    setResultMode(mode);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/homeexercise", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
        signal:  abortRef.current.signal,
      });
      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6)) as { type: string; text?: string; result?: HomeExerciseResult; message?: string };
            if (ev.type === "chunk" && ev.text) setStreamText(p => p + ev.text!);
            else if (ev.type === "done"  && ev.result)  setResult(ev.result);
            else if (ev.type === "error") setError(ev.message ?? "エラーが発生しました");
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleGenerateLinked = useCallback(() => {
    if (!ctx) return;
    runGenerate({
      mode:             "linked",
      disease:          ctx.disease,
      treatmentContent: ctx.treatmentContent,
      references:       ctx.references,
      level, patientName, ptName, notes,
    }, "linked");
  }, [ctx, level, patientName, ptName, notes, runGenerate]);

  const handleGenerateStandalone = useCallback(() => {
    if (!soDisease.trim()) return;
    const goals = soGoals.includes("その他") && soOtherGoal.trim()
      ? [...soGoals.filter(g => g !== "その他"), soOtherGoal.trim()]
      : soGoals;
    runGenerate({
      mode:               "standalone",
      disease:            soDisease.trim(),
      symptoms:           soSymptoms,
      contraindications:  soContraindications,
      goals,
      level, patientName, ptName, notes,
    }, "standalone");
  }, [soDisease, soSymptoms, soContraindications, soGoals, soOtherGoal, level, patientName, ptName, notes, runGenerate]);

  const handleGenerateInstant = useCallback(() => {
    if (!instInput.trim()) return;
    runGenerate({
      mode:         "instant",
      instantInput: instInput.trim(),
      patientName, ptName,
    }, "instant");
  }, [instInput, patientName, ptName, runGenerate]);

  // ─── アイテム操作 ──────────────────────────────────────────────────────

  const updateItem = useCallback((id: string, patch: Partial<ExerciseItem>) => {
    setResult(prev => prev ? { ...prev, items: prev.items.map(x => x.id === id ? { ...x, ...patch } : x) } : prev);
  }, []);

  const deleteItem  = useCallback((id: string) => {
    setResult(prev => prev ? { ...prev, items: prev.items.filter(x => x.id !== id) } : prev);
  }, []);

  const moveItem = useCallback((id: string, dir: 1 | -1) => {
    setResult(prev => {
      if (!prev) return prev;
      const idx = prev.items.findIndex(x => x.id === id);
      if (idx < 0 || idx + dir < 0 || idx + dir >= prev.items.length) return prev;
      const items = [...prev.items];
      [items[idx], items[idx + dir]] = [items[idx + dir], items[idx]];
      return { ...prev, items };
    });
  }, []);

  const addItem = useCallback(() => {
    const blank: ExerciseItem = {
      id: `ex-${Date.now()}`, name: "新しい運動", purpose: "",
      steps: [""], reps: "10回 × 3セット", frequency: "1日2回",
      points: "", stopCriteria: "痛みが出たら止める", evidence: "",
    };
    setResult(prev => prev ? { ...prev, items: [...prev.items, blank] } : prev);
  }, []);

  // ─── PDF / ノート ──────────────────────────────────────────────────────

  const currentDisease =
    resultMode === "linked"     ? (ctx?.disease ?? "") :
    resultMode === "standalone" ? soDisease :
    ""; // instant: 疾患名なし

  const handlePdf = useCallback(async () => {
    if (!result) return;
    setPdfLoading(true);
    try {
      const dl = await getPdfDownload();
      await dl({ patientName, ptName, date, disease: currentDisease,
        items: result.items, cautions: result.cautions,
        references: result.references, message });
    } catch (e) { console.error(e); }
    finally { setPdfLoading(false); }
  }, [result, patientName, ptName, date, currentDisease, message]);

  const handleSaveNote = useCallback(() => {
    if (!result || noteSaved) return;
    const content = result.items.map((item, i) =>
      `【${i + 1}. ${item.name}】\n目的：${item.purpose}\nやり方：\n${item.steps.map((s, si) => `${si + 1}. ${s}`).join("\n")}\n回数：${item.reps}\n頻度：${item.frequency}\nポイント：${item.points}\n根拠：${item.evidence}`
    ).join("\n\n");
    const titleBase = patientName ? `${patientName}の自主トレ指導書` : "自主トレ指導書";
    const titleSuffix = currentDisease ? `（${currentDisease}）` : "";
    saveNewNote({
      type:       "gpt",
      title:      `${titleBase}${titleSuffix}`,
      content, memo: message,
      tags:       ["自主トレ指導書", currentDisease].filter(Boolean),
      literature: result.references.map(r => ({ title: r, author: "", year: "" })),
    });
    setNoteSaved(true);
    setNoteToast(true);
    setTimeout(() => setNoteToast(false), 2000);
  }, [result, noteSaved, patientName, currentDisease, message]);

  // ─── JSX ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 3.5rem)" }}>
      <NoteToast visible={noteToast} />

      {/* ページヘッダー */}
      <div className="shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div style={{ borderLeft: "4px solid #E85D04", paddingLeft: 12 }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: "#111", margin: 0, lineHeight: 1.25 }}>自主トレ指導書作成</p>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0" }}>文献ベース・エビデンス準拠</p>
          </div>
        </div>

        {/* タブ */}
        <div className="flex border-t border-gray-100">
          {([
            { id: "standalone", label: "標準作成" },
            { id: "instant",    label: "スピード作成" },
            { id: "linked",     label: "AI治療考察と連携" },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className="flex-1 py-2.5 transition border-b-2"
              style={{
                fontSize:    12,
                fontWeight:  activeTab === tab.id ? 900 : 400,
                color:       activeTab === tab.id ? ORANGE : "#9CA3AF",
                borderColor: activeTab === tab.id ? ORANGE : "transparent",
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* スクロールエリア */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5"
          style={{ paddingBottom: activeTab === "instant" && !result && !generating ? "6rem" : undefined }}>

          {/* ─── AI治療考察と連携タブ ─────────────────────────────────────── */}
          {activeTab === "linked" && (
            <>
              {!ctx ? (
                <div className="flex flex-col items-center text-center gap-4 py-10">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#FFF7ED" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="1.5" strokeLinecap="round" className="w-7 h-7">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-black text-gray-900 mb-1">AI治療考察から始めてください</p>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      AI治療考察で疾患を検索し<br />
                      「自主トレ指導書を作成する」ボタンを押してください。
                    </p>
                  </div>
                  <button onClick={() => router.push("/stage1/treatment")}
                    className="px-6 py-3 rounded-2xl text-sm font-black text-white transition hover:opacity-90"
                    style={{ background: ORANGE }}>
                    AI治療考察へ →
                  </button>
                  <div className="border-t border-gray-200 w-full pt-4">
                    <p className="text-xs text-gray-400">または「単独で作成」タブから疾患名を直接入力して作成できます</p>
                  </div>
                </div>
              ) : result ? (
                <ResultPreview
                  disease={ctx.disease} patientName={patientName} ptName={ptName} date={date}
                  result={result} message={message} pdfLoading={pdfLoading} noteSaved={noteSaved}
                  onUpdate={updateItem} onDelete={deleteItem}
                  onMoveUp={id => moveItem(id, -1)} onMoveDown={id => moveItem(id, 1)}
                  onAddItem={addItem} onPdf={handlePdf} onSaveNote={handleSaveNote}
                  onRegenerate={() => { setResult(null); setStreamText(""); }}
                  onMessageChange={setMessage}
                />
              ) : (
                <>
                  <div className="rounded-2xl border border-green-200 px-4 py-3"
                    style={{ background: "#F0FDF4" }}>
                    <p className="text-xs font-bold text-green-700 mb-1">AI治療考察から引き継ぎ</p>
                    <p className="text-base font-black text-green-900">{ctx.disease}</p>
                    {ctx.references.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">参照文献：{ctx.references.length}件</p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-4">
                    <p className="text-sm font-black text-gray-900">患者情報・設定</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="患者名（任意）">
                        <TextInput value={patientName} onChange={setPatientName} placeholder="例：田中様" />
                      </Field>
                      <Field label="担当PT名">
                        <TextInput value={ptName} onChange={setPtName} placeholder="例：藤 充輝 PT" />
                      </Field>
                    </div>
                    <Field label="作成日">
                      <TextInput value={date} onChange={setDate} />
                    </Field>
                    <Field label="運動レベル">
                      <div className="flex gap-2">
                        {(["軽度", "中等度", "高度"] as const).map(l => (
                          <LevelButton key={l} label={l} active={level === l} onClick={() => setLevel(l)} />
                        ))}
                      </div>
                    </Field>
                    <Field label="特記事項（任意）">
                      <TextArea value={notes} onChange={setNotes} placeholder="例：膝の術後3週間、杖歩行中" />
                    </Field>
                    {error && (
                      <div className="rounded-xl px-4 py-3 bg-red-50 border border-red-200">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}
                    <button onClick={handleGenerateLinked} disabled={generating}
                      className="w-full py-4 rounded-2xl text-base font-black text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${ORANGE}, #c44b00)` }}>
                      {generating
                        ? <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />生成中…</>
                        : "指導書を生成する →"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ─── 単独で作成タブ ───────────────────────────────────────────── */}
          {activeTab === "standalone" && (
            <>
              {result && resultMode === "standalone" ? (
                <ResultPreview
                  disease={soDisease} patientName={patientName} ptName={ptName} date={date}
                  result={result} message={message} pdfLoading={pdfLoading} noteSaved={noteSaved}
                  onUpdate={updateItem} onDelete={deleteItem}
                  onMoveUp={id => moveItem(id, -1)} onMoveDown={id => moveItem(id, 1)}
                  onAddItem={addItem} onPdf={handlePdf} onSaveNote={handleSaveNote}
                  onRegenerate={() => { setResult(null); setStreamText(""); }}
                  onMessageChange={setMessage}
                />
              ) : (
                <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-5">

                  <div className="space-y-4">
                    <p className="text-sm font-black text-gray-900">基本情報</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="患者名（任意）">
                        <TextInput value={patientName} onChange={setPatientName} placeholder="例：田中様" />
                      </Field>
                      <Field label="担当PT名">
                        <TextInput value={ptName} onChange={setPtName} placeholder="例：藤 充輝 PT" />
                      </Field>
                    </div>
                    <Field label="作成日">
                      <TextInput value={date} onChange={setDate} />
                    </Field>
                  </div>

                  <div className="border-t border-gray-100" />

                  <div className="space-y-4">
                    <p className="text-sm font-black text-gray-900">疾患・状態</p>
                    <Field label="疾患名（必須）">
                      <TextInput value={soDisease} onChange={setSoDisease} placeholder="例：変形性膝関節症、脳梗塞後遺症" />
                    </Field>
                    <Field label="主な症状・問題点（任意）">
                      <TextArea value={soSymptoms} onChange={setSoSymptoms}
                        placeholder="例：膝の痛み・歩行困難、右片麻痺・筋力低下" />
                    </Field>
                    <Field label="禁忌・注意事項（任意）">
                      <TextArea value={soContraindications} onChange={setSoContraindications}
                        placeholder="例：階段昇降禁止、心疾患あり・運動強度に注意" />
                    </Field>
                  </div>

                  <div className="border-t border-gray-100" />

                  <div className="space-y-2">
                    <p className="text-sm font-black text-gray-900">運動レベル</p>
                    <div className="flex gap-2">
                      {(["軽度", "中等度", "高度"] as const).map(l => (
                        <LevelButton key={l} label={l} active={level === l} onClick={() => setLevel(l)} />
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  <div className="space-y-3">
                    <p className="text-sm font-black text-gray-900">自主トレの目的（複数選択可）</p>
                    <div className="flex flex-wrap gap-2">
                      {GOAL_OPTIONS.map(g => (
                        <button key={g} onClick={() => toggleGoal(g)}
                          className="px-3.5 py-2 rounded-xl text-sm font-bold border-2 transition"
                          style={{
                            background:  soGoals.includes(g) ? ORANGE : "#fff",
                            borderColor: soGoals.includes(g) ? ORANGE : "#E5E7EB",
                            color:       soGoals.includes(g) ? "#fff" : "#374151",
                          }}>
                          {g}
                        </button>
                      ))}
                    </div>
                    {soGoals.includes("その他") && (
                      <TextInput value={soOtherGoal} onChange={setSoOtherGoal}
                        placeholder="その他の目的を入力" />
                    )}
                  </div>

                  <div className="border-t border-gray-100" />

                  <div className="space-y-2">
                    <p className="text-sm font-black text-gray-900">特記事項（任意）</p>
                    <TextArea value={notes} onChange={setNotes}
                      placeholder="例：階段昇降は禁止、心疾患あり・運動強度に注意" />
                  </div>

                  {error && (
                    <div className="rounded-xl px-4 py-3 bg-red-50 border border-red-200">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <button onClick={handleGenerateStandalone} disabled={generating || !soDisease.trim()}
                    className="w-full py-4 rounded-2xl text-base font-black text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, #c44b00)` }}>
                    {generating
                      ? <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />生成中…</>
                      : "指導書を生成する →"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ─── 今日の治療を即時まとめるタブ ───────────────────────────────── */}
          {activeTab === "instant" && (
            <>
              {result && resultMode === "instant" ? (
                <ResultPreview
                  disease="" patientName={patientName} ptName={ptName} date={date}
                  result={result} message={message} pdfLoading={pdfLoading} noteSaved={noteSaved}
                  onUpdate={updateItem} onDelete={deleteItem}
                  onMoveUp={id => moveItem(id, -1)} onMoveDown={id => moveItem(id, 1)}
                  onAddItem={addItem} onPdf={handlePdf} onSaveNote={handleSaveNote}
                  onRegenerate={() => { setResult(null); setStreamText(""); }}
                  onMessageChange={setMessage}
                />
              ) : (
                <div className="space-y-4">
                  {/* 強調バナー */}
                  <div className="rounded-2xl p-4 flex items-start gap-3"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}18, ${ORANGE}08)`, border: `1.5px solid ${ORANGE}40` }}>
                    <div className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center mt-0.5"
                      style={{ background: ORANGE }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-black" style={{ color: ORANGE }}>スピード入力モード</p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                        今日行ったトレーニングを入力するだけで<br/>
                        すぐに指導書を作成します
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-4">
                    {/* 基本情報 */}
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="患者名（任意）">
                        <TextInput value={patientName} onChange={setPatientName} placeholder="例：田中様" />
                      </Field>
                      <Field label="担当PT名">
                        <TextInput value={ptName} onChange={setPtName} placeholder="例：藤 充輝 PT" />
                      </Field>
                    </div>
                    <Field label="作成日">
                      <TextInput value={date} onChange={setDate} />
                    </Field>
                  </div>

                  <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-4">
                    <div>
                      <p className="text-sm font-black text-gray-900 mb-1">今日行ったトレーニングの入力</p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        今日行ったトレーニングと実施条件・患者への指示内容を入力してください
                      </p>
                    </div>

                    {/* 音声入力 */}
                    <VoiceInputButton onAppend={text => setInstInput(prev => prev ? prev + "\n" + text : text)} />

                    {/* テキスト入力 */}
                    <textarea
                      ref={instTextareaRef}
                      value={instInput}
                      onChange={e => setInstInput(e.target.value)}
                      rows={8}
                      placeholder={`例：
大腿四頭筋訓練・痛みのない範囲で・5秒かけてゆっくり・10回3セット
SLR・30度まで・息を止めないように・20回2セット
股関節外転・側臥位で・骨盤が動かないように・15回3セット`}
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition resize-none leading-relaxed"
                      style={{ color: "#1A1A1A" }}
                    />

                    <p className="text-xs text-gray-400 leading-relaxed">
                      トレーニング名と一緒に実施条件・患者への指示内容・注意点も入力すると
                      より正確な指導書が作成されます
                    </p>

                    {error && (
                      <div className="rounded-xl px-4 py-3 bg-red-50 border border-red-200">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ストリーミング中 */}
          {generating && streamText && (
            <div className="rounded-2xl bg-white border border-gray-200 p-4">
              <p className="text-xs font-bold text-gray-400 mb-2">生成中...</p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{streamText}</pre>
              <span className="inline-block w-1 h-4 bg-orange-400 animate-pulse ml-0.5 align-text-bottom" />
            </div>
          )}

        </div>
      </div>

      {/* 即時まとめタブ：固定ボタン */}
      {activeTab === "instant" && !result && (
        <div className="shrink-0 px-4 py-3 bg-white border-t border-gray-200 shadow-lg">
          <button
            onClick={handleGenerateInstant}
            disabled={generating || !instInput.trim()}
            className="w-full py-4 rounded-2xl text-base font-black text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${ORANGE}, #c44b00)` }}>
            {generating
              ? <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />指導書を生成中…</>
              : "指導書を生成する →"}
          </button>
        </div>
      )}
    </div>
  );
}
