"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
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

// ─── PDF helper (dynamic import, client-only) ─────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────

function LevelButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition"
      style={{
        background:  active ? ORANGE : "#F9FAFB",
        borderColor: active ? ORANGE : "#E5E7EB",
        color:       active ? "#fff" : "#374151",
      }}
    >
      {label}
    </button>
  );
}

function ExerciseCard({
  item, index, total, onUpdate, onDelete, onMoveUp, onMoveDown,
}: {
  item:       ExerciseItem;
  index:      number;
  total:      number;
  onUpdate:   (id: string, patch: Partial<ExerciseItem>) => void;
  onDelete:   (id: string) => void;
  onMoveUp:   (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName,         setEditName]         = useState(item.name);
  const [editPurpose,      setEditPurpose]      = useState(item.purpose);
  const [editSteps,        setEditSteps]        = useState(item.steps.join("\n"));
  const [editReps,         setEditReps]         = useState(item.reps);
  const [editFrequency,    setEditFrequency]    = useState(item.frequency);
  const [editPoints,       setEditPoints]       = useState(item.points);
  const [editStopCriteria, setEditStopCriteria] = useState(item.stopCriteria);
  const [editEvidence,     setEditEvidence]     = useState(item.evidence);

  const saveEdit = () => {
    onUpdate(item.id, {
      name:         editName,
      purpose:      editPurpose,
      steps:        editSteps.split("\n").map(s => s.trim()).filter(Boolean),
      reps:         editReps,
      frequency:    editFrequency,
      points:       editPoints,
      stopCriteria: editStopCriteria,
      evidence:     editEvidence,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: ORANGE }}>
        <p className="text-sm font-black" style={{ color: ORANGE }}>編集中 — {index + 1}. {item.name}</p>
        {[
          { label: "運動名", val: editName, set: setEditName },
          { label: "目的", val: editPurpose, set: setEditPurpose },
          { label: "回数", val: editReps, set: setEditReps },
          { label: "頻度", val: editFrequency, set: setEditFrequency },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
            <input value={val} onChange={e => set(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400"
              style={{ color: "#1A1A1A" }} />
          </div>
        ))}
        {[
          { label: "やり方（1行ずつ）", val: editSteps, set: setEditSteps, rows: 4 },
          { label: "ポイント", val: editPoints, set: setEditPoints, rows: 2 },
          { label: "やめるべき時", val: editStopCriteria, set: setEditStopCriteria, rows: 2 },
          { label: "根拠", val: editEvidence, set: setEditEvidence, rows: 2 },
        ].map(({ label, val, set, rows }) => (
          <div key={label}>
            <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
            <textarea value={val} onChange={e => set(e.target.value)} rows={rows}
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
      {/* カードヘッダー */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: GREEN }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-white px-2 py-0.5 rounded-full"
            style={{ background: ORANGE }}>{index + 1}</span>
          <p className="text-base font-black text-white">{item.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMoveUp(item.id)} disabled={index === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-30 text-white text-xs">
            ↑
          </button>
          <button onClick={() => onMoveDown(item.id)} disabled={index === total - 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-30 text-white text-xs">
            ↓
          </button>
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
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* 目的 */}
        {item.purpose && (
          <div className="rounded-xl px-3 py-2" style={{ background: "#EFF6FF" }}>
            <p className="text-xs font-bold text-blue-700 mb-0.5">目的</p>
            <p className="text-base text-blue-900 leading-relaxed">{item.purpose}</p>
          </div>
        )}

        {/* やり方 */}
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

        {/* 回数・頻度 */}
        <div className="grid grid-cols-2 gap-3">
          {item.reps && (
            <div className="rounded-xl border border-gray-200 px-3 py-2.5 text-center"
              style={{ background: "#F9FAFB" }}>
              <p className="text-xs text-gray-500 mb-0.5">回数</p>
              <p className="text-base font-black text-gray-900">{item.reps}</p>
            </div>
          )}
          {item.frequency && (
            <div className="rounded-xl border border-gray-200 px-3 py-2.5 text-center"
              style={{ background: "#F9FAFB" }}>
              <p className="text-xs text-gray-500 mb-0.5">頻度</p>
              <p className="text-base font-black text-gray-900">{item.frequency}</p>
            </div>
          )}
        </div>

        {/* ポイント */}
        {item.points && (
          <div className="rounded-xl px-3 py-3 border-l-4"
            style={{ background: "#FFFBEB", borderLeftColor: ORANGE }}>
            <p className="text-xs font-bold mb-1" style={{ color: "#92400E" }}>ポイント</p>
            <p className="text-base leading-relaxed" style={{ color: "#92400E" }}>{item.points}</p>
          </div>
        )}

        {/* やめるべき時 */}
        {item.stopCriteria && (
          <div className="rounded-xl px-3 py-3 border-l-4"
            style={{ background: "#FEF2F2", borderLeftColor: "#DC2626" }}>
            <p className="text-xs font-bold text-red-700 mb-1">やめるべき時</p>
            <p className="text-base text-red-700 leading-relaxed">{item.stopCriteria}</p>
          </div>
        )}

        {/* 根拠 */}
        {item.evidence && (
          <div className="rounded-lg px-3 py-2" style={{ background: "#F9FAFB" }}>
            <p className="text-xs text-gray-400 font-medium">根拠：{item.evidence}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function HomeExercisePage() {
  const router = useRouter();

  // 治療考察から引き継いだデータ
  const [ctx, setCtx] = useState<TreatmentContext | null>(null);

  // フォーム
  const [patientName, setPatientName] = useState("");
  const [ptName,      setPtName]      = useState("");
  const [date,        setDate]        = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  });
  const [level,   setLevel]   = useState<"軽度" | "中等度" | "高度">("中等度");
  const [notes,   setNotes]   = useState("");
  const [message, setMessage] = useState("");

  // 生成状態
  const [generating, setGenerating]     = useState(false);
  const [streamText, setStreamText]     = useState("");
  const [result,     setResult]         = useState<HomeExerciseResult | null>(null);
  const [error,      setError]          = useState("");

  // PDF生成
  const [pdfLoading, setPdfLoading] = useState(false);

  // ノート保存
  const [noteSaved,  setNoteSaved]  = useState(false);
  const [noteToast,  setNoteToast]  = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // AI治療考察のデータを読み込む
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TREATMENT_CONTEXT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TreatmentContext;
        setCtx(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!ctx) return;
    setGenerating(true);
    setStreamText("");
    setResult(null);
    setError("");
    setNoteSaved(false);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/homeexercise", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          disease:          ctx.disease,
          treatmentContent: ctx.treatmentContent,
          references:       ctx.references,
          level,
          patientName,
          ptName,
          notes,
        }),
        signal: abortRef.current.signal,
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
            if (ev.type === "chunk" && ev.text) {
              setStreamText(prev => prev + ev.text);
            } else if (ev.type === "done" && ev.result) {
              setResult(ev.result);
            } else if (ev.type === "error") {
              setError(ev.message ?? "エラーが発生しました");
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("通信エラーが発生しました。もう一度お試しください。");
      }
    } finally {
      setGenerating(false);
    }
  }, [ctx, level, patientName, ptName, notes]);

  // 運動編集
  const updateItem = useCallback((id: string, patch: Partial<ExerciseItem>) => {
    setResult(prev => prev ? {
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, ...patch } : item),
    } : prev);
  }, []);

  const deleteItem = useCallback((id: string) => {
    setResult(prev => prev ? { ...prev, items: prev.items.filter(item => item.id !== id) } : prev);
  }, []);

  const moveItem = useCallback((id: string, dir: 1 | -1) => {
    setResult(prev => {
      if (!prev) return prev;
      const idx = prev.items.findIndex(item => item.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.items.length) return prev;
      const items = [...prev.items];
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      return { ...prev, items };
    });
  }, []);

  const addItem = useCallback(() => {
    const blank: ExerciseItem = {
      id:           `ex-${Date.now()}`,
      name:         "新しい運動",
      purpose:      "",
      steps:        [""],
      reps:         "10回 × 3セット",
      frequency:    "1日2回",
      points:       "",
      stopCriteria: "痛みが出たら止める",
      evidence:     "",
    };
    setResult(prev => prev ? { ...prev, items: [...prev.items, blank] } : prev);
  }, []);

  // PDF出力
  const handlePdf = useCallback(async () => {
    if (!result || !ctx) return;
    setPdfLoading(true);
    try {
      const download = await getPdfDownload();
      await download({
        patientName,
        ptName,
        date,
        disease: ctx.disease,
        items:   result.items,
        cautions: result.cautions,
        references: result.references,
        message,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setPdfLoading(false);
    }
  }, [result, ctx, patientName, ptName, date, message]);

  // ノート保存
  const handleSaveNote = useCallback(() => {
    if (!result || !ctx || noteSaved) return;
    const content = result.items.map((item, i) =>
      `【${i + 1}. ${item.name}】\n目的：${item.purpose}\nやり方：\n${item.steps.map((s, si) => `${si + 1}. ${s}`).join("\n")}\n回数：${item.reps}\n頻度：${item.frequency}\nポイント：${item.points}\n根拠：${item.evidence}`
    ).join("\n\n");

    saveNewNote({
      type:       "gpt",
      title:      `${patientName ? patientName + "の" : ""}自主トレ指導書（${ctx.disease}）`,
      content,
      memo:       message,
      tags:       ["自主トレ指導書", ctx.disease].filter(Boolean),
      literature: result.references.map(r => ({ title: r, author: "", year: "" })),
    });
    setNoteSaved(true);
    setNoteToast(true);
    setTimeout(() => setNoteToast(false), 2000);
  }, [result, ctx, patientName, message, noteSaved]);

  // ─── ガード: 治療考察データがない場合 ────────────────────────────────────
  if (!ctx) {
    return (
      <div className="flex flex-col" style={{ height: "calc(100dvh - 3.5rem)" }}>
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
              <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0" }}>文献ベース・AI治療考察連携</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#FFF7ED" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
            </svg>
          </div>
          <div>
            <p className="text-base font-black text-gray-900 mb-1">AI治療考察から始めてください</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              自主トレ指導書を作成するには、まずAI治療考察で疾患を検索し<br />
              「自主トレ指導書を作成する」ボタンを押してください。
            </p>
          </div>
          <button onClick={() => router.push("/stage1/treatment")}
            className="px-6 py-3 rounded-2xl text-sm font-black text-white transition hover:opacity-90"
            style={{ background: ORANGE }}>
            AI治療考察へ →
          </button>
        </div>
      </div>
    );
  }

  // ─── 通常表示 ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 3.5rem)" }}>
      <NoteToast visible={noteToast} />

      {/* ヘッダー */}
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
            <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0" }}>文献ベース・AI治療考察連携</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

          {/* 連携元情報 */}
          <div className="rounded-2xl border border-green-200 px-4 py-3"
            style={{ background: "#F0FDF4" }}>
            <p className="text-xs font-bold text-green-700 mb-1">AI治療考察から引き継ぎ</p>
            <p className="text-base font-black text-green-900">{ctx.disease}</p>
            {ctx.references.length > 0 && (
              <p className="text-xs text-green-600 mt-1">
                参照文献：{ctx.references.length}件
              </p>
            )}
          </div>

          {/* フォーム */}
          {!result && (
            <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-4">
              <p className="text-sm font-black text-gray-900">患者情報・設定</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">患者名（任意）</label>
                  <input value={patientName} onChange={e => setPatientName(e.target.value)}
                    placeholder="例：田中様"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition"
                    style={{ color: "#1A1A1A" }} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">担当PT名</label>
                  <input value={ptName} onChange={e => setPtName(e.target.value)}
                    placeholder="例：藤 充輝 PT"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition"
                    style={{ color: "#1A1A1A" }} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">作成日</label>
                <input value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition"
                  style={{ color: "#1A1A1A" }} />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">運動レベル</label>
                <div className="flex gap-2">
                  {(["軽度", "中等度", "高度"] as const).map(l => (
                    <LevelButton key={l} label={l} active={level === l} onClick={() => setLevel(l)} />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">特記事項（任意）</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="例：膝の術後3週間、杖歩行中"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition resize-none"
                  style={{ color: "#1A1A1A" }} />
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3 bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button onClick={handleGenerate} disabled={generating}
                className="w-full py-4 rounded-2xl text-base font-black text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #c44b00)` }}>
                {generating ? (
                  <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />生成中…</>
                ) : "指導書を生成する →"}
              </button>
            </div>
          )}

          {/* ストリーミング中 */}
          {generating && streamText && (
            <div className="rounded-2xl bg-white border border-gray-200 p-4">
              <p className="text-xs font-bold text-gray-400 mb-2">生成中...</p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{streamText}</pre>
              <span className="inline-block w-1 h-4 bg-orange-400 animate-pulse ml-0.5 align-text-bottom" />
            </div>
          )}

          {/* プレビュー表示 */}
          {result && !generating && (
            <>
              {/* アクションバー */}
              <div className="rounded-2xl bg-white border border-gray-200 p-4">
                <p className="text-xs font-bold text-gray-500 mb-3">
                  {patientName && <>{patientName}　·　</>}{ptName && <>{ptName}　·　</>}{date}　·　{ctx.disease}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handlePdf} disabled={pdfLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: GREEN }}>
                    {pdfLoading ? (
                      <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />生成中…</>
                    ) : (
                      <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>PDFをダウンロード</>
                    )}
                  </button>
                  <SaveIconButton saved={noteSaved} onClick={handleSaveNote} />
                  <button onClick={() => { setResult(null); setStreamText(""); }}
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
                <p className="text-sm text-white/80">疾患：{ctx.disease}</p>
              </div>

              {/* 運動メニュー */}
              {result.items.map((item, i) => (
                <ExerciseCard
                  key={item.id}
                  item={item}
                  index={i}
                  total={result.items.length}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  onMoveUp={id => moveItem(id, -1)}
                  onMoveDown={id => moveItem(id, 1)}
                />
              ))}

              {/* 運動追加ボタン */}
              <button onClick={addItem}
                className="w-full py-3 rounded-2xl border-2 border-dashed text-sm font-bold text-gray-400 hover:border-orange-400 hover:text-orange-500 transition"
                style={{ borderColor: "#E5E7EB" }}>
                + 運動メニューを追加
              </button>

              {/* 注意事項 */}
              {result.cautions.length > 0 && (
                <div className="rounded-2xl border border-orange-200 px-4 py-4"
                  style={{ background: "#FFF7ED" }}>
                  <p className="text-sm font-black mb-2" style={{ color: ORANGE }}>⚠️ 注意事項</p>
                  <ul className="space-y-1">
                    {result.cautions.map((c, i) => (
                      <li key={i} className="text-base leading-relaxed" style={{ color: "#92400E" }}>
                        ・{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* PTからのメッセージ */}
              <div className="rounded-2xl border border-green-200 px-4 py-4">
                <p className="text-sm font-black text-green-800 mb-2">担当PTからのメッセージ</p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="患者さんへのメッセージを入力してください（印刷・PDFに反映されます）"
                  rows={3}
                  className="w-full text-base rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-green-400 transition resize-none"
                  style={{ color: "#1A1A1A" }}
                />
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

              {/* PT Works フッター */}
              <div className="rounded-2xl border border-gray-100 px-4 py-3 text-center"
                style={{ background: "#F9FAFB" }}>
                <p className="text-sm font-black" style={{ color: ORANGE }}>PT Works</p>
                <p className="text-xs text-gray-400 mt-0.5">現役PTが作った臨床支援ツール</p>
              </div>

              {/* 下部アクションボタン */}
              <div className="grid grid-cols-2 gap-3 pb-4">
                <button onClick={handlePdf} disabled={pdfLoading}
                  className="py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-1.5 transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: GREEN }}>
                  {pdfLoading ? "生成中..." : "PDFをダウンロード"}
                </button>
                <SaveIconButton saved={noteSaved} onClick={handleSaveNote} size={18} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
