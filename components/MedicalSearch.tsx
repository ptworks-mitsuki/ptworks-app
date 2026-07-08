"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  NewSectionKey, NEW_SECTION_ORDER, NEW_SECTION_TITLES, NEW_SECTION_COLORS,
  Suggestion,
} from "@/types/medical";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useSearchCache } from "@/hooks/useSearchCache";
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

// Which step-2 group each section belongs to (3 parallel API calls)
const SECTION_GROUP: Record<NewSectionKey, 1 | 2 | 3> = {
  definition: 1, symptoms: 1, assessment: 1,
  prognosis: 2, treatment: 2,
  contraindications: 3, clinical_points: 3,
  references: 1,
};

type GroupStatus = "idle" | "loading" | "done" | "error";

// Strip leaked instruction/marker lines from displayed text
function cleanText(text: string): string {
  return text
    .split("\n")
    .filter(line => {
      const t = line.trim();
      if (!t) return true;
      if (/^={3,}[A-Z_]*(={3,})?$/.test(t)) return false;
      if (/^-{3,}$/.test(t)) return false;
      if (/^[A-Z_]{2,}$/.test(t)) return false;
      if (/^以下の通り/.test(t) || /^してください/.test(t)) return false;
      return true;
    })
    .join("\n");
}

const LOADING_MESSAGES = [
  (d: string) => `${d}について文献・教科書をもとに整理しています...`,
  ()          => "文献を確認しています...",
  ()          => "臨床情報を整理しています...",
  ()          => "もうすぐ表示されます...",
];

const DISPLAY_SECTIONS: NewSectionKey[] = [
  "definition", "symptoms", "assessment", "prognosis", "treatment", "contraindications", "clinical_points",
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
          remarkPlugins={[remarkGfm]}
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
        remarkPlugins={[remarkGfm]}
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
      remarkPlugins={[remarkGfm]}
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
        // テーブル：スマホ横スクロール対応＋スタイル
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-xl border border-gray-200">
            <table className="w-full text-sm border-collapse min-w-[360px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead style={{ background: "#1B4332" }}>{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-bold text-white border-r border-white/20 last:border-r-0 whitespace-nowrap">
            {children}
          </th>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children, ...props }) => {
          // 偶数行にグレー背景
          const isEven = (props as { node?: { position?: { start?: { line?: number } } } })
            ?.node?.position?.start?.line ?? 0;
          return (
            <tr style={{ background: isEven % 2 === 0 ? "#F9FAFB" : "white" }}>{children}</tr>
          );
        },
        td: ({ children }) => (
          <td className="px-3 py-2 text-xs text-gray-700 border-t border-gray-200 border-r border-gray-100 last:border-r-0 leading-relaxed">
            {children}
          </td>
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
  step2Status,
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
  step2Status:   GroupStatus;
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
        {step2Status === "loading" && (
          <span className="text-[10px] text-blue-400 font-medium shrink-0">生成中...</span>
        )}
        {step2Status === "done" && (
          <span className="text-[10px] text-green-500 font-bold shrink-0">完了</span>
        )}
        {step2Status === "error" && (
          <span className="text-[10px] text-red-400 font-medium shrink-0">未完了</span>
        )}
        {step2Status === "idle" && isStep1Done && !isStep1Active && (
          <span className="text-[10px] text-gray-300 font-medium shrink-0">待機中</span>
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

        {/* Step 2: Detail */}
        {step1HasContent && (
          <>
            {step2Status === "loading" && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <span className="inline-block w-3 h-3 border border-gray-300 border-t-blue-400 rounded-full animate-spin shrink-0" />
                詳細を生成中...
              </div>
            )}
            {step2Status === "done" && detail && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <MdContent text={cleanText(detail)} color={color} onTermClick={onTermClick} />
              </div>
            )}
            {step2Status === "done" && refs.length > 0 && <RefBlock refs={refs} />}
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
    return "現在アクセスが集中しています。しばらくしてからもう一度お試しください。";
  if (m.includes("timeout") || m.includes("timed out") || m.includes("timeouterror"))
    return "通信に時間がかかっています。もう一度お試しください。";
  if (m.includes("fetch failed") || m.includes("network") || m.includes("econnreset") || m.includes("enotfound"))
    return "通信エラーが発生しました。インターネット接続を確認してもう一度お試しください。";
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
  // Group-based status (3 sequential API calls)
  const [step2GroupStatus, setStep2GroupStatus] = useState<Record<1|2|3, GroupStatus>>({ 1: "idle", 2: "idle", 3: "idle" });
  // Computed shorthands
  const step2ActiveGroup = ([1, 2, 3] as const).find(g => step2GroupStatus[g] === "loading") ?? null;
  const step2Done    = step2GroupStatus[1] === "done" && step2GroupStatus[2] === "done" && step2GroupStatus[3] === "done";
  const step2Streaming = step2ActiveGroup !== null;

  // Multi-disease
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [tabDiseases,      setTabDiseases]      = useState<string[]>([]);
  const [activeDiseaseIdx, setActiveDiseaseIdx] = useState(0);

  // ── 新モード（definition + brief）──────────────────────────────────────
  const [defText,     setDefText]     = useState("");
  const [defLoading,  setDefLoading]  = useState(false);
  const [defDone,     setDefDone]     = useState(false);
  const [defError,    setDefError]    = useState(false);
  const [briefTexts,  setBriefTexts]  = useState<Record<string, string>>({});
  const [briefCurrent,setBriefCurrent]= useState<NewSectionKey | null>(null);
  const [briefLoading,setBriefLoading]= useState(false);
  const [briefDone,   setBriefDone]   = useState(false);
  const [briefError,  setBriefError]  = useState(false);

  const { history, addHistory, removeHistory, clearHistory } = useSearchHistory();
  const cache  = useSearchCache();
  const inputRef      = useRef<HTMLInputElement>(null);
  const abortRef      = useRef<AbortController | null>(null);
  const abort2Ref     = useRef<AbortController | null>(null);
  const defAbortRef   = useRef<AbortController | null>(null);
  const briefAbortRef = useRef<AbortController | null>(null);
  const slowTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const step1TextsRef = useRef<Record<string, string>>({});
  const step2TextsRef = useRef<Record<string, string>>({});

  const diseaseResultsRef = useRef<Record<string, {
    step1Texts: Record<string, string>;
    step2RawTexts: Record<string, string>;
    step2GroupStatus: Record<1|2|3, GroupStatus>;
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

  // ページ離脱時にストリームをキャンセル
  useEffect(() => () => {
    abortRef.current?.abort();
    abort2Ref.current?.abort();
    defAbortRef.current?.abort();
    briefAbortRef.current?.abort();
  }, []);

  // ── SSE runner ─────────────────────────────────────────────────────────────

  const runStream = useCallback(async (
    d: string,
    signal: AbortSignal,
    step: 1 | 2,
    group?: 1 | 2 | 3,
  ): Promise<void> => {
    // AbortSignal.any is available in Chrome116+/Firefox124+/Safari17.4+ and Node20+
    // Fall back to just the caller's signal on older environments
    let fetchSignal: AbortSignal = signal;
    try {
      if (typeof AbortSignal.any === "function" && typeof AbortSignal.timeout === "function") {
        fetchSignal = AbortSignal.any([signal, AbortSignal.timeout(90_000)]);
      }
    } catch { /* ignore — use original signal */ }

    const res = await fetch("/api/medical-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disease: d, step, ...(group ? { group } : {}) }),
      signal: fetchSignal,
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

  // ── New mode: definition ─────────────────────────────────────────────────

  const runDefinition = useCallback(async (d: string): Promise<void> => {
    defAbortRef.current?.abort();
    const abort = new AbortController();
    defAbortRef.current = abort;

    setDefText("");
    setDefLoading(true);
    setDefDone(false);
    setDefError(false);

    try {
      let fetchSignal: AbortSignal = abort.signal;
      try {
        if (typeof AbortSignal.any === "function" && typeof AbortSignal.timeout === "function") {
          fetchSignal = AbortSignal.any([abort.signal, AbortSignal.timeout(90_000)]);
        }
      } catch { /* ignore */ }

      const res = await fetch("/api/medical-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease: d, mode: "definition" }),
        signal: fetchSignal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let ev: Record<string, unknown>;
          try { ev = JSON.parse(raw) as Record<string, unknown>; } catch { continue; }

          if (ev.type === "error") { setDefError(true); setDefLoading(false); return; }
          if (ev.type === "def_done") { setDefDone(true); setDefLoading(false); return; }
          if (ev.type === "def_chunk" && typeof ev.text === "string") {
            setDefText(prev => prev + cleanText(ev.text as string));
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError" || abort.signal.aborted) return;
      console.error("[MedicalSearch] definition error:", err);
      setDefError(true);
    } finally {
      setDefLoading(false);
    }
  }, []);

  // ── New mode: brief ───────────────────────────────────────────────────────

  const runBrief = useCallback(async (d: string): Promise<void> => {
    briefAbortRef.current?.abort();
    const abort = new AbortController();
    briefAbortRef.current = abort;

    setBriefTexts({});
    setBriefCurrent(null);
    setBriefLoading(true);
    setBriefDone(false);
    setBriefError(false);

    try {
      let fetchSignal: AbortSignal = abort.signal;
      try {
        if (typeof AbortSignal.any === "function" && typeof AbortSignal.timeout === "function") {
          fetchSignal = AbortSignal.any([abort.signal, AbortSignal.timeout(90_000)]);
        }
      } catch { /* ignore */ }

      const res = await fetch("/api/medical-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease: d, mode: "brief" }),
        signal: fetchSignal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let ev: Record<string, unknown>;
          try { ev = JSON.parse(raw) as Record<string, unknown>; } catch { continue; }

          if (ev.type === "error") { setBriefError(true); setBriefLoading(false); return; }
          if (ev.type === "brief_done") { setBriefDone(true); setBriefLoading(false); return; }
          if (ev.type === "brief_start" && typeof ev.key === "string") {
            setBriefCurrent(ev.key as NewSectionKey);
          }
          if (ev.type === "brief_end") {
            setBriefCurrent(null);
          }
          if (ev.type === "brief_text" && typeof ev.key === "string" && typeof ev.text === "string") {
            setBriefTexts(prev => ({
              ...prev,
              [ev.key as string]: (prev[ev.key as string] ?? "") + cleanText(ev.text as string),
            }));
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError" || abort.signal.aborted) return;
      console.error("[MedicalSearch] brief error:", err);
      setBriefError(true);
    } finally {
      setBriefLoading(false);
    }
  }, []);

  // ── New mode: start both in parallel ─────────────────────────────────────

  const startNewSearch = useCallback((d: string) => {
    // Run definition and brief in parallel (independent API calls)
    void runDefinition(d);
    void runBrief(d);
  }, [runDefinition, runBrief]);

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

  const startStep2 = useCallback(async (d: string, fromGroup: 1 | 2 | 3 = 1) => {
    abort2Ref.current?.abort();
    const abort = new AbortController();
    abort2Ref.current = abort;

    // Reset groups from fromGroup onwards
    setStep2GroupStatus(p => {
      const next = { ...p };
      ([1, 2, 3] as const).forEach(g => { if (g >= fromGroup) next[g] = "idle"; });
      return next;
    });
    if (fromGroup === 1) {
      setStep2RawTexts({});
      setStep2CurrentSec(null);
      setStep2CompletedSecs(new Set());
      step2TextsRef.current = {};
    }

    for (const group of ([1, 2, 3] as const)) {
      if (group < fromGroup) continue;
      if (abort.signal.aborted) return;

      setStep2GroupStatus(p => ({ ...p, [group]: "loading" }));

      let success = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (abort.signal.aborted) return;
        if (attempt > 0) {
          await new Promise<void>(r => setTimeout(r, 3_000));
          if (abort.signal.aborted) return;
        }
        try {
          await runStream(d, abort.signal, 2, group);
          success = true;
          break;
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          if (abort.signal.aborted) return;
          console.error(`[MedicalSearch] step2 group${group} attempt${attempt + 1}:`, err);
          if (!isRetryableClient(err) || attempt === 2) break;
        }
      }

      if (abort.signal.aborted) return;

      if (success) {
        setStep2GroupStatus(p => ({ ...p, [group]: "done" }));
      } else {
        setStep2GroupStatus(p => ({ ...p, [group]: "error" }));
        return;
      }
    }
  }, [runStream]);

  // ── Main search (new mode) ────────────────────────────────────────────────

  const startFullSearch = useCallback((d: string) => {
    // Cancel any in-flight old streams
    abortRef.current?.abort();
    abort2Ref.current?.abort();

    setPhase("results");
    setDisease(d);
    setError(null);
    setCopied(false);
    // Reset old step state (kept to avoid TS unused-variable errors)
    setStep1Done(false);
    setStep2GroupStatus({ 1: "idle", 2: "idle", 3: "idle" });
    setStep1Texts({});
    setStep1CompletedSecs(new Set());
    setStep2RawTexts({});
    step1TextsRef.current = {};
    step2TextsRef.current = {};

    addHistory(d);
    startNewSearch(d);
  }, [addHistory, startNewSearch]);

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
        step1Texts:      step1Texts,
        step2RawTexts:   step2RawTexts,
        step2GroupStatus: step2GroupStatus,
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
      setStep2GroupStatus(cached.step2GroupStatus);
      setPhase("results");
      return;
    }

    startFullSearch(nextDisease);
  }, [tabDiseases, activeDiseaseIdx, disease, step1Texts, step2RawTexts, step2Done, startFullSearch]);

  const handleClear = () => {
    abortRef.current?.abort();
    abort2Ref.current?.abort();
    defAbortRef.current?.abort();
    briefAbortRef.current?.abort();
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    // Reset new mode state
    setDefText(""); setDefLoading(false); setDefDone(false); setDefError(false);
    setBriefTexts({}); setBriefCurrent(null); setBriefLoading(false); setBriefDone(false); setBriefError(false);
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
    setStep2GroupStatus({ 1: "idle", 2: "idle", 3: "idle" });
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
  const totalSections    = DISPLAY_SECTIONS.length;

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
          {/* ① プレビューバナー */}
          <div className="rounded-2xl px-4 py-3 mb-4 flex items-start gap-3"
            style={{ background: "#1B4332" }}>
            <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <p className="text-xs font-bold text-white leading-snug">現在プレビュー版です。</p>
              <p className="text-xs text-white/75 leading-snug mt-0.5">
                正式リリース後は全項目が詳しく表示されるようになります。定義・概要は詳細版をお試しいただけます。
              </p>
            </div>
            <button onClick={handleClear}
              className="ml-auto shrink-0 text-white/50 hover:text-white transition text-xs">
              ✕
            </button>
          </div>

          {/* 疾患名ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-gray-900">「{disease}」</h2>
            <button onClick={handleClear}
              className="text-xs text-gray-400 hover:text-gray-600 transition">
              クリア
            </button>
          </div>

          {/* ② 定義・概要（詳細版） */}
          <div className="bg-white rounded-2xl border-2 overflow-hidden mb-4"
            style={{ borderColor: "#1B4332" }}>
            <div className="flex items-center gap-2.5 px-5 py-3 border-b"
              style={{ borderColor: "#E5F0EB", background: "#F0FDF4" }}>
              <div className="w-1 h-5 rounded-full shrink-0" style={{ background: "#1B4332" }} />
              <span className="text-sm font-black text-gray-900 flex-1">定義・概要</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#1B4332", color: "white" }}>
                詳細版
              </span>
              {defLoading && (
                <span className="flex gap-0.5 shrink-0">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: "#1B4332", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
              )}
              {defDone && <span className="text-[10px] text-green-600 font-bold shrink-0">完了</span>}
            </div>

            <div className="px-5 py-4">
              {defLoading && !defText && (
                <div className="flex items-center gap-2 py-2">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin shrink-0" />
                  <span className="text-xs text-gray-500">定義・概要を読み込み中...</span>
                </div>
              )}
              {defError && !defText && (
                <div className="text-center py-3">
                  <button onClick={() => disease && runDefinition(disease)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                    style={{ background: "#1B4332" }}>
                    もう一度試す
                  </button>
                </div>
              )}
              {defText && (
                <div>
                  <MdContent text={defText} color="#1B4332" onTermClick={handleTermClick} />
                  {defLoading && (
                    <span className="inline-block w-0.5 h-4 bg-green-700 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ③ 残り6項目（簡潔版） */}
          <div className="space-y-3">
            {(["symptoms","assessment","prognosis","treatment","contraindications","clinical_points"] as NewSectionKey[]).map(key => {
              const color   = NEW_SECTION_COLORS[key];
              const title   = NEW_SECTION_TITLES[key];
              const text    = briefTexts[key] ?? "";
              const isActive = briefCurrent === key;

              return (
                <div key={key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Section header */}
                  <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100">
                    <div className="w-1 h-5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-sm font-bold text-gray-900 flex-1">{title}</span>
                    {isActive && (
                      <span className="flex gap-0.5 shrink-0">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ background: color, animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </span>
                    )}
                    {briefDone && text && <span className="text-[10px] text-green-500 font-bold shrink-0">完了</span>}
                    {briefError && !text && <span className="text-[10px] text-red-400 shrink-0">未完了</span>}
                  </div>

                  <div className="px-5 py-4">
                    {/* Content */}
                    {briefLoading && !text && !isActive && (
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
                      </div>
                    )}
                    {briefError && !text && (
                      <div className="text-center py-2">
                        <button onClick={() => disease && runBrief(disease)}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
                          style={{ background: "#E85D04" }}>
                          もう一度試す
                        </button>
                      </div>
                    )}
                    {text && (
                      <div>
                        <MdContent text={text} color={color} onTermClick={handleTermClick} />
                        {isActive && (
                          <span className="inline-block w-0.5 h-4 animate-pulse ml-0.5 align-text-bottom"
                            style={{ background: color }} />
                        )}
                      </div>
                    )}

                    {/* リリース告知 */}
                    <div className="mt-3 rounded-xl px-4 py-3"
                      style={{ background: "#FFF5F0", borderLeft: "3px solid #E85D04" }}>
                      <p className="text-xs leading-relaxed" style={{ color: "#1B4332" }}>
                        正式リリース後は、この項目も教科書・ガイドラインをもとにした詳しい内容が即座に表示されます。
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 text-center mt-4 pb-2 print:hidden">
            ※ 文献・教科書をもとに整理した情報です。臨床判断には必ず一次文献・専門家への確認をお取りください。
          </p>
        </div>
      )}

      {/* ══ Term popup ══ */}
      {termPopup && <TermPopup state={termPopup} onClose={() => setTermPopup(null)} />}
    </div>
  );
}
