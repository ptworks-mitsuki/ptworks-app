"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MedicalSection, SectionKey, SECTIONS, PRIMARY_SECTION_KEYS, Suggestion } from "@/types/medical";
import { SectionCard } from "./SectionCard";
import { useSearchHistory } from "@/hooks/useSearchHistory";
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

const QUICK_SEARCHES = [
  "脳梗塞", "変形性膝関節症", "腰部脊柱管狭窄症", "パーキンソン病",
  "慢性閉塞性肺疾患", "骨粗鬆症", "肩関節周囲炎", "糖尿病性神経障害",
];

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
    lines.push(stripMarkers(data.content));
    if (data.references.length > 0) {
      lines.push("  参考文献:");
      data.references.forEach((r, i) => lines.push(`  ${i + 1}. ${r}`));
    }
    lines.push("");
  }
  lines.push("※ 本情報はAI生成です。臨床判断は専門家の責任において行ってください。");
  return lines.join("\n");
}

// ─── Component ─────────────────────────────────────────────────────────────

export function MedicalSearch() {
  const [query,       setQuery]       = useState("");
  const [phase,       setPhase]       = useState<Phase>("idle");
  const [candidates,  setCandidates]  = useState<Suggestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [partial,     setPartial]     = useState<PartialResult | null>(null);
  const [streaming,   setStreaming]   = useState(false);
  const [done,        setDone]        = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);

  const { history, addHistory, removeHistory, clearHistory } = useSearchHistory();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  // ── Start the streaming 7-section search ──
  const startFullSearch = useCallback(async (disease: string) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setPhase("results");
    setStreaming(true);
    setDone(false);
    setError(null);
    setCopied(false);
    setPartial({ disease, sections: {} });
    addHistory(disease);

    try {
      const res = await fetch("/api/medical-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "エラーが発生しました");
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done: rd, value } = await reader.read();
        if (rd) break;

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
            setPartial(prev =>
              prev ? { ...prev, sections: { ...prev.sections, [section]: data } } : prev
            );
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setPartial(null);
      setPhase("idle");
    } finally {
      setStreaming(false);
    }
  }, [addHistory]);

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
        setCandidates(data.candidates);
        setPhase("candidates");
      }
    } catch {
      startFullSearch(q);
    }
  }, [query, startFullSearch]);

  const handleClear = () => {
    abortRef.current?.abort();
    setPhase("idle");
    setPartial(null);
    setDone(false);
    setError(null);
    setQuery("");
    setCandidates([]);
    inputRef.current?.focus();
  };

  const handleCopyAll = async () => {
    if (!partial) return;
    await navigator.clipboard.writeText(formatAsText(partial.disease, partial.sections));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const loadedCount   = partial ? Object.keys(partial.sections).length : 0;
  const totalSections = SECTIONS.length;

  // Derived section lists
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

      {/* ══ Candidate list ══ */}
      {phase === "candidates" && (
        <div className="animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">「{searchQuery}」の関連疾患</p>
              <h2 className="text-lg font-bold text-gray-900">疾患を選択してください</h2>
            </div>
            <button onClick={handleClear} className="text-sm text-gray-400 hover:text-gray-600 transition">← 戻る</button>
          </div>

          <div className="space-y-2 mb-4">
            {candidates.map(c => (
              <button
                key={c.name}
                onClick={() => startFullSearch(c.name)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-blue-400 hover:shadow-sm transition group flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition text-base">{c.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{c.description}</p>
                </div>
                <span className="text-gray-300 group-hover:text-blue-400 text-lg ml-4 transition">→</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => startFullSearch(searchQuery)}
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
          <button onClick={() => handleSearch()} className="mt-3 text-sm text-red-600 underline hover:no-underline">もう一度試す</button>
        </div>
      )}

      {/* ══ Results ══ */}
      {phase === "results" && partial && (
        <div>
          {/* Result header */}
          <div className="flex items-start justify-between mb-4 print:mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 print:text-2xl">「{partial.disease}」</h2>
              <div className="print:hidden mt-0.5">
                {streaming ? (
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
                  <p className="text-xs text-green-600">✓ {totalSections} 項目生成完了</p>
                ) : null}
              </div>
              <p className="hidden print:block text-sm text-gray-500 mt-1">
                生成日時：{new Date().toLocaleString("ja-JP")}
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
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

          {/* Progress bar */}
          {streaming && (
            <div className="w-full bg-gray-100 rounded-full h-1 mb-5 overflow-hidden print:hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(loadedCount / totalSections) * 100}%` }} />
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

          <p className="text-xs text-gray-400 text-center mt-5 pb-2 print:hidden">
            ※ AI生成情報です。臨床判断には必ず一次文献・専門家への確認をお取りください。
          </p>
        </div>
      )}
    </div>
  );
}
