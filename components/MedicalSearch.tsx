"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MedicalSection, SectionKey, SECTIONS, PRIMARY_SECTION_KEYS, Suggestion } from "@/types/medical";
import { SectionCard } from "./SectionCard";
import { ComedicalSection } from "./ComedicalSection";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useSearchCache } from "@/hooks/useSearchCache";
import { useExperienceLevel, TIER_BADGE } from "@/hooks/useExperienceLevel";
import { useFavorites } from "@/hooks/useFavorites";
import type { ResolveResult } from "@/app/api/suggest/route";

// ─── Types ────────────────────────────────────────────────────────────────

type Phase = "idle" | "resolving" | "candidates" | "results";

type PartialResult = {
  disease: string;
  sections: Partial<Record<SectionKey, MedicalSection>>;
};

type SsePayload =
  | { section: SectionKey; data: MedicalSection }
  | { done: true }
  | { error: string };

const MAX_RETRIES = 3;
const SLOW_WARNING_MS  = 20_000; // show "生成中です" banner after 20s
const STALL_TIMEOUT_MS = 25_000; // show "続きを読み込む" if no chunks for 25s

const QUICK_SEARCHES = [
  "脳梗塞", "変形性膝関節症", "腰部脊柱管狭窄症", "パーキンソン病",
  "慢性閉塞性肺疾患", "骨粗鬆症", "肩関節周囲炎", "糖尿病性神経障害",
];

// ─── Error classification (client-side) ──────────────────────────────────

function classifyError(err: unknown): string {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (m.includes("401") || m.includes("authentication") || m.includes("maintenance")) {
    return "現在メンテナンス中です。しばらくお待ちください。";
  }
  if (m.includes("402") || m.includes("billing") || m.includes("credit") ||
      m.includes("429") || m.includes("529") || m.includes("overload") ||
      m.includes("アクセスが集中")) {
    return "現在アクセスが集中しています。しばらくお待ちください。";
  }
  if (m.includes("timeout") || m.includes("timed out") || m.includes("時間がかかって")) {
    return "通信に時間がかかっています。しばらくお待ちください。";
  }
  if (m.includes("fetch") || m.includes("network") || m.includes("offline") ||
      m.includes("econnreset") || m.includes("通信環境")) {
    return "通信環境をご確認ください。";
  }
  // Already Japanese — pass through
  if (/[ぁ-ん]/.test(m) || /[ァ-ン]/.test(m)) return err instanceof Error ? err.message : String(err);
  return "現在メンテナンス中です。しばらくお待ちください。";
}

function isRetryableClient(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    m.includes("429") || m.includes("529") || m.includes("overload") ||
    m.includes("timeout") || m.includes("fetch failed") || m.includes("network") ||
    m.includes("econnreset") || m.includes("アクセスが集中") || m.includes("通信")
  );
}

// ─── Export helpers ────────────────────────────────────────────────────────

function stripMarkers(text: string) {
  return text.replace(/\[\[([^\]]+)\]\]/g, "$1");
}

function formatAsText(disease: string, sections: Partial<Record<SectionKey, MedicalSection>>): string {
  const lines = [`【${disease}】`, `生成日時：${new Date().toLocaleString("ja-JP")}`, ""];
  for (const s of SECTIONS) {
    const data = sections[s.key];
    if (!data) continue;
    lines.push(`■ ${data.title}`);
    lines.push(stripMarkers(data.summary));
    if (data.detail?.trim()) {
      lines.push("");
      lines.push(stripMarkers(data.detail));
    }
    if (data.references.length > 0) {
      lines.push("  参考文献:");
      data.references.forEach((r, i) => lines.push(`  ${i + 1}. ${r}`));
    }
    lines.push("");
  }
  lines.push("※ 本情報は文献・論文をもとに整理した情報です。臨床判断は専門家の責任において行ってください。");
  return lines.join("\n");
}

// ─── Component ─────────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "#E85D04" : "none"} stroke={filled ? "#E85D04" : "#9CA3AF"}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="w-5 h-5 transition-all duration-150" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function MedicalSearch() {
  const [query,        setQuery]        = useState("");
  const [phase,        setPhase]        = useState<Phase>("idle");
  const [candidates,   setCandidates]   = useState<Suggestion[]>([]);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [partial,      setPartial]      = useState<PartialResult | null>(null);
  const [streaming,    setStreaming]     = useState(false);
  const [done,         setDone]         = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [copied,       setCopied]       = useState(false);

  // Retry / stability state
  const [retrying,     setRetrying]     = useState(false);
  const [retryCount,   setRetryCount]   = useState(0);
  const [slowWarning,  setSlowWarning]  = useState(false);
  const [stalled,      setStalled]      = useState(false);
  const [fromCache,    setFromCache]    = useState(false);

  // Multi-disease / keyword flow
  const [originalQuery,        setOriginalQuery]        = useState("");
  const [selectedDiseases,     setSelectedDiseases]     = useState<string[]>([]);
  const [tabDiseases,          setTabDiseases]          = useState<string[]>([]);
  const [activeDiseaseIdx,     setActiveDiseaseIdx]     = useState(0);
  const [keywordAnswer,        setKeywordAnswer]        = useState<string | null>(null);
  const [keywordAnswerLoading, setKeywordAnswerLoading] = useState(false);

  const { history, addHistory, removeHistory, clearHistory } = useSearchHistory();
  const cache = useSearchCache();
  const { level: expLevel, meta: expMeta } = useExperienceLevel();
  const { isFavorited, toggleFavorite } = useFavorites();
  const inputRef       = useRef<HTMLInputElement>(null);
  const abortRef       = useRef<AbortController | null>(null);
  const lastChunkRef   = useRef<number>(0);
  const slowTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const partialRef         = useRef<PartialResult | null>(null); // mirror for use in closures
  const diseaseResultsRef  = useRef<Record<string, { sections: Partial<Record<SectionKey, MedicalSection>>; done: boolean; keywordAnswer: string | null }>>({});

  // Keep partialRef in sync
  useEffect(() => { partialRef.current = partial; }, [partial]);

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

  // Clear timers on unmount
  useEffect(() => () => {
    if (slowTimerRef.current)  clearTimeout(slowTimerRef.current);
    if (stallTimerRef.current) clearInterval(stallTimerRef.current);
  }, []);

  // ── Timer helpers ──

  const startTimers = useCallback(() => {
    if (slowTimerRef.current)  clearTimeout(slowTimerRef.current);
    if (stallTimerRef.current) clearInterval(stallTimerRef.current);

    setSlowWarning(false);
    setStalled(false);
    lastChunkRef.current = Date.now();

    slowTimerRef.current = setTimeout(() => setSlowWarning(true), SLOW_WARNING_MS);

    stallTimerRef.current = setInterval(() => {
      if (Date.now() - lastChunkRef.current > STALL_TIMEOUT_MS) {
        setStalled(true);
        if (stallTimerRef.current) clearInterval(stallTimerRef.current);
      }
    }, 2_000);
  }, []);

  const stopTimers = useCallback(() => {
    if (slowTimerRef.current)  { clearTimeout(slowTimerRef.current);  slowTimerRef.current  = null; }
    if (stallTimerRef.current) { clearInterval(stallTimerRef.current); stallTimerRef.current = null; }
    setSlowWarning(false);
    setStalled(false);
  }, []);

  // ── Core SSE runner (single attempt) ──

  const runStream = useCallback(async (
    disease: string,
    signal: AbortSignal,
    keepExisting: boolean,
  ): Promise<void> => {
    const res = await fetch("/api/medical-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disease }),
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

      lastChunkRef.current = Date.now(); // reset stall clock on every chunk
      setSlowWarning(false);             // clear slow-warning once data arrives

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;

        let payload: SsePayload;
        try { payload = JSON.parse(raw) as SsePayload; } catch { continue; }

        if ("error" in payload) throw new Error(payload.error);
        if ("done"  in payload) { setDone(true); continue; }
        if ("section" in payload) {
          const { section, data } = payload;
          setPartial(prev => {
            if (!prev) return prev;
            return { ...prev, sections: { ...prev.sections, [section]: data } };
          });
        }
      }
    }
  }, []);

  // ── Main search with retry loop ──

  const startFullSearch = useCallback(async (
    disease: string,
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

    if (!opts?.keepPartial) {
      setPartial({ disease, sections: {} });
    }

    addHistory(disease);

    // ── Cache check ──
    const cached = cache.get(disease);
    if (cached && Object.keys(cached).length >= SECTIONS.length) {
      setPartial({ disease, sections: cached });
      setStreaming(false);
      setDone(true);
      setFromCache(true);
      return;
    }

    setStreaming(true);
    startTimers();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (abort.signal.aborted) { stopTimers(); return; }

      if (attempt > 0) {
        setRetrying(true);
        setRetryCount(attempt);
        await new Promise<void>(r => setTimeout(r, 1_500 * attempt));
        if (abort.signal.aborted) { stopTimers(); return; }
        setRetrying(false);
        // Reset stall clock after reconnect delay
        lastChunkRef.current = Date.now();
        setStalled(false);
      }

      try {
        await runStream(disease, abort.signal, !!opts?.keepPartial);

        // Success
        stopTimers();
        setStreaming(false);

        // Save full result to cache
        const current = partialRef.current;
        if (current && Object.keys(current.sections).length > 0) {
          cache.set(disease, current.sections);
        }
        return;

      } catch (err) {
        if ((err as Error).name === "AbortError") { stopTimers(); return; }
        if (abort.signal.aborted) { stopTimers(); return; }

        const canRetry = attempt < MAX_RETRIES && isRetryableClient(err);
        if (!canRetry) {
          stopTimers();
          setStreaming(false);
          setError(classifyError(err));
          if (!opts?.keepPartial) {
            setPartial(null);
            setPhase("idle");
          }
          return;
        }
        // else: loop continues with next attempt
      }
    }

    // Exhausted all retries
    stopTimers();
    setStreaming(false);
    setError("再試行しましたが接続できませんでした。通信環境をご確認ください。");
    if (!opts?.keepPartial) {
      setPartial(null);
      setPhase("idle");
    }
  }, [addHistory, cache, runStream, startTimers, stopTimers]);

  // ── Resume from stall (keep already-loaded sections) ──

  const handleResume = useCallback(() => {
    if (!partial) return;
    startFullSearch(partial.disease, { keepPartial: true });
  }, [partial, startFullSearch]);

  // ── Main search trigger ──

  const handleSearch = useCallback(async (input: string = query, opts?: { direct?: boolean }) => {
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

  const handleClear = () => {
    abortRef.current?.abort();
    stopTimers();
    setPhase("idle");
    setPartial(null);
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
    if (!partial) return;
    await navigator.clipboard.writeText(formatAsText(partial.disease, partial.sections));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Multi-disease / keyword helpers ──────────────────────────────────────

  const toggleCandidateSelection = useCallback((name: string) => {
    setSelectedDiseases(prev =>
      prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]
    );
  }, []);

  const startFullSearchWithKeyword = useCallback((disease: string, keyword: string) => {
    if (keyword) {
      setKeywordAnswer(null);
      setKeywordAnswerLoading(true);
      fetch("/api/keyword-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: keyword, disease }),
      })
        .then(r => r.json())
        .then((data: { answer: string }) => setKeywordAnswer(data.answer ?? null))
        .catch(() => setKeywordAnswer(null))
        .finally(() => setKeywordAnswerLoading(false));
    }
    startFullSearch(disease);
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

    // Save current to cache before switching
    if (partial && tabDiseases[activeDiseaseIdx]) {
      diseaseResultsRef.current[tabDiseases[activeDiseaseIdx]] = {
        sections: partial.sections,
        done,
        keywordAnswer,
      };
    }

    setActiveDiseaseIdx(idx);

    const cached = diseaseResultsRef.current[nextDisease];
    if (cached) {
      setPartial({ disease: nextDisease, sections: cached.sections });
      setDone(cached.done);
      setStreaming(!cached.done);
      setKeywordAnswer(cached.keywordAnswer);
      setKeywordAnswerLoading(false);
      setPhase("results");
      return;
    }

    startFullSearchWithKeyword(nextDisease, originalQuery);
  }, [tabDiseases, activeDiseaseIdx, partial, done, keywordAnswer, originalQuery, startFullSearchWithKeyword]);

  // ─────────────────────────────────────────────────────────────────────────

  const loadedCount   = partial ? Object.keys(partial.sections).length : 0;
  const totalSections = SECTIONS.length;

  const primarySections   = SECTIONS.filter(s =>  PRIMARY_SECTION_KEYS.has(s.key));
  const secondarySections = SECTIONS.filter(s => !PRIMARY_SECTION_KEYS.has(s.key));

  // ── Render ──────────────────────────────────────────────────────────────
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
                <button
                  key={c.name}
                  onClick={() => toggleCandidateSelection(c.name)}
                  className="w-full text-left rounded-xl border px-4 py-4 transition-all"
                  style={{
                    background:   isSelected ? "#FFF7ED" : "white",
                    borderColor:  isSelected ? "#E85D04" : "#e5e7eb",
                    boxShadow:    isSelected ? "0 0 0 1px #E85D04" : undefined,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center mt-0.5 shrink-0 border-2 transition-all"
                      style={{
                        borderColor: isSelected ? "#E85D04" : "#d1d5db",
                        background:  isSelected ? "#E85D04" : "white",
                      }}
                    >
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
            }}
          >
            この疾患で調べる
            {selectedDiseases.length > 0 && `（${selectedDiseases.length}件選択中）`}
          </button>

          <button
            onClick={() => {
              setOriginalQuery("");
              startFullSearch(searchQuery);
            }}
            className="w-full py-3 text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:text-gray-700 transition"
          >
            「{searchQuery}」でそのまま検索する
          </button>
        </div>
      )}

      {/* ══ Error ══ */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center print:hidden">
          <p className="text-red-700 font-medium">エラーが発生しました</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={() => { setError(null); handleSearch(partial?.disease ?? query, { direct: true }); }}
            className="mt-3 text-sm text-red-600 underline hover:no-underline"
          >
            もう一度試す
          </button>
        </div>
      )}

      {/* ══ Results ══ */}
      {phase === "results" && partial && (
        <div>

          {/* ── Disease tabs (multi-disease mode) ── */}
          {tabDiseases.length > 1 && (
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 print:hidden">
              {tabDiseases.map((d, i) => (
                <button
                  key={d}
                  onClick={() => handleTabSwitch(i)}
                  className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap"
                  style={{
                    background:  i === activeDiseaseIdx ? "#1B4332" : "#f3f4f6",
                    color:       i === activeDiseaseIdx ? "white"    : "#374151",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* ── Keyword answer box ── */}
          {originalQuery && (keywordAnswer !== null || keywordAnswerLoading) && (
            <div
              className="mb-5 rounded-2xl overflow-hidden print:hidden"
              style={{
                background:  "#FFF3E0",
                borderLeft:  "4px solid #E85D04",
                border:      "1px solid #FFCC80",
                borderLeftWidth: "4px",
              }}
            >
              <div className="px-5 py-4">
                <p
                  className="font-bold text-base mb-2"
                  style={{ color: "#E85D04" }}
                >
                  あなたの質問への回答
                </p>
                {keywordAnswerLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3.5 h-3.5 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin shrink-0" />
                    <p className="text-sm text-orange-600">準備中...</p>
                  </div>
                ) : (
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: "#1B4332" }}
                  >
                    {keywordAnswer}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  「{originalQuery}」への回答として生成しました
                </p>
              </div>
            </div>
          )}

          {/* ── Section title when in keyword mode ── */}
          {originalQuery && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">疾患の基本情報</p>
            </div>
          )}

          {/* Result header */}
          <div className="flex items-start justify-between mb-4 print:mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 print:text-2xl">「{partial.disease}」</h2>
              <div className="print:hidden mt-0.5">
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
                      {[0,1,2].map(i => (
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
              {done && partial?.disease && (
                <button
                  onClick={() => toggleFavorite({
                    id:          `disease-${partial.disease}`,
                    type:        "disease",
                    title:       partial.disease,
                    diseaseData: { disease: partial.disease, sections: partial.sections },
                  })}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:border-orange-300 transition"
                  aria-label={isFavorited(`disease-${partial.disease}`) ? "お気に入り解除" : "お気に入りに追加"}
                >
                  <HeartIcon filled={isFavorited(`disease-${partial.disease}`)} />
                </button>
              )}
              {done && (
                <>
                  <button
                    onClick={handleCopyAll}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition"
                  >
                    {copied ? "✓ コピー済み" : "📋 全文コピー"}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition"
                  >
                    🖨️ 印刷
                  </button>
                </>
              )}
              <button onClick={handleClear} className="text-xs text-gray-400 hover:text-gray-600 transition px-2">
                {streaming ? "✕ 停止" : "✕ クリア"}
              </button>
            </div>
          </div>

          {/* ── Slow warning banner ── */}
          {slowWarning && streaming && !stalled && !retrying && (
            <div className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 print:hidden">
              <span className="inline-block w-4 h-4 border-2 border-blue-400/40 border-t-blue-500 rounded-full animate-spin shrink-0" />
              <p className="text-sm text-blue-700">生成中です。しばらくお待ちください…</p>
            </div>
          )}

          {/* ── Stall banner with resume button ── */}
          {stalled && !done && !retrying && (
            <div className="mb-4 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 print:hidden">
              <p className="text-sm text-amber-700">
                表示が止まっています。残りの項目を読み込みますか？
              </p>
              <button
                onClick={handleResume}
                className="shrink-0 text-xs font-bold px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
              >
                続きを読み込む
              </button>
            </div>
          )}

          {/* Progress bar */}
          {streaming && !stalled && (
            <div className="w-full bg-gray-100 rounded-full h-1 mb-5 overflow-hidden print:hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(loadedCount / totalSections) * 100}%` }} />
            </div>
          )}

          {/* ── Experience level message ── */}
          {expMeta && done && (
            <div
              className="mb-3 flex items-start gap-2 rounded-xl border px-4 py-3 print:hidden"
              style={{ background: expMeta.bg, borderColor: expMeta.border }}
            >
              <span className="text-base shrink-0 mt-0.5">👨‍⚕️</span>
              <div className="min-w-0">
                <p className="text-xs font-bold mb-0.5" style={{ color: expMeta.color }}>
                  あなた（{expMeta.label}）へのメッセージ
                </p>
                <p className="text-xs leading-relaxed" style={{ color: expMeta.color }}>
                  {expMeta.message}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(["basic", "applied", "expert"] as const).map(t => (
                    <span
                      key={t}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: TIER_BADGE[t].bg, color: TIER_BADGE[t].color }}
                    >
                      {TIER_BADGE[t].label}
                    </span>
                  ))}
                  <span className="text-[10px] text-gray-400 self-center">… は各セクションの難易度バッジです</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Primary sections ── */}
          <div className="space-y-3">
            {primarySections.map(section => {
              const data = partial.sections[section.key];
              if (data) {
                return (
                  <SectionCard
                    key={section.key}
                    section={data}
                    icon={section.icon}
                    colorClass={section.color}
                    disease={partial.disease}
                    sectionKey={section.key}
                    variant="primary"
                    userTier={expMeta?.badgeTier ?? null}
                  />
                );
              }
              return (
                <div key={section.key} className="rounded-xl border border-gray-200 overflow-hidden print:hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-white">
                    <span className="text-xl opacity-20">{section.icon}</span>
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-44" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Divider between primary and secondary */}
          <div className="flex items-center gap-3 mt-5 mb-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-400 tracking-wide">補足情報</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Secondary sections ── */}
          <div className="space-y-1.5">
            {secondarySections.map(section => {
              const data = partial.sections[section.key];
              if (data) {
                return (
                  <SectionCard
                    key={section.key}
                    section={data}
                    icon={section.icon}
                    colorClass={section.color}
                    disease={partial.disease}
                    sectionKey={section.key}
                    variant="secondary"
                    userTier={expMeta?.badgeTier ?? null}
                  />
                );
              }
              return (
                <div key={section.key} className="rounded-xl border border-gray-200 overflow-hidden print:hidden">
                  <div className="flex items-center gap-3 px-5 py-3 bg-white">
                    <span className="text-base opacity-20">{section.icon}</span>
                    <div className="h-3.5 bg-gray-100 rounded animate-pulse w-36" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Comedical section (after main results) ── */}
          {done && (
            <div className="mt-4">
              <ComedicalSection disease={partial.disease} />
            </div>
          )}

          {/* 文献検索ショートカット */}
          {done && partial?.disease && (
            <div className="mt-4 print:hidden">
              <a
                href={`/stage1/literature?q=${encodeURIComponent(partial.disease)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 font-bold text-sm transition hover:opacity-90"
                style={{ borderColor: "#1B4332", color: "#1B4332" }}
              >
                この疾患の関連文献を検索する →
              </a>
            </div>
          )}

          {/* ── 免責・出典注記 ── */}
          {done && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 print:border print:border-gray-300 print:bg-white">
              <p className="text-xs font-bold text-amber-800 mb-1">この情報について</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                この内容は文献・教科書をもとに整理されています。
                最終的な臨床判断は、原典の確認とPT自身の判断のもとで行ってください。
              </p>
              {partial?.disease && (
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <p className="text-[10px] font-bold text-amber-700 mb-1.5">参照文献を確認する</p>
                  <a
                    href={`/stage1/literature?q=${encodeURIComponent(partial.disease)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 transition"
                  >
                    「{partial.disease}」の文献検索で原典を確認する →
                  </a>
                </div>
              )}
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
