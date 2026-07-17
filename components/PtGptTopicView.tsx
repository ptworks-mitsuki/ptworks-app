"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { GptIntent, PtGptEvent } from "@/app/api/pt-gpt/route";
import { saveNewNote } from "@/lib/notes";
import { SaveNoteModal, NoteToast } from "@/components/SaveNoteModal";
import { saveRecentTopic, updateRecentTopic, type SavedFollowUp } from "@/lib/recent-topics";
import { recordUsage } from "@/lib/usage-tracker";
import { CURRENT_PLAN, PLAN_LIMIT_YEN } from "@/lib/plan";
import { useWindowUsage } from "@/hooks/useWindowUsage";
import { UsageIndicator } from "@/components/UsageIndicator";
import { UsageLimitModal } from "@/components/UsageLimitModal";

// ── Types ──────────────────────────────────────────────────────────────────

interface FollowUp {
  id: string;
  question: string;
  answer: string;
  loading: boolean;
  error: boolean;
}

// ── Section parsing ────────────────────────────────────────────────────────

interface MarkdownSection {
  title: string;
  content: string;
}

function parseMarkdownSections(text: string): MarkdownSection[] {
  const lines = text.split("\n");
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;
  let preamble = "";

  for (const line of lines) {
    const m = line.match(/^#{1,3}\s+(.+)/);
    if (m) {
      if (current) {
        sections.push({ ...current, content: current.content.trimEnd() });
      } else if (preamble.trim()) {
        sections.push({ title: "", content: preamble.trimEnd() });
        preamble = "";
      }
      current = { title: m[1], content: "" };
    } else if (current) {
      current.content += line + "\n";
    } else {
      preamble += line + "\n";
    }
  }
  if (current) sections.push({ ...current, content: current.content.trimEnd() });
  else if (preamble.trim()) sections.push({ title: "", content: preamble.trimEnd() });

  return sections.filter(s => s.content.trim() || s.title);
}

function stripSuggestions(text: string): string {
  const markerRe = /\n---+\s*\n\s*💡[^\n]*/;
  const idx = markerRe.exec(text)?.index;
  return idx !== undefined ? text.slice(0, idx).trimEnd() : text;
}

// ── SSE streaming ──────────────────────────────────────────────────────────

async function streamGptResponse(opts: {
  query: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  onChunk: (text: string) => void;
  onIntent: (intent: GptIntent) => void;
  onUsage?: (inputTokens: number, outputTokens: number) => void;
  onDone: () => void;
  onError: (msg: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const { query, history, onChunk, onIntent, onUsage, onDone, onError, signal } = opts;
  const res = await fetch("/api/pt-gpt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, history }),
    signal,
  });

  if (!res.ok || !res.body) { onError("通信エラーが発生しました。"); return; }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const ev = JSON.parse(line.slice(6)) as PtGptEvent;
        if      (ev.type === "intent") onIntent(ev.intent);
        else if (ev.type === "chunk")  onChunk(ev.text);
        else if (ev.type === "usage")  onUsage?.(ev.inputTokens, ev.outputTokens);
        else if (ev.type === "done")   onDone();
        else if (ev.type === "error")  onError(ev.error);
      } catch { /* ignore */ }
    }
  }
}

// ── Markdown renderer ──────────────────────────────────────────────────────

// Strip legacy [Lv.X ...] badge markers from saved data
function stripLevels(text: string): string {
  return text.replace(/\s*\[Lv\.[ABCD][^\]]*\]/g, "");
}

function MdBody({ text }: { text: string }) {
  text = stripLevels(text);
  return (
    <div className="w-full min-w-0 overflow-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => (
            <p className="text-sm text-gray-800 leading-relaxed mb-2 last:mb-0 w-full" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
              {children}
            </p>
          ),
          strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
          em:     ({ children }) => <em className="italic text-gray-700">{children}</em>,
          h2: ({ children }) => <h2 className="text-sm font-black text-gray-900 mt-4 mb-1.5 first:mt-0" style={{ overflowWrap: "anywhere" }}>{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold text-gray-800 mt-3 mb-1" style={{ overflowWrap: "anywhere" }}>{children}</h3>,
          hr: () => <hr className="my-3 border-gray-200" />,
          ul: ({ children }) => <ul className="space-y-1 my-2 pl-0 w-full">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-1 my-2 pl-4 list-decimal w-full">{children}</ol>,
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-sm text-gray-800 leading-relaxed w-full min-w-0">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
              <span className="min-w-0 flex-1" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-3 my-2 text-sm text-gray-600 italic" style={{ overflowWrap: "anywhere" }}>{children}</blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 w-full">
              <table className="text-xs border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-gray-200 bg-gray-50 px-2 py-1.5 text-left font-bold text-gray-800 break-words">{children}</th>,
          td: ({ children }) => <td className="border border-gray-200 px-2 py-1.5 text-gray-700 break-words">{children}</td>,
          code: ({ children, className }) => {
            const isBlock = className?.startsWith("language-");
            return isBlock
              ? <pre className="bg-gray-900 text-green-300 text-xs p-3 rounded-xl my-3 overflow-x-auto w-full"><code>{children}</code></pre>
              : <code className="bg-gray-100 text-gray-800 text-xs px-1.5 py-0.5 rounded font-mono break-all">{children}</code>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

// ── References section ────────────────────────────────────────────────────

interface LitDetail {
  summaryJa:          string;
  clinicalPoints:     string[];
  evidenceLevel:      string;
  evidenceLevelReason: string;
}

function RefDetailCard({ citation }: { citation: string }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail,  setDetail]  = useState<LitDetail | null>(null);
  const [error,   setError]   = useState("");
  const [saved,   setSaved]   = useState(false);
  const [toast,   setToast]   = useState(false);

  const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(citation.slice(0, 80))}`;

  const handleToggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (detail || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/literature-detail", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ citation }),
      });
      const data = await res.json() as LitDetail & { error?: string };
      if (data.error) throw new Error(data.error);
      setDetail(data);
    } catch (e) {
      setError((e instanceof Error ? e.message : null) ?? "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (saved || !detail) return;
    saveNewNote({
      type:    "literature",
      title:   citation.slice(0, 60),
      content: [
        `文献：${citation}`,
        "",
        `エビデンスレベル：${detail.evidenceLevel}（${detail.evidenceLevelReason}）`,
        "",
        "AI日本語要約：",
        detail.summaryJa,
        "",
        "臨床ポイント：",
        ...detail.clinicalPoints.map(p => `・${p}`),
        "",
        `PubMed: ${pubmedUrl}`,
      ].join("\n"),
      memo: "",
      tags: ["文献", `Lv.${detail.evidenceLevel}`],
      literature: [{
        title:              citation,
        author:             "",
        year:               "",
        aiDetailedSummary:  detail.summaryJa,
        clinicalPoints:     detail.clinicalPoints,
      }],
    });
    setSaved(true);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-xs font-bold shadow-lg"
          style={{ background: "#1B4332" }}>
          ノートに保存しました
        </div>
      )}
      <div className="px-3 py-2.5 flex items-start justify-between gap-2 bg-gray-50">
        <p className="text-xs text-gray-600 leading-relaxed flex-1 min-w-0 break-words">{citation}</p>
        <button
          onClick={handleToggle}
          className="shrink-0 flex items-center gap-1 text-[11px] font-bold transition whitespace-nowrap"
          style={{ color: "#E85D04" }}
        >
          {open ? "閉じる ▲" : "詳しく見る ▼"}
        </button>
      </div>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 py-3">
              <span className="w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin shrink-0" />
              <span className="text-xs text-gray-400">文献情報を読み込み中...</span>
            </div>
          )}
          {error && <p className="text-xs text-red-500 py-2">{error}</p>}
          {detail && (
            <>
              <div className="rounded-xl px-3 py-3" style={{ background: "#F9FAFB" }}>
                <p className="text-xs font-bold text-gray-500 mb-1.5">AI日本語要約</p>
                <p className="text-xs text-gray-700 leading-relaxed">{detail.summaryJa}</p>
              </div>
              <div className="border-l-4 pl-3 py-1" style={{ borderLeftColor: "#E85D04" }}>
                <p className="text-xs font-bold mb-1.5" style={{ color: "#E85D04" }}>臨床ポイント</p>
                <ul className="space-y-1">
                  {detail.clinicalPoints.map((pt, i) => (
                    <li key={i} className="text-xs text-gray-700 leading-relaxed">・{pt}</li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <a href={pubmedUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold transition hover:opacity-70"
                  style={{ color: "#E85D04" }}>
                  PubMedで確認
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition"
                  style={{
                    borderColor: saved ? "#E85D04" : "#E5E7EB",
                    color:       saved ? "#E85D04" : "#6B7280",
                    background:  saved ? "#FFF7ED" : "#fff",
                  }}>
                  {saved ? "保存済み" : "ノートに保存"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReferencesSection({ content }: { content: string }) {
  const lines = content
    .split("\n")
    .map(l => l.replace(/^[-*\d+.]+\s*/, "").trim())
    .filter(Boolean);

  if (lines.length === 0) return <MdBody text={content} />;

  return (
    <div>
      <p className="text-[11px] leading-relaxed mb-2.5" style={{ color: "#9CA3AF" }}>
        AIがこのテーマに関連が深いと判断した情報です。必ずしも本文全ての内容の直接的な根拠ではありません。学会発表や正式な引用の際は必ず原典をご自身でご確認ください。
      </p>
      <div className="space-y-2.5">
        {lines.map((ref, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-xs text-gray-400 mt-1 shrink-0 w-4">{i + 1}.</span>
            <div className="flex-1 min-w-0">
              <RefDetailCard citation={ref} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const IS_REFS_TITLE = (title: string) => /^参考|^関連情報/.test(title);

// ── Follow-up answer (parses sections, treats 参考資料 specially) ──────────

function FollowUpAnswer({ text }: { text: string }) {
  const sections = parseMarkdownSections(text);
  const hasRefs  = sections.some(s => IS_REFS_TITLE(s.title));

  if (!hasRefs) return <MdBody text={text} />;

  return (
    <>
      {sections.map((sec, i) => (
        <div key={i} className="mb-3 last:mb-0">
          {sec.title && (
            <h2 className="text-sm font-black text-gray-900 mb-2 mt-3 first:mt-0 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full shrink-0" style={{ background: "#E85D04" }} />
              {refsDisplayTitle(sec.title)}
            </h2>
          )}
          {IS_REFS_TITLE(sec.title) ? (
            <ReferencesSection content={sec.content} />
          ) : (
            <MdBody text={sec.content} />
          )}
        </div>
      ))}
    </>
  );
}

function refsDisplayTitle(title: string): string {
  return IS_REFS_TITLE(title) ? "関連情報（AI選定）" : title;
}

// ── Intent label ──────────────────────────────────────────────────────────

const INTENT_LABELS: Record<GptIntent, string> = {
  disease: "疾患・医療知識",
  consult: "臨床相談",
  career:  "キャリア",
  service: "PT Worksのサービス",
};

// ── Main component ─────────────────────────────────────────────────────────

interface PtGptTopicViewProps {
  initialQuery: string;
  preloadedAnswer?: string;
  preloadedIntent?: GptIntent;
  preloadedFollowUps?: SavedFollowUp[];
  preloadedId?: string;
  onBack?: () => void;
}

export function PtGptTopicView({
  initialQuery,
  preloadedAnswer,
  preloadedIntent,
  preloadedFollowUps,
  preloadedId,
  onBack,
}: PtGptTopicViewProps) {
  const router = useRouter();

  // Lock all props permanently on mount
  const queryRef     = useRef(initialQuery);
  const preloadedRef = useRef({ answer: preloadedAnswer, intent: preloadedIntent, followUps: preloadedFollowUps });
  // If restoring from cache, we already have a saved ID — skip re-saving
  const savedTopicIdRef = useRef<string | null>(preloadedId ?? null);

  // Main answer
  const [mainRaw,     setMainRaw]     = useState("");
  const [mainLoading, setMainLoading] = useState(true);
  const [mainError,   setMainError]   = useState("");
  const [mainIntent,  setMainIntent]  = useState<GptIntent | null>(null);

  // Think buttons
  const [thinkButtons, setThinkButtons] = useState<string[]>([]);
  const [thinkLoading, setThinkLoading] = useState(false);
  const fetchedThink = useRef(false);

  // Follow-up Q&As（キャッシュから復元する場合は初期値を設定）
  const [followUps, setFollowUps] = useState<FollowUp[]>(() =>
    (preloadedFollowUps ?? []).map(f => ({ ...f, loading: false, error: false }))
  );
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Usage limit modal
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { isBlocked, refresh: refreshUsage } = useWindowUsage();

  // Save modal
  const [showSave,   setShowSave]   = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // Delete state
  const [mainDeleted,       setMainDeleted]       = useState(false);
  const [deletedFollowUpIds, setDeletedFollowUpIds] = useState<Set<string>>(new Set());
  const [undoToast, setUndoToast] = useState<{ type: "main" | "fu"; fuId?: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showUndoToast = (payload: { type: "main" | "fu"; fuId?: string }) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast(payload);
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 2000);
  };

  const handleDeleteMain = () => {
    setMainDeleted(true);
    showUndoToast({ type: "main" });
  };

  const handleDeleteFollowUp = (id: string) => {
    setDeletedFollowUpIds(prev => new Set([...prev, id]));
    showUndoToast({ type: "fu", fuId: id });
  };

  const handleUndo = () => {
    if (!undoToast) return;
    if (undoToast.type === "main") setMainDeleted(false);
    else if (undoToast.fuId) setDeletedFollowUpIds(prev => { const s = new Set(prev); s.delete(undoToast.fuId!); return s; });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast(null);
  };

  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Fetch main answer (once on mount) ─────────────────────────────────

  useEffect(() => {
    // Preloaded path: restore cached answer immediately, no AI call
    if (preloadedRef.current.answer) {
      setMainRaw(preloadedRef.current.answer);
      if (preloadedRef.current.intent) setMainIntent(preloadedRef.current.intent);
      setMainLoading(false);
      return;
    }

    const ctrl = new AbortController();
    streamGptResponse({
      query:    queryRef.current,
      history:  [],
      onChunk:  text => setMainRaw(prev => prev + text),
      onIntent: intent => setMainIntent(intent),
      onUsage:  (inp, out) => { recordUsage(inp, out); refreshUsage(); },
      onDone:   () => setMainLoading(false),
      onError:  err => { setMainError(err); setMainLoading(false); },
      signal:   ctrl.signal,
    }).catch(e => {
      if ((e as Error).name !== "AbortError") {
        setMainError("エラーが発生しました。");
        setMainLoading(false);
      }
    });
    return () => ctrl.abort();
  }, []);

  // ── 回答完了時にローカルストレージへ保存（新規のみ） ────────────────────

  useEffect(() => {
    if (mainLoading || !mainRaw || mainError) return;
    if (savedTopicIdRef.current) return; // 復元時はスキップ
    const id = `topic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    savedTopicIdRef.current = id;
    saveRecentTopic({
      id,
      title:     queryRef.current.slice(0, 20),
      query:     queryRef.current,
      answer:    mainRaw,
      intent:    mainIntent,
      followUps: [],
      memo:      "",
      savedAt:   new Date().toISOString(),
    });
  }, [mainLoading, mainRaw, mainError, mainIntent]);

  // ── フォローアップ完了時に保存データを更新 ──────────────────────────────

  useEffect(() => {
    if (!savedTopicIdRef.current) return;
    const completed: SavedFollowUp[] = followUps
      .filter(f => !f.loading && !f.error && f.answer)
      .map(({ id, question, answer }) => ({ id, question, answer }));
    if (completed.length === 0) return;
    updateRecentTopic(savedTopicIdRef.current, { followUps: completed });
  }, [followUps]);

  // ── Think buttons after answer completes ──────────────────────────────

  useEffect(() => {
    if (mainLoading || !mainRaw || fetchedThink.current) return;
    fetchedThink.current = true;
    setThinkLoading(true);
    void fetch("/api/gpt-think", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ content: stripSuggestions(mainRaw).slice(0, 1200) }),
    })
      .then(r => r.json() as Promise<{ buttons: string[] }>)
      .then(d  => setThinkButtons(d.buttons ?? []))
      .finally(() => setThinkLoading(false));
  }, [mainLoading, mainRaw]);


  // ── Submit follow-up ──────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const q = inputValue.trim();
    if (!q || submitting) return;

    // Block if 3-hr usage limit reached (paid plans only)
    if (PLAN_LIMIT_YEN[CURRENT_PLAN] !== null && isBlocked) {
      setShowLimitModal(true);
      return;
    }

    const newFu: FollowUp = {
      id: `fu-${Date.now()}`,
      question: q,
      answer: "",
      loading: true,
      error: false,
    };

    setFollowUps(prev => [...prev, newFu]);
    setInputValue("");
    setSubmitting(true);

    const displayAnswer = stripSuggestions(mainRaw);
    const history: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user",      content: queryRef.current },
      { role: "assistant", content: displayAnswer },
      ...followUps.filter(f => !f.loading && !f.error).flatMap(f => ([
        { role: "user"      as const, content: f.question },
        { role: "assistant" as const, content: f.answer },
      ])),
    ];

    try {
      await streamGptResponse({
        query: q,
        history,
        onChunk: chunk => setFollowUps(prev =>
          prev.map(f => f.id === newFu.id ? { ...f, answer: f.answer + chunk } : f)
        ),
        onIntent: _i => {},
        onUsage: (inp, out) => { recordUsage(inp, out); refreshUsage(); },
        onDone: () => {
          setFollowUps(prev => prev.map(f => f.id === newFu.id ? { ...f, loading: false } : f));
          setSubmitting(false);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        },
        onError: err => {
          setFollowUps(prev => prev.map(f =>
            f.id === newFu.id ? { ...f, loading: false, error: true, answer: err } : f
          ));
          setSubmitting(false);
        },
      });
    } catch {
      setSubmitting(false);
    }
  }, [inputValue, submitting, mainRaw, followUps]);

  // ── Build note content for saving ─────────────────────────────────────

  const displayAnswer = stripSuggestions(mainRaw);
  const sections = displayAnswer ? parseMarkdownSections(displayAnswer) : [];

  const buildContent = () => {
    const parts: string[] = [];
    if (!mainDeleted) parts.push(`# ${queryRef.current}\n\n${displayAnswer}`);
    for (const fu of followUps.filter(f => !f.loading && !f.error && !deletedFollowUpIds.has(f.id))) {
      parts.push(`**Q: ${fu.question}**\n\n${fu.answer}`);
    }
    return parts.join("\n\n---\n\n");
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-white w-full overflow-hidden" style={{ height: "100dvh" }}>

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={onBack ?? (() => router.back())}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div style={{ borderLeft: "4px solid #E85D04", paddingLeft: 12 }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: "#111", margin: 0, lineHeight: 1.2 }}>
                PT<span style={{ color: "#E85D04" }}>専用GPT</span>
              </p>
              <p style={{ fontSize: 11, color: "#6B7280", margin: "1px 0 0" }}>疾患・臨床・キャリアまで何でも</p>
            </div>
          </div>

          {/* Header save button */}
          {!mainLoading && !mainError && (
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <button
                onClick={() => setShowSave(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white transition hover:opacity-90"
                style={{ background: "#1B4332" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                保存
              </button>
              {!savedToast && (
                <p className="text-[9px] text-gray-400 leading-none">気になる内容を保存・後で復習</p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 3-hr usage indicator (paid plans only) */}
      <UsageIndicator />

      {/* Scrollable content — pb-24 leaves room for bottom input bar */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24 min-w-0 w-full">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-4 w-full min-w-0">

          {/* Question chip */}
          <div className="mb-4">
            <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#E85D04" }}>
                あなたの質問
              </p>
              <p className="text-sm font-semibold text-gray-900 leading-relaxed">{queryRef.current}</p>
            </div>
          </div>

          {/* Main answer card */}
          {!mainDeleted && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">

            <div className="flex items-center justify-between border-b border-gray-100" style={{ background: "#FAFAFA" }}>
              {mainIntent && mainIntent !== "service" ? (
                <div className="px-4 pt-3 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {INTENT_LABELS[mainIntent]}
                  </span>
                </div>
              ) : <div />}
              {!mainLoading && !mainError && (
                <button
                  onClick={handleDeleteMain}
                  className="group w-8 h-8 flex items-center justify-center rounded-full transition mr-1 my-1"
                  title="この回答を削除"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4 text-gray-300 group-hover:text-red-400 transition-colors">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Loading placeholder */}
            {mainLoading && !displayAnswer && (
              <div className="px-4 py-6 flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin inline-block" />
                <span className="text-sm text-gray-400">回答を生成中...</span>
              </div>
            )}

            {mainError && (
              <div className="px-4 py-4 text-sm text-red-500">{mainError}</div>
            )}

            {/* Sections */}
            {sections.length > 0 ? (
              <div>
                {sections.map((sec, i) => (
                  <div key={i} className="px-4 py-4 border-b border-gray-50 last:border-b-0">
                    {sec.title && (
                      <h2 className="text-sm font-black text-gray-900 mb-2 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full shrink-0" style={{ background: "#E85D04" }} />
                        {refsDisplayTitle(sec.title)}
                      </h2>
                    )}
                    {IS_REFS_TITLE(sec.title) ? (
                      <ReferencesSection content={sec.content} />
                    ) : (
                      <MdBody text={sec.content} />
                    )}
                  </div>
                ))}

                {/* Streaming cursor */}
                {mainLoading && (
                  <div className="px-4 pb-3">
                    <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse align-text-bottom" />
                  </div>
                )}
              </div>
            ) : mainLoading && displayAnswer ? (
              <div className="px-4 py-4">
                <MdBody text={displayAnswer} />
                <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse align-text-bottom" />
              </div>
            ) : null}

          </div>
          )} {/* end !mainDeleted */}

          {/* Think buttons */}
          {!mainLoading && !mainError && (
            <div className="mb-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">思考を深める</p>
              {thinkLoading ? (
                <div className="flex items-center gap-2 py-1">
                  <span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-orange-400 rounded-full animate-spin inline-block" />
                  <span className="text-xs text-gray-400">思考質問を生成中...</span>
                </div>
              ) : thinkButtons.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {thinkButtons.map((btn, i) => (
                    <button key={i}
                      onClick={() => { setInputValue(btn); inputRef.current?.focus(); }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition hover:opacity-80 active:scale-95"
                      style={{ borderColor: "#E85D04", color: "#E85D04", background: "#fff" }}>
                      {btn}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Follow-up Q&As */}
          {followUps.filter(fu => !deletedFollowUpIds.has(fu.id)).map(fu => (
            <div key={fu.id} className="mb-4">
              {/* Question bubble */}
              <div className="flex justify-end mb-2">
                <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed"
                  style={{ background: "#E85D04" }}>
                  {fu.question}
                </div>
              </div>

              {/* Answer card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Card header with delete button */}
                {!fu.loading && !fu.error && (
                  <div className="flex justify-end" style={{ background: "#FAFAFA", borderBottom: "1px solid #F3F4F6" }}>
                    <button
                      onClick={() => handleDeleteFollowUp(fu.id)}
                      className="group w-8 h-8 flex items-center justify-center rounded-full transition mr-1 my-1"
                      title="この回答を削除"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4 text-gray-300 group-hover:text-red-400 transition-colors">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                )}
                <div className="px-4 py-4">
                  {fu.loading && !fu.answer ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin inline-block" />
                      <span className="text-sm text-gray-400">回答を生成中...</span>
                    </div>
                  ) : fu.error ? (
                    <p className="text-sm text-red-500">{fu.answer || "エラーが発生しました。"}</p>
                  ) : (
                    <>
                      <FollowUpAnswer text={stripSuggestions(fu.answer)} />
                      {fu.loading && (
                        <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse ml-0.5 align-text-bottom" />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* Fixed bottom input bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-30"
        style={{ boxShadow: "0 -2px 8px rgba(0,0,0,0.06)" }}>
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <div className="flex-1 rounded-2xl border border-gray-200 overflow-hidden transition-colors focus-within:border-orange-400">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSubmit(); }
              }}
              placeholder="疾患名・術式・症状・臨床の疑問を入力"
              rows={2}
              className="w-full px-4 py-3 text-sm bg-transparent outline-none resize-none placeholder-gray-400"
              style={{ color: "#1A1A1A", maxHeight: 120 }}
              disabled={mainLoading || submitting}
            />
          </div>
          <button
            onClick={() => void handleSubmit()}
            disabled={!inputValue.trim() || mainLoading || submitting}
            className="w-11 h-11 rounded-xl flex items-center justify-center transition hover:opacity-90 active:scale-95 disabled:opacity-40 shrink-0"
            style={{ background: "#E85D04" }}
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Save modal */}
      {showSave && (
        <SaveNoteModal
          type="gpt"
          defaultTitle={queryRef.current.slice(0, 40)}
          content={buildContent()}
          onSave={({ title, memo, tags }) => {
            saveNewNote({
              type:       "gpt",
              title,
              content:    buildContent(),
              memo,
              tags,
              literature: [],
            });
            setSavedToast(true);
            setShowSave(false);
            setTimeout(() => setSavedToast(false), 2500);
          }}
          onCancel={() => setShowSave(false)}
        />
      )}

      <NoteToast visible={savedToast} />

      {/* Undo toast */}
      {undoToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full shadow-lg text-sm font-bold"
          style={{ background: "#374151", color: "#fff", whiteSpace: "nowrap" }}>
          <span>削除しました</span>
          <button
            onClick={handleUndo}
            className="text-orange-300 hover:text-orange-200 transition font-black underline underline-offset-2"
          >
            元に戻す
          </button>
        </div>
      )}

      {showLimitModal && <UsageLimitModal onClose={() => setShowLimitModal(false)} />}
    </div>
  );
}
