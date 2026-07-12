"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  loadNotes, updateNote, updateMemo, deleteNote, exportNotes, importNotes,
  type Note, type NoteType,
} from "@/lib/notes";
import { NOTE_TYPE_LABELS, NOTE_TYPE_COLORS } from "@/components/SaveNoteModal";

const ORANGE = "#E85D04";
const GREEN  = "#1B4332";

// ── HTML helpers ───────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  if (!html.includes("<")) return html;
  try {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent ?? "";
  } catch { return html.replace(/<[^>]*>/g, ""); }
}

// ── Rich memo constants ────────────────────────────────────────────────────

const MARKERS = [
  { color: "#FFF59D", label: "黄" },
  { color: "#FFCC80", label: "橙" },
  { color: "#A5D6A7", label: "緑" },
  { color: "#F8BBD0", label: "桃" },
];

const TEXT_COLORS = [
  { color: "default", display: "#374151" },
  { color: "#EF4444", display: "#EF4444" },
  { color: "#2563EB", display: "#2563EB" },
];

// ── RichMemoEditor ─────────────────────────────────────────────────────────

function RichMemoEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef     = useRef<HTMLDivElement>(null);
  const saveTimerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef    = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);

  const [toolbar,  setToolbar]  = useState<{ x: number; y: number; yBottom: number } | null>(null);
  const [isEmpty,  setIsEmpty]  = useState(!value);

  // Set initial HTML exactly once on mount
  useEffect(() => {
    if (editorRef.current && !mountedRef.current) {
      mountedRef.current = true;
      editorRef.current.innerHTML = value || "";
      setIsEmpty(!editorRef.current.textContent?.trim());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track text selection
  useEffect(() => {
    const onSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) {
        setToolbar(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect  = range.getBoundingClientRect();
      if (rect.width === 0) { setToolbar(null); return; }
      savedRangeRef.current = range.cloneRange();
      setToolbar({ x: rect.left + rect.width / 2, y: rect.top, yBottom: rect.bottom });
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  const scheduleSave = useCallback((delay = 1000) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    }, delay);
  }, [onChange]);

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current && editorRef.current) {
      editorRef.current.focus();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const applyHighlight = (color: string | null) => {
    restoreSelection();
    if (color) {
      document.execCommand("hiliteColor", false, color);
    } else {
      document.execCommand("removeFormat");
    }
    setToolbar(null);
    scheduleSave(300);
  };

  const applyTextColor = (color: string) => {
    restoreSelection();
    if (color === "default") {
      document.execCommand("removeFormat");
    } else {
      document.execCommand("foreColor", false, color);
    }
    setToolbar(null);
    scheduleSave(300);
  };

  const handleInput = useCallback(() => {
    if (editorRef.current) setIsEmpty(!editorRef.current.textContent?.trim());
    scheduleSave(1000);
  }, [scheduleSave]);

  const showAbove = toolbar ? toolbar.y > 130 : true;

  return (
    <div className="relative">

      {/* Floating format toolbar */}
      {toolbar && (
        <div
          className="fixed bg-white rounded-2xl shadow-xl border border-gray-100 px-3 py-2.5"
          style={{
            zIndex: 9999,
            left: toolbar.x,
            top:  showAbove ? toolbar.y  - 8 : toolbar.yBottom + 8,
            transform: showAbove ? "translate(-50%, -100%)" : "translate(-50%, 0)",
            maxWidth: "calc(100vw - 24px)",
          }}
          onPointerDown={e => e.preventDefault()}
        >
          {/* Marker row */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-gray-400 shrink-0 w-11">マーカー</span>
            <div className="flex gap-1.5">
              {MARKERS.map(m => (
                <button key={m.color} aria-label={`マーカー${m.label}`}
                  onPointerDown={e => { e.preventDefault(); applyHighlight(m.color); }}
                  className="w-7 h-7 rounded-full border-2 border-transparent hover:border-gray-400 active:scale-90 transition-all shrink-0"
                  style={{ background: m.color }} />
              ))}
            </div>
          </div>

          {/* Text color row */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-gray-400 shrink-0 w-11">文字色</span>
            <div className="flex gap-1.5">
              {TEXT_COLORS.map(c => (
                <button key={c.color} aria-label="文字色"
                  onPointerDown={e => { e.preventDefault(); applyTextColor(c.color); }}
                  className="w-7 h-7 rounded-full border-2 border-transparent hover:border-gray-400 active:scale-90 transition-all shrink-0"
                  style={{ background: c.display }} />
              ))}
            </div>
          </div>

          {/* Clear row */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 w-11" />
            <button
              onPointerDown={e => { e.preventDefault(); applyHighlight(null); }}
              className="text-[11px] font-bold px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
              解除
            </button>
          </div>
        </div>
      )}

      {/* Placeholder */}
      {isEmpty && (
        <span className="absolute top-0 left-0 pointer-events-none select-none"
          style={{ fontSize: 13, color: "#9CA3AF" }}>
          メモを追加...
        </span>
      )}

      {/* Contenteditable body */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="w-full outline-none bg-transparent leading-relaxed min-h-[80px]"
        style={{ fontSize: 13, color: "#6B7280", wordBreak: "break-word" }}
      />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────

type Tab = "all" | NoteType;
type SortKey = "newest" | "type" | "tag";

const TABS: { id: Tab; label: string }[] = [
  { id: "all",          label: "全て"      },
  { id: "gpt",          label: "GPT回答"   },
  { id: "treatment",    label: "治療プラン" },
  { id: "literature",   label: "文献"       },
  { id: "homeexercise", label: "指導書"     },
];

// ── AI分析キャッシュキー ──────────────────────────────────────────────────
const AI_ANALYSIS_KEY = "ptworks_ai_analysis";

interface AiAnalysis {
  summary: string;
  points: string[];
  nextTopics: string[];
  generatedAt: string;
  noteCount: number;
}

// ── 連続学習日数キー ─────────────────────────────────────────────────────
const STREAK_KEY = "ptworks_streak";
interface StreakData { lastDate: string; days: number; }

function updateStreak(): number {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(STREAK_KEY);
    const data: StreakData = raw ? JSON.parse(raw) as StreakData : { lastDate: "", days: 0 };
    if (data.lastDate === today) return data.days;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const days = data.lastDate === yesterday ? data.days + 1 : 1;
    localStorage.setItem(STREAK_KEY, JSON.stringify({ lastDate: today, days }));
    return days;
  } catch { return 1; }
}

// ── 進捗統計 ──────────────────────────────────────────────────────────────

function ProgressStats({ notes }: { notes: Note[] }) {
  const [streak, setStreak] = useState(0);
  useEffect(() => { setStreak(updateStreak()); }, []);

  const totalCount = notes.length;

  // 今週追加
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekCount = notes.filter(n => new Date(n.createdAt) >= weekStart).length;

  // よく調べる分野（タグ頻度）
  const tagFreq: Record<string, number> = {};
  notes.forEach(n => n.tags.forEach(t => { tagFreq[t] = (tagFreq[t] ?? 0) + 1; }));
  const topTag = Object.entries(tagFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const stats = [
    { label: "保存ノート",     value: `${totalCount}件`,     sub: "合計" },
    { label: "今週追加",       value: `${weekCount}件`,      sub: "今週" },
    { label: "よく調べる",     value: topTag,                sub: "分野" },
    { label: "連続学習",       value: `🔥${streak}日`,       sub: "連続" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {stats.map(s => (
        <div key={s.label} className="rounded-2xl p-3 text-center border border-gray-100"
          style={{ background: "#F9FAFB" }}>
          <p className="text-[10px] text-gray-400 mb-1 leading-tight">{s.label}</p>
          <p className="text-sm font-black text-gray-900 leading-snug break-all">{s.value}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── AI学習分析 ──────────────────────────────────────────────────────────────

function AiAnalysisCard({ notes, onReload }: { notes: Note[]; onReload: () => void }) {
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AI_ANALYSIS_KEY);
      if (raw) setAnalysis(JSON.parse(raw) as AiAnalysis);
    } catch { /* ignore */ }
  }, []);

  const generate = useCallback(async () => {
    if (notes.length < 3 || loading) return;
    setLoading(true);
    try {
      const summary = notes.slice(0, 20).map(n =>
        `[${NOTE_TYPE_LABELS[n.type]}] ${n.title} タグ:${n.tags.join(",")}`
      ).join("\n");

      const res = await fetch("/api/pt-gpt", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `以下は私が保存したノート一覧です。学習傾向を分析してください。\n\n${summary}\n\n以下のJSON形式のみで回答してください：\n{"summary":"あなたが最近よく調べているのは○○分野です。（1文）","points":["共通の臨床ポイント1","共通の臨床ポイント2","共通の臨床ポイント3"],"nextTopics":["次に学ぶと良いテーマ1","次に学ぶと良いテーマ2"]}`,
          history: [],
        }),
      });

      // SSEストリームを読んで最終テキストを集める
      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";
      let   fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6)) as { type: string; text?: string };
            if (ev.type === "chunk" && ev.text) fullText += ev.text;
          } catch { /* ignore */ }
        }
      }

      const match = fullText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { summary: string; points: string[]; nextTopics: string[] };
        const result: AiAnalysis = { ...parsed, generatedAt: new Date().toISOString(), noteCount: notes.length };
        localStorage.setItem(AI_ANALYSIS_KEY, JSON.stringify(result));
        setAnalysis(result);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [notes, loading]);

  // 3件以上かつ前回の分析がない or ノート数が変わったら自動生成
  useEffect(() => {
    if (notes.length >= 3 && (!analysis || analysis.noteCount !== notes.length)) {
      void generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.length]);

  if (notes.length < 3) return null;

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ background: GREEN }}>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-black text-white">AIがあなたの学習を分析</p>
          <button onClick={generate} disabled={loading}
            className="text-xs font-bold px-3 py-1.5 rounded-xl transition disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
            {loading ? "分析中..." : "再分析する"}
          </button>
        </div>

        {loading && !analysis && (
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
            <span className="text-xs text-white/70">学習データを分析中...</span>
          </div>
        )}

        {analysis && (
          <div className="space-y-3">
            <p className="text-sm text-white/90 leading-relaxed">{analysis.summary}</p>

            {analysis.points.length > 0 && (
              <div className="rounded-xl px-3 py-3" style={{ background: "rgba(255,255,255,0.1)" }}>
                <p className="text-xs font-bold text-white/60 mb-2">保存したノートから見えてくる共通の臨床ポイント</p>
                <ul className="space-y-1">
                  {analysis.points.map((p, i) => (
                    <li key={i} className="text-xs text-white/90 leading-relaxed">・{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.nextTopics.length > 0 && (
              <div>
                <p className="text-xs font-bold text-white/60 mb-1.5">次に学ぶと良い関連テーマ</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.nextTopics.map((t, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full font-bold"
                      style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── RelatedNotes ──────────────────────────────────────────────────────────

function RelatedNotes({ note, allNotes, onSelect }: { note: Note; allNotes: Note[]; onSelect: (n: Note) => void }) {
  const others = allNotes.filter(n => n.id !== note.id);
  if (others.length === 0) return null;

  // スコアリング（タグ一致 + タイトルキーワード）
  const scored = others.map(n => {
    let score = 0;
    note.tags.forEach(t => { if (n.tags.includes(t)) score += 2; });
    const keywords = note.title.split(/[\s　・。、]+/).filter(k => k.length >= 2);
    keywords.forEach(k => {
      if (n.title.includes(k)) score += 1;
      if (n.content.slice(0, 300).includes(k)) score += 0.5;
    });
    return { note: n, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  if (scored.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-500 mb-2">関連するノート</p>
      <div className="space-y-1.5">
        {scored.map(({ note: related }) => (
          <button key={related.id} onClick={() => onSelect(related)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-orange-50 transition text-left group">
            <svg viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5 shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span className="text-xs text-gray-700 group-hover:text-orange-700 leading-snug line-clamp-1">{related.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── NoteDetail ────────────────────────────────────────────────────────────

function NoteDetail({ note, allNotes, onClose, onMemoSaved, onSelect }: {
  note: Note;
  allNotes: Note[];
  onClose: () => void;
  onMemoSaved: () => void;
  onSelect: (n: Note) => void;
}) {
  // memo is managed by RichMemoEditor; we only need the initial value here
  const initialMemo = useRef(note.memo).current;
  const color = NOTE_TYPE_COLORS[note.type] ?? ORANGE;
  const label = NOTE_TYPE_LABELS[note.type] ?? note.type;

  // Called by RichMemoEditor after its own debounce
  const handleMemoChange = useCallback((html: string) => {
    updateMemo(note.id, html);
    onMemoSaved();
  }, [note.id, onMemoSaved]);

  const updatedAt = new Date(note.updatedAt).toLocaleString("ja-JP", {
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}>

        {/* ヘッダー */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
              style={{ background: color }}>{label}</span>
            <p className="text-sm font-black text-gray-900 leading-snug line-clamp-1">{note.title}</p>
          </div>
          <button onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
              <path d="M1 1l12 12M13 1L1 13"/>
            </svg>
          </button>
        </div>

        {/* コンテンツ（スクロール） */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* タグ */}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {note.tags.map(t => (
                <span key={t} className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: "#FFF7ED", color: ORANGE, border: "1px solid #FED7AA" }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* 保存内容 */}
          <div className="rounded-xl border border-gray-200 px-4 py-3" style={{ background: "#F9FAFB" }}>
            <p className="text-xs font-bold text-gray-400 mb-2">AIの回答内容</p>
            <div className="text-xs text-gray-700 leading-relaxed note-md">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p:      ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                  em:     ({ children }) => <em className="italic">{children}</em>,
                  h2:     ({ children }) => <h2 className="font-black text-gray-900 text-sm mt-3 mb-1 first:mt-0">{children}</h2>,
                  h3:     ({ children }) => <h3 className="font-bold text-gray-800 mt-2 mb-0.5">{children}</h3>,
                  hr:     () => <hr className="my-2 border-gray-300" />,
                  ul:     ({ children }) => <ul className="space-y-0.5 my-1 pl-0">{children}</ul>,
                  ol:     ({ children }) => <ol className="space-y-0.5 my-1 pl-4 list-decimal">{children}</ol>,
                  li:     ({ children }) => (
                    <li className="flex items-start gap-1.5 leading-relaxed">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                      <span>{children}</span>
                    </li>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2 rounded-lg border border-gray-200">
                      <table className="w-full text-xs border-collapse">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead style={{ background: "#1B4332" }}>{children}</thead>,
                  th:    ({ children }) => <th className="px-2 py-1.5 text-left text-white font-bold border-r border-white/20 last:border-r-0">{children}</th>,
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  tr:    ({ children }) => <tr className="even:bg-gray-50 odd:bg-white">{children}</tr>,
                  td:    ({ children }) => <td className="px-2 py-1.5 border-t border-gray-200 border-r border-gray-100 last:border-r-0">{children}</td>,
                }}
              >
                {note.content.slice(0, 2000)}
              </ReactMarkdown>
              {note.content.length > 2000 && <p className="text-gray-400 mt-1">…（続きはノートで確認）</p>}
            </div>
          </div>

          {/* 参考文献 */}
          {note.literature.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 mb-1.5">参考文献</p>
              <div className="space-y-1">
                {note.literature.map((lit, i) => (
                  <p key={i} className="text-xs text-gray-600 leading-snug">
                    {lit.author && <span className="font-semibold">{lit.author} </span>}
                    {lit.title}
                    {lit.year && <span className="text-gray-400"> ({lit.year})</span>}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* 自分のメモエリア（リッチ編集） */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#FFFDE7" }}>
            <div className="px-4 pt-3 pb-2">
              <p className="text-[10px] font-bold text-gray-400 tracking-wide mb-2">自分のメモ</p>
              <RichMemoEditor value={initialMemo} onChange={handleMemoChange} />
            </div>
            <div className="px-4 pb-3">
              <p className="text-[10px] text-gray-400">最終更新：{updatedAt}</p>
            </div>
          </div>

          {/* 関連ノート */}
          <RelatedNotes note={note} allNotes={allNotes} onSelect={onSelect} />
        </div>

      </div>
    </div>
  );
}

// ── EditModal ─────────────────────────────────────────────────────────────

function EditModal({
  note, onSave, onClose,
}: {
  note: Note;
  onSave: (patch: { title: string; memo: string; tags: string[] }) => void;
  onClose: () => void;
}) {
  const [title,    setTitle]    = useState(note.title);
  const [memo,     setMemo]     = useState(note.memo);
  const [tags,     setTags]     = useState<string[]>(note.tags);
  const [tagInput, setTagInput] = useState("");

  const addTag = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags(p => [...p, trimmed]);
    setTagInput("");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <p className="text-base font-black text-gray-900">ノートを編集</p>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
              <path d="M1 1l12 12M13 1L1 13"/>
            </svg>
          </button>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">タイトル</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition"
              style={{ color: "#1A1A1A" }} maxLength={80} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">タグ</label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {tags.map(t => (
                <span key={t} onClick={() => setTags(p => p.filter(x => x !== t))}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer"
                  style={{ background: "#FFF7ED", color: ORANGE, border: "1px solid #FED7AA" }}>
                  {t}
                  <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-2.5 h-2.5">
                    <path d="M1 1l8 8M9 1L1 9"/>
                  </svg>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-400 transition"
                placeholder="タグを追加" />
              <button onClick={() => addTag(tagInput)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: ORANGE }}>追加</button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition">
              キャンセル
            </button>
            <button onClick={() => { if (title.trim()) onSave({ title: title.trim(), memo, tags }); }}
              disabled={!title.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-black text-white hover:opacity-90 transition disabled:opacity-30"
              style={{ background: ORANGE }}>
              保存する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NoteCard ──────────────────────────────────────────────────────────────

function NoteCard({
  note, onEdit, onDelete, onOpen,
}: {
  note: Note; onEdit: (n: Note) => void; onDelete: (id: string) => void; onOpen: (n: Note) => void;
}) {
  const color = NOTE_TYPE_COLORS[note.type] ?? ORANGE;
  const label = NOTE_TYPE_LABELS[note.type] ?? note.type;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      onClick={() => onOpen(note)}>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
            style={{ background: color }}>{label}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-gray-900 leading-snug line-clamp-2">{note.title}</p>
          </div>
        </div>

        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {note.tags.map(t => (
              <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#FFF7ED", color: ORANGE, border: "1px solid #FED7AA" }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {note.memo && (
          <div className="rounded-lg px-2.5 py-2 mb-2 border-l-2" style={{ background: "#FFFDE7", borderLeftColor: ORANGE }}>
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{stripHtml(note.memo)}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-gray-400">
            {new Date(note.createdAt).toLocaleDateString("ja-JP")}
          </span>
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(note)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-400 hover:text-gray-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onClick={() => onDelete(note.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 transition text-gray-400 hover:text-red-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function NotesDictionary() {
  const [notes,      setNotes]      = useState<Note[]>([]);
  const [tab,        setTab]        = useState<Tab>("all");
  const [query,      setQuery]      = useState("");
  const [sortKey,    setSortKey]    = useState<SortKey>("newest");
  const [editNote,   setEditNote]   = useState<Note | null>(null);
  const [detailNote, setDetailNote] = useState<Note | null>(null);
  const [importMsg,  setImportMsg]  = useState<string | null>(null);

  const reload = useCallback(() => setNotes(loadNotes()), []);
  useEffect(() => { reload(); }, [reload]);

  const handleDelete = (id: string) => {
    if (!confirm("このノートを削除しますか？")) return;
    deleteNote(id);
    reload();
    if (detailNote?.id === id) setDetailNote(null);
  };

  const handleEditSave = (patch: { title: string; memo: string; tags: string[] }) => {
    if (!editNote) return;
    updateNote(editNote.id, patch);
    setEditNote(null);
    reload();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const { count } = importNotes(ev.target?.result as string);
        setImportMsg(`${count}件のノートをインポートしました`);
        setTimeout(() => setImportMsg(null), 3000);
        reload();
      } catch {
        setImportMsg("インポートに失敗しました");
        setTimeout(() => setImportMsg(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = notes
    .filter(n => tab === "all" || n.type === tab)
    .filter(n => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.memo.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortKey === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortKey === "type")   return a.type.localeCompare(b.type);
      if (sortKey === "tag")    return (a.tags[0] ?? "").localeCompare(b.tags[0] ?? "");
      return 0;
    });

  return (
    <div>

      {/* 進捗統計 */}
      <ProgressStats notes={notes} />

      {/* AI学習分析 */}
      <AiAnalysisCard notes={notes} onReload={reload} />

      {/* ヘッダー行 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-black text-gray-900">マイノート</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{notes.length}件</span>
          <button onClick={exportNotes}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
            style={{ color: "#888" }}>
            エクスポート
          </button>
          <label className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
            style={{ color: "#888" }}>
            インポート
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      {importMsg && (
        <div className="mb-3 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "#F0FDF4", color: "#16a34a", border: "1px solid #BBF7D0" }}>
          {importMsg}
        </div>
      )}

      {/* タブ */}
      <div className="flex border-b border-gray-100 mb-3 overflow-x-auto">
        {TABS.map(t => {
          const count = t.id === "all" ? notes.length : notes.filter(n => n.type === t.id).length;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="shrink-0 flex-1 py-2.5 text-xs font-bold transition relative"
              style={{ color: active ? ORANGE : "#9CA3AF" }}>
              {active && <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: ORANGE }} />}
              {t.label}
              {count > 0 && (
                <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? ORANGE : "#E5E7EB", color: active ? "white" : "#9CA3AF" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 検索 + 並び替え */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="タイトル・内容・タグで検索"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition"
            style={{ color: "#1A1A1A" }} />
        </div>
        <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none text-gray-600 bg-white">
          <option value="newest">新しい順</option>
          <option value="type">種類別</option>
          <option value="tag">タグ別</option>
        </select>
      </div>

      {/* ノート一覧 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl px-5 py-8 text-center"
          style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
          <p className="text-sm font-bold text-gray-500 mb-1">
            {notes.length === 0 ? "まだノートがありません" : "該当するノートがありません"}
          </p>
          <p className="text-xs text-gray-400">
            {notes.length === 0
              ? "PT専用GPTの回答・治療プラン・文献を保存するとここに表示されます"
              : "検索条件を変えてみてください"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(note => (
            <NoteCard key={note.id} note={note}
              onEdit={n => setEditNote(n)}
              onDelete={handleDelete}
              onOpen={n => setDetailNote(n)} />
          ))}
        </div>
      )}

      {/* 編集モーダル */}
      {editNote && (
        <EditModal note={editNote} onSave={handleEditSave} onClose={() => setEditNote(null)} />
      )}

      {/* 詳細モーダル */}
      {detailNote && (
        <NoteDetail
          note={detailNote}
          allNotes={notes}
          onClose={() => setDetailNote(null)}
          onMemoSaved={reload}
          onSelect={n => setDetailNote(n)}
        />
      )}
    </div>
  );
}
