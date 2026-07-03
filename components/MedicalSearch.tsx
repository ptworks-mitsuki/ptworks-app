"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  NewSectionKey, NEW_SECTION_ORDER, NEW_SECTION_TITLES, NEW_SECTION_COLORS,
  Suggestion,
} from "@/types/medical";
import { ComedicalSection } from "./ComedicalSection";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useSearchCache } from "@/hooks/useSearchCache";
import { useFavorites } from "@/hooks/useFavorites";
import type { ResolveResult } from "@/app/api/suggest/route";

// ─── Types ────────────────────────────────────────────────────────────────

type Phase = "idle" | "resolving" | "candidates" | "results";

type SseEvent =
  | { type: "section_start"; key: NewSectionKey; step: 1 | 2 }
  | { type: "text";          key: NewSectionKey; text: string; step: 1 | 2 }
  | { type: "section_end";   key: NewSectionKey; step: 1 | 2 }
  | { type: "done";          step: 1 | 2 }
  | { type: "error"; error: string };

interface ParsedRef {
  citation: string;
  level:    string;
  keyword:  string;
}

const MAX_RETRIES    = 3;
const SLOW_WARNING_MS = 30_000;

const LOADING_MESSAGES = [
  (d: string) => `${d}について文献・教科書をもとに整理しています...`,
  ()          => "文献を確認しています...",
  ()          => "臨床情報を整理しています...",
  ()          => "もうすぐ表示されます...",
];

const QUICK_SEARCHES = [
  "脳梗塞", "変形性膝関節症", "腰部脊柱管狭窄症", "パーキンソン病",
  "慢性閉塞性肺疾患", "骨粗鬆症", "肩関節周囲炎", "糖尿病性神経障害",
];

// ─── Ref parser ────────────────────────────────────────────────────────────

const REF_DELIMITER = "|||REF|||";

function parseRefs(raw: string): ParsedRef[] {
  return raw.trim().split("\n").filter(Boolean).map(line => {
    const parts = line.split("|").map(s => s.trim());
    // parts[0]=書籍タイトル, parts[1]=著者・出版社, parts[2]=検索キーワード
    return { citation: parts[0] ?? line, level: parts[1] ?? "", keyword: parts[2] ?? "" };
  });
}

function splitStep2Text(text: string): { detail: string; refs: ParsedRef[] } {
  const idx = text.indexOf(REF_DELIMITER);
  if (idx === -1) return { detail: text, refs: [] };
  return {
    detail: text.slice(0, idx).trim(),
    refs:   parseRefs(text.slice(idx + REF_DELIMITER.length)),
  };
}

// ─── Term popup ───────────────────────────────────────────────────────────

interface TermPopupState {
  term:        string;
  disease:     string;
  explanation: string | null;
  loading:     boolean;
}

function TermPopup({ state, onClose }: { state: TermPopupState; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={onClose} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-black text-gray-900 leading-tight pr-2">{state.term}</h3>
          <button onClick={onClose} className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition" aria-label="閉じる">×</button>
        </div>
        {state.loading ? (
          <div className="flex items-center gap-2 py-2">
            <span className="inline-block w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin shrink-0" />
            <span className="text-sm text-gray-500">説明を取得中...</span>
          </div>
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{state.explanation}</p>
        )}
        <p className="text-[10px] text-gray-400 mt-4">タップした単語：{state.term}</p>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "#E85D04" : "none"} stroke={filled ? "#E85D04" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 transition-all duration-150" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function LoadingMessages({ disease }: { disease: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % LOADING_MESSAGES.length), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2 px-1 print:hidden">
      <span className="inline-block w-3.5 h-3.5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin shrink-0" />
      <p className="text-xs text-gray-500">{LOADING_MESSAGES[idx](disease)}</p>
    </div>
  );
}

function RefBlock({ refs }: { refs: ParsedRef[] }) {
  if (refs.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl overflow-hidden" style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
        <svg className="w-3 h-3 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">参考</span>
      </div>
      <div className="px-3 py-2 space-y-2">
        {refs.map((ref, i) => (
          <div key={i}>
            <p className="text-[11px] font-semibold text-gray-700 leading-snug">{ref.citation}</p>
            {ref.level && <p className="text-[10px] text-gray-400 mt-0.5">{ref.level}</p>}
            {ref.keyword && (
              <a
                href={`/stage1/literature?q=${encodeURIComponent(ref.keyword)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[11px] font-semibold transition hover:opacity-80"
                style={{ color: "#E85D04" }}
              >
                参考書で詳しく見る →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// [[term]] → tappable span を含むテキストを markdown 前処理する
function preprocessTerms(raw: string, color: string, onTermClick: (t: string) => void): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      const segment = raw.slice(last, m.index);
      parts.push(
        <ReactMarkdown key={i++}
          components={{
            p: ({ children }) => <span>{children}</span>,
            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
          }}>
          {segment}
        </ReactMarkdown>,
      );
    }
    const term = m[1];
    parts.push(
      <button key={i++} onClick={() => onTermClick(term)}
        className="font-semibold underline decoration-dotted underline-offset-2 active:opacity-60 transition-opacity"
        style={{ color }} type="button">
        {term}
      </button>,
    );
    last = m.index + m[0].length;
  }
  if (last < raw.length) {
    const segment = raw.slice(last);
    parts.push(
      <ReactMarkdown key={i++}
        components={{
          p: ({ children }) => <span>{children}</span>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}>
        {segment}
      </ReactMarkdown>,
    );
  }
  return <>{parts}</>;
}

function MdContent({ text, color, onTermClick }: { text: string; color: string; onTermClick: (t: string) => void }) {
  // [[term]] を一時プレースホルダーで置き換えてから markdown レンダリング
  const placeholders = new Map<string, string>();
  let pi = 0;
  const escaped = text.replace(/\[\[([^\]]+)\]\]/g, (_, term: string) => {
    const id = `TERMPLACEHOLDER${pi++}`;
    placeholders.set(id, term);
    return id;
  });

  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="text-sm text-gray-800 leading-relaxed mb-1.5 last:mb-0">{replaceTerms(children, placeholders, color, onTermClick)}</p>,
        strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
        h2: ({ children }) => <h2 className="text-sm font-black text-gray-900 mt-3 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold text-gray-800 mt-2 mb-0.5">{children}</h3>,
        hr: () => <hr className="my-2 border-gray-200" />,
        ul: ({ children }) => <ul className="space-y-1 my-1.5 pl-0">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-1 my-1.5 pl-4 list-decimal">{children}</ol>,
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-sm text-gray-800 leading-relaxed">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
            <span>{children}</span>
          </li>
        ),
      }}
    >
      {escaped}
    </ReactMarkdown>
  );
}

function replaceTerms(
  children: React.ReactNode,
  placeholders: Map<string, string>,
  color: string,
  onTermClick: (t: string) => void,
): React.ReactNode {
  if (typeof children !== "string") return children;
  const parts: React.ReactNode[] = [];
  let remaining = children;
  let i = 0;
  for (const [id, term] of placeholders) {
    const idx = remaining.indexOf(id);
    if (idx === -1) continue;
    if (idx > 0) parts.push(<span key={i++}>{remaining.slice(0, idx)}</span>);
    parts.push(
      <button key={i++} onClick={() => onTermClick(term)}
        className="font-semibold underline decoration-dotted underline-offset-2 active:opacity-60 transition-opacity"
        style={{ color }} type="button">
        {term}
      </button>,
    );
    remaining = remaining.slice(idx + id.length);
  }
  if (remaining) parts.push(<span key={i++}>{remaining}</span>);
  return parts.length > 0 ? <>{parts}</> : children;
}

function SectionCard({
  title, summary, detail, refs, color, sectionKey,
  isStep1Active, isStep1Done, showSkeleton,
  step2Loading, step2Done,
  onTermClick,
}: {
  title:         string;
  summary:       string;
  detail:        string;
  refs:          ParsedRef[];
  color:         string;
  sectionKey:    NewSectionKey;
  isStep1Active: boolean;
  isStep1Done:   boolean;
  showSkeleton:  boolean;
  step2Loading:  boolean;
  step2Done:     boolean;
  onTermClick:   (term: string) => void;
}) {
  const step1HasContent = summary.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100">
        <div className="w-1 h-5 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-sm font-bold text-gray-900 flex-1">{title}</span>
        {isStep1Active && (
          <span className="flex gap-0.5 shrink-0">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#E85D04", animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        )}
        {isStep1Done && !isStep1Active && (
          <span className="text-[10px] text-green-500 font-bold shrink-0">完了</span>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {/* Step 1: Summary */}
        {showSkeleton ? (
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-3/5" />
          </div>
        ) : (
          <div>
            <MdContent text={summary} color={color} onTermClick={onTermClick} />
            {isStep1Active && (
              <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse ml-0.5 align-text-bottom" aria-hidden="true" />
            )}
          </div>
        )}

        {/* Step 2: Detail — shown only after fully done */}
        {step1HasContent && (
          <>
            {step2Loading && !step2Done && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <span className="inline-block w-3 h-3 border border-gray-300 border-t-blue-400 rounded-full animate-spin shrink-0" />
                詳細を読み込み中...
              </div>
            )}
            {step2Done && detail && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <MdContent text={detail} color={color} onTermClick={onTermClick} />
              </div>
            )}
            {step2Done && refs.length > 0 && <RefBlock refs={refs} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Error helpers ─────────────────────────────────────────────────────────

function classifyError(err: unknown): string {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (m.includes("401") || m.includes("maintenance")) return "現在メンテナンス中です。しばらくお待ちください。";
  if (m.includes("402") || m.includes("429") || m.includes("529") || m.includes("overload"))
    return "現在アクセスが集中しています。しばらくお待ちください。";
  if (m.includes("timeout") || m.includes("timed out")) return "通信に時間がかかっています。";
  if (/[ぁ-ん]/.test(m) || /[ァ-ン]/.test(m)) return err instanceof Error ? err.message : String(err);
  return "現在メンテナンス中です。しばらくお待ちください。";
}

function isRetryableClient(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return m.includes("429") || m.includes("529") || m.includes("overload") ||
         m.includes("timeout") || m.includes("fetch failed") || m.includes("network");
}

// ─── Export helpers ────────────────────────────────────────────────────────

function formatAsText(disease: string, texts: Record<string, string>): string {
  const lines = [`【${disease}】`, `生成日時：${new Date().toLocaleString("ja-JP")}`, ""];
  for (const key of NEW_SECTION_ORDER) {
    const text = texts[key];
    if (!text) continue;
    lines.push(`■ ${NEW_SECTION_TITLES[key]}`);
    lines.push(text.replace(/\[\[([^\]]+)\]\]/g, "$1"));
    lines.push("");
  }
  lines.push("※ 本情報は文献・論文をもとに整理した情報です。臨床判断は専門家の責任において行ってください。");
  return lines.join("\n");
}

// ─── Main component ────────────────────────────────────────────────────────

export function MedicalSearch() {
  const [query,       setQuery]       = useState("");
  const [phase,       setPhase]       = useState<Phase>("idle");
  const [candidates,  setCandidates]  = useState<Suggestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error,       setError]       = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);

  const [termPopup, setTermPopup] = useState<TermPopupState | null>(null);

  // Step 1 state
  const [disease,            setDisease]            = useState<string | null>(null);
  const [step1Texts,         setStep1Texts]         = useState<Record<string, string>>({});
  const [step1CurrentSec,    setStep1CurrentSec]    = useState<NewSectionKey | null>(null);
  const [step1CompletedSecs, setStep1CompletedSecs] = useState<Set<NewSectionKey>>(new Set());
  const [step1Streaming,     setStep1Streaming]     = useState(false);
  const [step1Done,          setStep1Done]          = useState(false);
  const [fromCache,          setFromCache]          = useState(false);
  const [showComplete,       setShowComplete]       = useState(false);
  const [slowWarning,        setSlowWarning]        = useState(false);
  const [retrying,           setRetrying]           = useState(false);
  const [retryCount,         setRetryCount]         = useState(0);

  // Step 2 state
  const [step2RawTexts,      setStep2RawTexts]      = useState<Record<string, string>>({});
  const [step2CurrentSec,    setStep2CurrentSec]    = useState<NewSectionKey | null>(null);
  const [step2CompletedSecs, setStep2CompletedSecs] = useState<Set<NewSectionKey>>(new Set());
  const [step2Streaming,     setStep2Streaming]     = useState(false);
  const [step2Done,          setStep2Done]          = useState(false);
  const [step2Error,         setStep2Error]         = useState(false);

  // Multi-disease
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [tabDiseases,      setTabDiseases]      = useState<string[]>([]);
  const [activeDiseaseIdx, setActiveDiseaseIdx] = useState(0);

  const { history, addHistory, removeHistory, clearHistory } = useSearchHistory();
  const cache  = useSearchCache();
  const { isFavorited, toggleFavorite } = useFavorites();
  const inputRef      = useRef<HTMLInputElement>(null);
  const abortRef      = useRef<AbortController | null>(null);
  const abort2Ref     = useRef<AbortController | null>(null);
  const slowTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const step1TextsRef = useRef<Record<string, string>>({});
  const step2TextsRef = useRef<Record<string, string>>({});

  const diseaseResultsRef = useRef<Record<string, {
    step1Texts: Record<string, string>;
    step2RawTexts: Record<string, string>;
    step2Done: boolean;
  }>>({});

  useEffect(() => { step1TextsRef.current = step1Texts; }, [step1Texts]);
  useEffect(() => { step2TextsRef.current = step2RawTexts; }, [step2RawTexts]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (step1Done && !step1Streaming) {
      setShowComplete(true);
      const t = setTimeout(() => setShowComplete(false), 600);
      return () => clearTimeout(t);
    }
  }, [step1Done, step1Streaming]);

  useEffect(() => () => {
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
  }, []);

  // ── SSE runner ─────────────────────────────────────────────────────────────

  const runStream = useCallback(async (
    d: string,
    signal: AbortSignal,
    step: 1 | 2,
  ): Promise<void> => {
    const res = await fetch("/api/medical-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disease: d, step }),
      signal,
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buf       = "";

    while (true) {
      const { done: rd, value } = await reader.read();
      if (rd) break;
      if (step === 1) setSlowWarning(false);

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;

        let event: SseEvent;
        try { event = JSON.parse(raw) as SseEvent; } catch { continue; }

        if (event.type === "error") throw new Error(event.error);

        if (event.type === "done") {
          if (step === 1) setStep1Done(true);
          else            setStep2Done(true);
          continue;
        }

        if (event.type === "section_start") {
          if (step === 1) setStep1CurrentSec(event.key);
          else            setStep2CurrentSec(event.key);
          continue;
        }

        if (event.type === "section_end") {
          if (step === 1) {
            setStep1CompletedSecs(prev => { const s = new Set(prev); s.add(event.key); return s; });
            setStep1CurrentSec(null);
          } else {
            setStep2CompletedSecs(prev => { const s = new Set(prev); s.add(event.key); return s; });
            setStep2CurrentSec(null);
          }
          continue;
        }

        if (event.type === "text") {
          if (step === 1) {
            setStep1Texts(prev => {
              const next = { ...prev, [event.key]: (prev[event.key] ?? "") + event.text };
              step1TextsRef.current = next;
              return next;
            });
          } else {
            setStep2RawTexts(prev => {
              const next = { ...prev, [event.key]: (prev[event.key] ?? "") + event.text };
              step2TextsRef.current = next;
              return next;
            });
          }
        }
      }
    }
  }, []);

  // ── Term tap ──────────────────────────────────────────────────────────────

  const handleTermClick = useCallback((term: string) => {
    const d = disease ?? "";
    setTermPopup({ term, disease: d, explanation: null, loading: true });
    fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term, disease: d }),
    })
      .then(r => r.json())
      .then((data: { explanation?: string }) => {
        setTermPopup(prev => prev?.term === term ? { ...prev, explanation: data.explanation ?? "説明を取得できませんでした", loading: false } : prev);
      })
      .catch(() => {
        setTermPopup(prev => prev?.term === term ? { ...prev, explanation: "説明を取得できませんでした", loading: false } : prev);
      });
  }, [disease]);

  // ── Step 2 trigger ────────────────────────────────────────────────────────

  const startStep2 = useCallback(async (d: string) => {
    abort2Ref.current?.abort();
    const abort = new AbortController();
    abort2Ref.current = abort;

    setStep2Error(false);
    setStep2Done(false);
    setStep2RawTexts({});
    setStep2CurrentSec(null);
    setStep2CompletedSecs(new Set());
    step2TextsRef.current = {};
    setStep2Streaming(true);

    try {
      await runStream(d, abort.signal, 2);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      if (!abort.signal.aborted) setStep2Error(true);
    } finally {
      if (!abort.signal.aborted) setStep2Streaming(false);
    }
  }, [runStream]);

  // ── Step 1 main search ────────────────────────────────────────────────────

  const startFullSearch = useCallback(async (d: string) => {
    abortRef.current?.abort();
    abort2Ref.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setPhase("results");
    setStep1Done(false);
    setStep2Done(false);
    setStep2Error(false);
    setError(null);
    setCopied(false);
    setRetrying(false);
    setRetryCount(0);
    setFromCache(false);
    setShowComplete(false);
    setDisease(d);
    setStep1Texts({});
    setStep1CurrentSec(null);
    setStep1CompletedSecs(new Set());
    setStep2RawTexts({});
    setStep2CurrentSec(null);
    setStep2CompletedSecs(new Set());
    setStep2Streaming(false);
    step1TextsRef.current = {};
    step2TextsRef.current = {};

    addHistory(d);

    // Cache check (step1 only)
    const cached = cache.get(d);
    if (cached && NEW_SECTION_ORDER.every(k => !!cached[k])) {
      setStep1Texts(cached);
      setStep1CompletedSecs(new Set(NEW_SECTION_ORDER));
      setStep1Streaming(false);
      setStep1Done(true);
      setFromCache(true);
      // Still run step2
      startStep2(d);
      return;
    }

    setStep1Streaming(true);
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    setSlowWarning(false);
    slowTimerRef.current = setTimeout(() => setSlowWarning(true), SLOW_WARNING_MS);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (abort.signal.aborted) break;
      if (attempt > 0) {
        setRetrying(true);
        setRetryCount(attempt);
        await new Promise<void>(r => setTimeout(r, 1_500 * attempt));
        if (abort.signal.aborted) break;
        setRetrying(false);
      }
      try {
        await runStream(d, abort.signal, 1);
        if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
        setStep1Streaming(false);
        const final = step1TextsRef.current;
        if (Object.keys(final).length > 0) cache.set(d, final);
        // Auto-trigger step 2
        if (!abort.signal.aborted) startStep2(d);
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") break;
        if (abort.signal.aborted) break;
        if (attempt < MAX_RETRIES && isRetryableClient(err)) continue;
        if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
        setStep1Streaming(false);
        setError(classifyError(err));
        setDisease(null);
        setPhase("idle");
        return;
      }
    }

    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    setStep1Streaming(false);
  }, [addHistory, cache, runStream, startStep2]);

  // ── Search trigger ────────────────────────────────────────────────────────

  const handleSearch = useCallback(async (
    input: string = query,
    opts?: { direct?: boolean },
  ) => {
    const q = input.trim();
    if (!q) return;

    if (opts?.direct) { startFullSearch(q); return; }

    setPhase("resolving");
    setSearchQuery(q);
    setError(null);

    try {
      const res  = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json() as ResolveResult;
      if (data.direct) {
        startFullSearch(data.disease ?? q);
      } else {
        setSelectedDiseases([]);
        setCandidates(data.candidates);
        setPhase("candidates");
      }
    } catch {
      startFullSearch(q);
    }
  }, [query, startFullSearch]);

  // ── Multi-disease helpers ─────────────────────────────────────────────────

  const toggleCandidateSelection = useCallback((name: string) => {
    setSelectedDiseases(prev =>
      prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name],
    );
  }, []);

  const handleMultiSearch = useCallback((diseases: string[]) => {
    if (diseases.length === 0) return;
    diseaseResultsRef.current = {};
    setTabDiseases(diseases);
    setActiveDiseaseIdx(0);
    startFullSearch(diseases[0]);
  }, [startFullSearch]);

  const handleTabSwitch = useCallback((idx: number) => {
    const nextDisease = tabDiseases[idx];
    if (!nextDisease) return;

    if (disease && tabDiseases[activeDiseaseIdx]) {
      diseaseResultsRef.current[tabDiseases[activeDiseaseIdx]] = {
        step1Texts:    step1Texts,
        step2RawTexts: step2RawTexts,
        step2Done:     step2Done,
      };
    }

    setActiveDiseaseIdx(idx);

    const cached = diseaseResultsRef.current[nextDisease];
    if (cached) {
      setDisease(nextDisease);
      setStep1Texts(cached.step1Texts);
      setStep1CompletedSecs(new Set(Object.keys(cached.step1Texts) as NewSectionKey[]));
      setStep1Done(true);
      setStep1Streaming(false);
      setStep2RawTexts(cached.step2RawTexts);
      setStep2CompletedSecs(new Set(Object.keys(cached.step2RawTexts) as NewSectionKey[]));
      setStep2Done(cached.step2Done);
      setStep2Streaming(!cached.step2Done);
      setPhase("results");
      return;
    }

    startFullSearch(nextDisease);
  }, [tabDiseases, activeDiseaseIdx, disease, step1Texts, step2RawTexts, step2Done, startFullSearch]);

  const handleClear = () => {
    abortRef.current?.abort();
    abort2Ref.current?.abort();
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    setPhase("idle");
    setDisease(null);
    setStep1Texts({});
    setStep1CurrentSec(null);
    setStep1CompletedSecs(new Set());
    setStep1Done(false);
    setStep1Streaming(false);
    setStep2RawTexts({});
    setStep2CurrentSec(null);
    setStep2CompletedSecs(new Set());
    setStep2Done(false);
    setStep2Streaming(false);
    setStep2Error(false);
    setError(null);
    setQuery("");
    setCandidates([]);
    setRetrying(false);
    setRetryCount(0);
    setSelectedDiseases([]);
    setTabDiseases([]);
    setActiveDiseaseIdx(0);
    diseaseResultsRef.current = {};
    inputRef.current?.focus();
  };

  const handleCopyAll = async () => {
    if (!disease) return;
    await navigator.clipboard.writeText(formatAsText(disease, step1Texts));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const step1LoadedCount = step1CompletedSecs.size;
  const totalSections    = NEW_SECTION_ORDER.length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">

      {/* ══ Search box ══ */}
      {phase !== "results" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5 print:hidden">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="症状・部位・疾患名を入力（例：膝が痛い、肩、脳梗塞）"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none text-gray-900 placeholder-gray-400 text-base transition"
              disabled={phase === "resolving"}
              autoComplete="off"
            />
            <button
              onClick={() => handleSearch()}
              disabled={phase === "resolving" || !query.trim()}
              className="px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
            >
              {phase === "resolving" ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  検索中…
                </span>
              ) : "検索"}
            </button>
          </div>

          {history.length > 0 && phase === "idle" && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">最近の検索</p>
                <button onClick={clearHistory} className="text-xs text-gray-300 hover:text-gray-500 transition">消去</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {history.slice(0, 10).map(h => (
                  <div key={h.id} className="flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-1 py-1 group">
                    <button onClick={() => { setQuery(h.query); handleSearch(h.query, { direct: true }); }} className="text-xs text-gray-700 hover:text-blue-600 transition">{h.query}</button>
                    <button onClick={() => removeHistory(h.id)} className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition ml-1 text-xs px-0.5">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">よく検索される疾患</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SEARCHES.map(term => (
                <button key={term} onClick={() => { setQuery(term); handleSearch(term, { direct: true }); }}
                  disabled={phase === "resolving"}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 rounded-full transition disabled:opacity-40">
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ Candidate list ══ */}
      {phase === "candidates" && (
        <div className="animate-fadeIn">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">「{searchQuery}」の関連疾患</p>
            <button onClick={handleClear} className="text-sm text-gray-400 hover:text-gray-600 transition">← 戻る</button>
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-0.5">以下の中から当てはまるものを選んでください</h2>
          <p className="text-xs text-gray-400 mb-4">複数選択できます</p>
          <div className="space-y-2 mb-4">
            {candidates.map(c => {
              const isSelected = selectedDiseases.includes(c.name);
              return (
                <button key={c.name} onClick={() => toggleCandidateSelection(c.name)}
                  className="w-full text-left rounded-xl border px-4 py-4 transition-all"
                  style={{ background: isSelected ? "#FFF7ED" : "white", borderColor: isSelected ? "#E85D04" : "#e5e7eb", boxShadow: isSelected ? "0 0 0 1px #E85D04" : undefined }}>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded flex items-center justify-center mt-0.5 shrink-0 border-2 transition-all"
                      style={{ borderColor: isSelected ? "#E85D04" : "#d1d5db", background: isSelected ? "#E85D04" : "white" }}>
                      {isSelected && (
                        <svg viewBox="0 0 12 10" fill="none" className="w-3 h-3">
                          <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-snug">{c.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                      {c.annotation && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "#E85D04" }}>{c.annotation}</p>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={() => handleMultiSearch(selectedDiseases)} disabled={selectedDiseases.length === 0}
            className="w-full py-3.5 rounded-xl font-bold text-base text-white transition mb-2"
            style={{ background: selectedDiseases.length > 0 ? "#1B4332" : "#9ca3af", cursor: selectedDiseases.length > 0 ? "pointer" : "not-allowed" }}>
            この疾患で調べる{selectedDiseases.length > 0 && `（${selectedDiseases.length}件選択中）`}
          </button>
          <button onClick={() => startFullSearch(searchQuery)}
            className="w-full py-3 text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:text-gray-700 transition">
            「{searchQuery}」でそのまま検索する
          </button>
        </div>
      )}

      {/* ══ Error ══ */}
      {error && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center print:hidden">
          <button onClick={() => { setError(null); handleSearch(disease ?? query, { direct: true }); }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: "#E85D04" }}>
            もう一度試してください
          </button>
        </div>
      )}

      {/* ══ Results ══ */}
      {phase === "results" && disease && (
        <div>
          {/* Disease tabs */}
          {tabDiseases.length > 1 && (
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 print:hidden">
              {tabDiseases.map((d, i) => (
                <button key={d} onClick={() => handleTabSwitch(i)}
                  className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap"
                  style={{ background: i === activeDiseaseIdx ? "#1B4332" : "#f3f4f6", color: i === activeDiseaseIdx ? "white" : "#374151" }}>
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* Header bar */}
          <div className="flex items-start justify-between mb-4 print:mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 print:text-2xl">「{disease}」</h2>
              <div className="mt-0.5 print:hidden">
                {retrying ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3.5 h-3.5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                    <span className="text-xs text-amber-600 font-medium">再接続しています… ({retryCount}/{MAX_RETRIES}回目)</span>
                  </div>
                ) : step1Streaming ? (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <span className="text-xs text-blue-600">{step1LoadedCount} / {totalSections} 項目完了</span>
                  </div>
                ) : step1Done && step2Streaming ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 border border-blue-400/40 border-t-blue-500 rounded-full animate-spin shrink-0" />
                    <span className="text-xs text-blue-500">詳細情報を読み込み中...</span>
                  </div>
                ) : step1Done && step2Done ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-green-600">完了</p>
                    {fromCache && <span className="text-[10px] text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">キャッシュ</span>}
                  </div>
                ) : null}
              </div>
              <p className="hidden print:block text-sm text-gray-500 mt-1">生成日時：{new Date().toLocaleString("ja-JP")}</p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              {step1Done && (
                <button
                  onClick={() => toggleFavorite({ id: `disease-${disease}`, type: "disease", title: disease, diseaseData: { disease, sections: step1Texts } })}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:border-orange-300 transition"
                  aria-label={isFavorited(`disease-${disease}`) ? "お気に入り解除" : "お気に入りに追加"}>
                  <HeartIcon filled={isFavorited(`disease-${disease}`)} />
                </button>
              )}
              {step1Done && (
                <>
                  <button onClick={handleCopyAll} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition">
                    {copied ? "コピー済み" : "全文コピー"}
                  </button>
                  <button onClick={() => window.print()} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition">印刷</button>
                </>
              )}
              <button onClick={handleClear} className="text-xs text-gray-400 hover:text-gray-600 transition px-2">
                {step1Streaming ? "停止" : "クリア"}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {step1Streaming && (
            <div className="w-full bg-gray-100 rounded-full h-1 mb-5 overflow-hidden print:hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(step1LoadedCount / totalSections) * 100}%`, background: "#E85D04" }} />
            </div>
          )}

          {/* Slow warning */}
          {slowWarning && step1Streaming && (
            <div className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 print:hidden">
              <span className="inline-block w-4 h-4 border-2 border-blue-400/40 border-t-blue-500 rounded-full animate-spin shrink-0" />
              <p className="text-sm text-blue-700">少し時間がかかっています。このままお待ちください。</p>
            </div>
          )}

          {/* Loading messages */}
          {step1Streaming && !step1CompletedSecs.has("definition") && (
            <div className="mb-4 print:hidden">
              <LoadingMessages disease={disease} />
            </div>
          )}

          {/* Completion flash */}
          {showComplete && (
            <div className="mb-3 text-center print:hidden">
              <span className="inline-block text-xs font-bold text-green-600 px-3 py-1 rounded-full border border-green-200 bg-green-50 animate-pulse">
                概要表示完了
              </span>
            </div>
          )}

          {/* Section cards */}
          <div className="space-y-3">
            {NEW_SECTION_ORDER.map(key => {
              const summary      = step1Texts[key] ?? "";
              const rawDetail    = step2RawTexts[key] ?? "";
              const { detail, refs } = splitStep2Text(rawDetail);
              const isStep1Active    = step1CurrentSec === key;
              const isStep1Done      = step1CompletedSecs.has(key);
              const showSkeleton     = step1Streaming && !summary && !isStep1Active;
              // step2 は全体 done 後のみ表示（streaming 中は loading 表示のみ）
              const step2LoadingThis = step2Streaming && isStep1Done;
              const step2DoneThis    = step2Done;

              const displaySummary = (key === "references" && !summary && step1Done && !step1Streaming)
                ? "関連書籍・ガイドラインの詳細はステップ2（詳細情報）に表示されます。"
                : summary;

              return (
                <SectionCard
                  key={key}
                  title={NEW_SECTION_TITLES[key]}
                  summary={displaySummary}
                  detail={detail}
                  refs={refs}
                  color={NEW_SECTION_COLORS[key]}
                  sectionKey={key}
                  isStep1Active={isStep1Active}
                  isStep1Done={isStep1Done}
                  showSkeleton={showSkeleton}
                  step2Loading={step2LoadingThis}
                  step2Done={step2DoneThis}
                  onTermClick={handleTermClick}
                />
              );
            })}
          </div>

          {/* Step 2 error: retry button only */}
          {step2Error && !step2Streaming && (
            <div className="mt-3 flex justify-center print:hidden">
              <button
                onClick={() => disease && startStep2(disease)}
                className="text-xs font-bold px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition"
              >
                再度読み込む
              </button>
            </div>
          )}

          {/* PubMed リンク */}
          {step1Done && step1Texts["references"] && (
            <div className="mt-3 px-1 print:hidden">
              <a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(disease)}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800 transition">
                PubMedで「{disease}」の文献を確認する →
              </a>
            </div>
          )}

          {/* Comedical section */}
          {step1Done && (
            <div className="mt-4"><ComedicalSection disease={disease} /></div>
          )}

          {/* 文献検索リンク */}
          {step1Done && (
            <div className="mt-4 print:hidden">
              <a href={`/stage1/literature?q=${encodeURIComponent(disease)}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 font-bold text-sm transition hover:opacity-90"
                style={{ borderColor: "#1B4332", color: "#1B4332" }}>
                この疾患の関連文献を検索する →
              </a>
            </div>
          )}

          {/* 免責注記 */}
          {step1Done && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 print:border print:border-gray-300 print:bg-white">
              <p className="text-xs font-bold text-amber-800 mb-1">この情報について</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                この内容は文献・教科書をもとに整理されています。最終的な臨床判断は、原典の確認とPT自身の判断のもとで行ってください。
              </p>
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="text-[10px] font-bold text-amber-700 mb-1.5">参照文献を確認する</p>
                <a href={`/stage1/literature?q=${encodeURIComponent(disease)}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 transition">
                  「{disease}」の文献検索で原典を確認する →
                </a>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center mt-4 pb-2 print:hidden">
            ※ 文献・論文をもとに整理した情報です。臨床判断には必ず一次文献・専門家への確認をお取りください。
          </p>
        </div>
      )}

      {/* ══ Term popup ══ */}
      {termPopup && <TermPopup state={termPopup} onClose={() => setTermPopup(null)} />}
    </div>
  );
}
