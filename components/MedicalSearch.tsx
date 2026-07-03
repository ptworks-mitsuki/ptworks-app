"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  | { type: "section_start"; key: NewSectionKey }
  | { type: "text";          key: NewSectionKey; text: string }
  | { type: "section_end";   key: NewSectionKey }
  | { type: "done" }
  | { type: "error"; error: string };

const MAX_RETRIES = 3;
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

// ─── Sub-components ────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "#E85D04" : "none"}
      stroke={filled ? "#E85D04" : "#9CA3AF"}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="w-5 h-5 transition-all duration-150" aria-hidden="true">
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

function SectionStreamCard({
  title, text, isActive, isDone, showSkeleton, color,
}: {
  title:       string;
  text:        string;
  isActive:    boolean;
  isDone:      boolean;
  showSkeleton: boolean;
  color:       string;
}) {
  // Parse [[term]] markup to styled spans
  const renderText = (raw: string) => {
    const parts: React.ReactNode[] = [];
    const re = /\[\[([^\]]+)\]\]/g;
    let last = 0, m: RegExpExecArray | null, i = 0;
    while ((m = re.exec(raw)) !== null) {
      if (m.index > last) parts.push(<span key={i++}>{raw.slice(last, m.index)}</span>);
      parts.push(
        <span key={i++} className="font-semibold underline decoration-dotted underline-offset-2"
          style={{ color }}>
          {m[1]}
        </span>,
      );
      last = m.index + m[0].length;
    }
    if (last < raw.length) parts.push(<span key={i++}>{raw.slice(last)}</span>);
    return parts;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100">
        <div className="w-1 h-5 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-sm font-bold text-gray-900 flex-1">{title}</span>
        {isActive && (
          <span className="flex gap-0.5 shrink-0">
            {[0, 1, 2].map(i => (
              <span key={i}
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: "#E85D04", animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        )}
        {isDone && !isActive && (
          <span className="text-[10px] text-green-500 font-bold shrink-0">完了</span>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {showSkeleton ? (
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-3/5" />
          </div>
        ) : (
          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {renderText(text)}
            {isActive && (
              <span
                className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse ml-0.5 align-text-bottom"
                aria-hidden="true"
              />
            )}
          </div>
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
  const [query,        setQuery]        = useState("");
  const [phase,        setPhase]        = useState<Phase>("idle");
  const [candidates,   setCandidates]   = useState<Suggestion[]>([]);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [error,        setError]        = useState<string | null>(null);
  const [copied,       setCopied]       = useState(false);

  // Streaming state
  const [disease,           setDisease]           = useState<string | null>(null);
  const [sectionTexts,      setSectionTexts]      = useState<Record<string, string>>({});
  const [currentSection,    setCurrentSection]    = useState<NewSectionKey | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<NewSectionKey>>(new Set());
  const [streaming,         setStreaming]         = useState(false);
  const [done,              setDone]              = useState(false);
  const [fromCache,         setFromCache]         = useState(false);
  const [showComplete,      setShowComplete]      = useState(false);
  const [slowWarning,       setSlowWarning]       = useState(false);
  const [retrying,          setRetrying]          = useState(false);
  const [retryCount,        setRetryCount]        = useState(0);

  // Multi-disease / keyword flow
  const [originalQuery,        setOriginalQuery]        = useState("");
  const [selectedDiseases,     setSelectedDiseases]     = useState<string[]>([]);
  const [tabDiseases,          setTabDiseases]          = useState<string[]>([]);
  const [activeDiseaseIdx,     setActiveDiseaseIdx]     = useState(0);
  const [keywordAnswer,        setKeywordAnswer]        = useState<string | null>(null);
  const [keywordAnswerLoading, setKeywordAnswerLoading] = useState(false);

  const { history, addHistory, removeHistory, clearHistory } = useSearchHistory();
  const cache  = useSearchCache();
  const { isFavorited, toggleFavorite } = useFavorites();
  const inputRef      = useRef<HTMLInputElement>(null);
  const abortRef      = useRef<AbortController | null>(null);
  const slowTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textsRef      = useRef<Record<string, string>>({});
  const diseaseResultsRef = useRef<Record<string, {
    texts:         Record<string, string>;
    done:          boolean;
    keywordAnswer: string | null;
  }>>({});

  // Keep textsRef in sync for closures
  useEffect(() => { textsRef.current = sectionTexts; }, [sectionTexts]);

  // "/" shortcut focuses search
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

  // Completion flash
  useEffect(() => {
    if (done && streaming === false) {
      setShowComplete(true);
      const t = setTimeout(() => setShowComplete(false), 600);
      return () => clearTimeout(t);
    }
  }, [done, streaming]);

  // Clear slow timer on unmount
  useEffect(() => () => {
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
  }, []);

  // ── Core SSE runner ───────────────────────────────────────────────────────

  const runStream = useCallback(async (
    d: string,
    signal: AbortSignal,
  ): Promise<void> => {
    const res = await fetch("/api/medical-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disease: d }),
      signal,
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = "";

    while (true) {
      const { done: rd, value } = await reader.read();
      if (rd) break;

      // First chunk clears slow warning
      setSlowWarning(false);

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;

        let event: SseEvent;
        try { event = JSON.parse(raw) as SseEvent; } catch { continue; }

        if (event.type === "error")  throw new Error(event.error);
        if (event.type === "done") {
          setDone(true);
          continue;
        }
        if (event.type === "section_start") {
          setCurrentSection(event.key);
          continue;
        }
        if (event.type === "section_end") {
          setCompletedSections(prev => { const s = new Set(prev); s.add(event.key); return s; });
          setCurrentSection(null);
          continue;
        }
        if (event.type === "text") {
          setSectionTexts(prev => {
            const next = { ...prev, [event.key]: (prev[event.key] ?? "") + event.text };
            textsRef.current = next;
            return next;
          });
        }
      }
    }
  }, []);

  // ── Main search with retry loop ───────────────────────────────────────────

  const startFullSearch = useCallback(async (
    d: string,
    opts?: { keepPartial?: boolean },
  ) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setPhase("results");
    setDone(false);
    setError(null);
    setCopied(false);
    setRetrying(false);
    setRetryCount(0);
    setFromCache(false);
    setShowComplete(false);
    setDisease(d);

    if (!opts?.keepPartial) {
      setSectionTexts({});
      setCurrentSection(null);
      setCompletedSections(new Set());
      textsRef.current = {};
    }

    addHistory(d);

    // Cache check
    const cached = cache.get(d);
    if (cached && NEW_SECTION_ORDER.every(k => !!cached[k])) {
      setSectionTexts(cached);
      setCompletedSections(new Set(NEW_SECTION_ORDER));
      setStreaming(false);
      setDone(true);
      setFromCache(true);
      return;
    }

    setStreaming(true);

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
        await runStream(d, abort.signal);

        // Success
        if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
        setStreaming(false);

        const finalTexts = textsRef.current;
        if (Object.keys(finalTexts).length > 0) cache.set(d, finalTexts);
        return;

      } catch (err) {
        if ((err as Error).name === "AbortError") break;
        if (abort.signal.aborted) break;

        if (attempt < MAX_RETRIES && isRetryableClient(err)) continue;

        if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
        setStreaming(false);
        setError(classifyError(err));
        if (!opts?.keepPartial) {
          setDisease(null);
          setPhase("idle");
        }
        return;
      }
    }

    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    setStreaming(false);
  }, [addHistory, cache, runStream]);

  // ── Main search trigger ───────────────────────────────────────────────────

  const handleSearch = useCallback(async (
    input: string = query,
    opts?: { direct?: boolean },
  ) => {
    const q = input.trim();
    if (!q) return;

    if (opts?.direct) {
      startFullSearch(q);
      return;
    }

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

  const startFullSearchWithKeyword = useCallback((d: string, keyword: string) => {
    if (keyword) {
      setKeywordAnswer(null);
      setKeywordAnswerLoading(true);
      fetch("/api/keyword-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: keyword, disease: d }),
      })
        .then(r => r.json())
        .then((data: { answer: string }) => setKeywordAnswer(data.answer ?? null))
        .catch(() => setKeywordAnswer(null))
        .finally(() => setKeywordAnswerLoading(false));
    }
    startFullSearch(d);
  }, [startFullSearch]);

  const handleMultiSearch = useCallback((diseases: string[]) => {
    if (diseases.length === 0) return;
    diseaseResultsRef.current = {};
    setTabDiseases(diseases);
    setActiveDiseaseIdx(0);
    setOriginalQuery(searchQuery);
    setKeywordAnswer(null);
    setKeywordAnswerLoading(false);
    startFullSearchWithKeyword(diseases[0], searchQuery);
  }, [searchQuery, startFullSearchWithKeyword]);

  const handleTabSwitch = useCallback((idx: number) => {
    const nextDisease = tabDiseases[idx];
    if (!nextDisease) return;

    // Save current before switching
    if (disease && tabDiseases[activeDiseaseIdx]) {
      diseaseResultsRef.current[tabDiseases[activeDiseaseIdx]] = {
        texts: sectionTexts,
        done,
        keywordAnswer,
      };
    }

    setActiveDiseaseIdx(idx);

    const cached = diseaseResultsRef.current[nextDisease];
    if (cached) {
      setDisease(nextDisease);
      setSectionTexts(cached.texts);
      setCompletedSections(new Set(Object.keys(cached.texts) as NewSectionKey[]));
      setDone(cached.done);
      setStreaming(!cached.done);
      setKeywordAnswer(cached.keywordAnswer);
      setKeywordAnswerLoading(false);
      setPhase("results");
      return;
    }

    startFullSearchWithKeyword(nextDisease, originalQuery);
  }, [tabDiseases, activeDiseaseIdx, disease, sectionTexts, done, keywordAnswer, originalQuery, startFullSearchWithKeyword]);

  const handleClear = () => {
    abortRef.current?.abort();
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    setPhase("idle");
    setDisease(null);
    setSectionTexts({});
    setCurrentSection(null);
    setCompletedSections(new Set());
    setDone(false);
    setError(null);
    setQuery("");
    setCandidates([]);
    setRetrying(false);
    setRetryCount(0);
    setOriginalQuery("");
    setSelectedDiseases([]);
    setTabDiseases([]);
    setActiveDiseaseIdx(0);
    setKeywordAnswer(null);
    setKeywordAnswerLoading(false);
    diseaseResultsRef.current = {};
    inputRef.current?.focus();
  };

  const handleCopyAll = async () => {
    if (!disease) return;
    await navigator.clipboard.writeText(formatAsText(disease, sectionTexts));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const loadedCount   = completedSections.size;
  const totalSections = NEW_SECTION_ORDER.length;

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

          {/* History */}
          {history.length > 0 && phase === "idle" && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">最近の検索</p>
                <button onClick={clearHistory} className="text-xs text-gray-300 hover:text-gray-500 transition">消去</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {history.slice(0, 10).map(h => (
                  <div key={h.id} className="flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-1 py-1 group">
                    <button
                      onClick={() => { setQuery(h.query); handleSearch(h.query, { direct: true }); }}
                      className="text-xs text-gray-700 hover:text-blue-600 transition"
                    >{h.query}</button>
                    <button onClick={() => removeHistory(h.id)} className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition ml-1 text-xs px-0.5">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick searches */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">よく検索される疾患</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SEARCHES.map(term => (
                <button
                  key={term}
                  onClick={() => { setQuery(term); handleSearch(term, { direct: true }); }}
                  disabled={phase === "resolving"}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 rounded-full transition disabled:opacity-40"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ Candidate list (multi-select) ══ */}
      {phase === "candidates" && (
        <div className="animate-fadeIn">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">「{searchQuery}」の関連疾患</p>
            <button onClick={handleClear} className="text-sm text-gray-400 hover:text-gray-600 transition">← 戻る</button>
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-0.5">
            以下の中から当てはまるものを選んでください
          </h2>
          <p className="text-xs text-gray-400 mb-4">複数選択できます</p>

          <div className="space-y-2 mb-4">
            {candidates.map(c => {
              const isSelected = selectedDiseases.includes(c.name);
              return (
                <button key={c.name} onClick={() => toggleCandidateSelection(c.name)}
                  className="w-full text-left rounded-xl border px-4 py-4 transition-all"
                  style={{
                    background:  isSelected ? "#FFF7ED" : "white",
                    borderColor: isSelected ? "#E85D04" : "#e5e7eb",
                    boxShadow:   isSelected ? "0 0 0 1px #E85D04" : undefined,
                  }}>
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
                      {c.annotation && (
                        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "#E85D04" }}>
                          {c.annotation}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handleMultiSearch(selectedDiseases)}
            disabled={selectedDiseases.length === 0}
            className="w-full py-3.5 rounded-xl font-bold text-base text-white transition mb-2"
            style={{
              background: selectedDiseases.length > 0 ? "#1B4332" : "#9ca3af",
              cursor:     selectedDiseases.length > 0 ? "pointer" : "not-allowed",
            }}>
            この疾患で調べる
            {selectedDiseases.length > 0 && `（${selectedDiseases.length}件選択中）`}
          </button>

          <button
            onClick={() => { setOriginalQuery(""); startFullSearch(searchQuery); }}
            className="w-full py-3 text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:text-gray-700 transition">
            「{searchQuery}」でそのまま検索する
          </button>
        </div>
      )}

      {/* ══ Error ══ */}
      {error && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center print:hidden">
          <button
            onClick={() => { setError(null); handleSearch(disease ?? query, { direct: true }); }}
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
                  style={{
                    background: i === activeDiseaseIdx ? "#1B4332" : "#f3f4f6",
                    color:      i === activeDiseaseIdx ? "white"    : "#374151",
                  }}>
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* Keyword answer box */}
          {originalQuery && (keywordAnswer !== null || keywordAnswerLoading) && (
            <div className="mb-5 rounded-2xl overflow-hidden print:hidden"
              style={{
                background:      "#FFF3E0",
                border:          "1px solid #FFCC80",
                borderLeftWidth: "4px",
                borderLeftColor: "#E85D04",
              }}>
              <div className="px-5 py-4">
                <p className="font-bold text-base mb-2" style={{ color: "#E85D04" }}>
                  あなたの質問への回答
                </p>
                {keywordAnswerLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3.5 h-3.5 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin shrink-0" />
                    <p className="text-sm text-orange-600">準備中...</p>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#1B4332" }}>
                    {keywordAnswer}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  「{originalQuery}」への回答として生成しました
                </p>
              </div>
            </div>
          )}

          {/* Section label in keyword mode */}
          {originalQuery && (
            <div className="mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">疾患の基本情報</p>
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
                    <span className="text-xs text-amber-600 font-medium">
                      再接続しています… ({retryCount}/{MAX_RETRIES}回目)
                    </span>
                  </div>
                ) : streaming ? (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <span className="text-xs text-blue-600">{loadedCount} / {totalSections} 項目完了</span>
                  </div>
                ) : done ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-green-600">✓ {totalSections} 項目生成完了</p>
                    {fromCache && (
                      <span className="text-[10px] text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">キャッシュ</span>
                    )}
                  </div>
                ) : null}
              </div>
              <p className="hidden print:block text-sm text-gray-500 mt-1">
                生成日時：{new Date().toLocaleString("ja-JP")}
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              {done && (
                <button
                  onClick={() => toggleFavorite({
                    id:          `disease-${disease}`,
                    type:        "disease",
                    title:       disease,
                    diseaseData: { disease, sections: sectionTexts },
                  })}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:border-orange-300 transition"
                  aria-label={isFavorited(`disease-${disease}`) ? "お気に入り解除" : "お気に入りに追加"}>
                  <HeartIcon filled={isFavorited(`disease-${disease}`)} />
                </button>
              )}
              {done && (
                <>
                  <button onClick={handleCopyAll}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition">
                    {copied ? "✓ コピー済み" : "全文コピー"}
                  </button>
                  <button onClick={() => window.print()}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition">
                    印刷
                  </button>
                </>
              )}
              <button onClick={handleClear} className="text-xs text-gray-400 hover:text-gray-600 transition px-2">
                {streaming ? "✕ 停止" : "✕ クリア"}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {streaming && (
            <div className="w-full bg-gray-100 rounded-full h-1 mb-5 overflow-hidden print:hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(loadedCount / totalSections) * 100}%`, background: "#E85D04" }} />
            </div>
          )}

          {/* Slow warning (30s) */}
          {slowWarning && streaming && (
            <div className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 print:hidden">
              <span className="inline-block w-4 h-4 border-2 border-blue-400/40 border-t-blue-500 rounded-full animate-spin shrink-0" />
              <p className="text-sm text-blue-700">少し時間がかかっています。このままお待ちください。</p>
            </div>
          )}

          {/* Loading messages (while streaming) */}
          {streaming && !completedSections.has("definition") && (
            <div className="mb-4 print:hidden">
              <LoadingMessages disease={disease} />
            </div>
          )}

          {/* Completion flash */}
          {showComplete && (
            <div className="mb-3 text-center print:hidden">
              <span
                className="inline-block text-xs font-bold text-green-600 px-3 py-1 rounded-full border border-green-200 bg-green-50 animate-pulse"
              >
                表示完了
              </span>
            </div>
          )}

          {/* ── Section cards ── */}
          <div className="space-y-3">
            {NEW_SECTION_ORDER.map(key => {
              const text        = sectionTexts[key] ?? "";
              const isActive    = currentSection === key;
              const isDone      = completedSections.has(key);
              const hasContent  = text.length > 0;
              const showSkeleton = streaming && !hasContent && !isActive;

              return (
                <SectionStreamCard
                  key={key}
                  title={NEW_SECTION_TITLES[key]}
                  text={text}
                  isActive={isActive}
                  isDone={isDone}
                  showSkeleton={showSkeleton}
                  color={NEW_SECTION_COLORS[key]}
                />
              );
            })}
          </div>

          {/* Comedical section */}
          {done && (
            <div className="mt-4">
              <ComedicalSection disease={disease} />
            </div>
          )}

          {/* 文献検索リンク */}
          {done && (
            <div className="mt-4 print:hidden">
              <a
                href={`/stage1/literature?q=${encodeURIComponent(disease)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 font-bold text-sm transition hover:opacity-90"
                style={{ borderColor: "#1B4332", color: "#1B4332" }}>
                この疾患の関連文献を検索する →
              </a>
            </div>
          )}

          {/* 免責注記 */}
          {done && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 print:border print:border-gray-300 print:bg-white">
              <p className="text-xs font-bold text-amber-800 mb-1">この情報について</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                この内容は文献・教科書をもとに整理されています。
                最終的な臨床判断は、原典の確認とPT自身の判断のもとで行ってください。
              </p>
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="text-[10px] font-bold text-amber-700 mb-1.5">参照文献を確認する</p>
                <a
                  href={`/stage1/literature?q=${encodeURIComponent(disease)}`}
                  target="_blank"
                  rel="noopener noreferrer"
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
    </div>
  );
}
