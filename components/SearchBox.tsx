"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { categories, routeIntent } from "@/app/config/service-guide";
import type { ServiceRoute, Subcategory } from "@/app/config/service-guide";

// ─── Types ────────────────────────────────────────────────────────────────

type Mode =
  | "closed"
  | "categories"
  | "subcategories"
  | "intents"
  | "free-input"
  | "result";

function dotStep(mode: Mode): 1 | 2 | 3 {
  if (mode === "categories") return 1;
  if (mode === "result")     return 3;
  return 2;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1.5">
      {([1, 2, 3] as const).map(i => (
        <span key={i} className="rounded-full transition-all duration-200"
          style={{
            width:      i <= step ? "8px" : "6px",
            height:     i <= step ? "8px" : "6px",
            background: i <= step ? "#E85D04" : "#D1D5DB",
          }}
        />
      ))}
    </div>
  );
}

function OptionButton({
  label, onClick, muted = false,
}: {
  label: string; onClick: () => void; muted?: boolean;
}) {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onMouseLeave={() => setActive(false)}
      className="w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all"
      style={{
        background:   active ? "#FFF7ED" : "#FAFAFA",
        borderColor:  active ? "#E85D04" : "#E5E7EB",
        color:        muted  ? "#9CA3AF"  : "#1A1A1A",
      }}
    >
      {label}
    </button>
  );
}

function ResultCard({
  query, route, onReset,
}: {
  query: string; route: ServiceRoute; onReset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1.5px solid #E85D04" }}>
      <div className="py-1 text-center text-[10px] font-black text-white tracking-widest"
        style={{ background: "#E85D04" }}>
        おすすめのサービス
      </div>
      <div className="px-5 py-5 bg-white">
        <p className="text-base font-black text-gray-900 mb-1">
          「{route.service}」が最適です
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">{route.desc}</p>
        <button
          type="button"
          onClick={() => {
            const url = query.trim()
              ? `${route.url}?q=${encodeURIComponent(query.trim())}`
              : route.url;
            router.push(url);
          }}
          className="w-full py-3.5 rounded-xl font-black text-white text-sm transition hover:opacity-90 active:scale-[0.98]"
          style={{ background: "#E85D04" }}
        >
          {route.service}を開く →
        </button>
        <button
          type="button"
          onClick={onReset}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          ← 最初からやり直す
        </button>
      </div>
    </div>
  );
}

// ─── SearchBox (main) ─────────────────────────────────────────────────────

export function SearchBox() {
  const router = useRouter();
  const [query,        setQuery]        = useState("");
  const [mode,         setMode]         = useState<Mode>("closed");
  const [prevMode,     setPrevMode]     = useState<Mode>("closed");
  const [catId,        setCatId]        = useState<string | null>(null);
  const [intentOpts,   setIntentOpts]   = useState<string[]>([]);
  const [loadingOpts,  setLoadingOpts]  = useState(false);
  const [serviceRoute, setServiceRoute] = useState<ServiceRoute | null>(null);
  const [freeText,     setFreeText]     = useState("");
  const [freeRoutes,   setFreeRoutes]   = useState<ServiceRoute[]>([]);
  const [freeIdx,      setFreeIdx]      = useState(0);

  const wrapRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const textaRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef   = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCat = categories.find(c => c.id === catId) ?? null;

  // ── 外クリックで閉じる ──────────────────────────────────────────────────
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMode("closed");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ── free-input にフォーカス ──────────────────────────────────────────────
  useEffect(() => {
    if (mode === "free-input") setTimeout(() => textaRef.current?.focus(), 50);
  }, [mode]);

  // ── テキスト変化 → デバウンス → API ──────────────────────────────────────
  const fetchIntents = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setLoadingOpts(true);
    setIntentOpts([]);
    try {
      const res = await fetch("/api/search-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: q }),
        signal:  abort.signal,
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json() as { options: string[] };
      if (!abort.signal.aborted) setIntentOpts(data.options);
    } catch {
      // ignore abort / errors — fallback gracefully
    } finally {
      if (!abort.signal.aborted) setLoadingOpts(false);
    }
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      abortRef.current?.abort();
      setLoadingOpts(false);
      setIntentOpts([]);
      setPrevMode("categories");
      setMode("categories");
      return;
    }

    setPrevMode(mode === "closed" ? "categories" : mode);
    setMode("intents");
    setLoadingOpts(true);
    setIntentOpts([]);
    debounceRef.current = setTimeout(() => fetchIntents(val.trim()), 500);
  };

  // ── フォーカス ──────────────────────────────────────────────────────────
  const handleFocus = () => {
    if (mode === "closed" && !query.trim()) {
      setPrevMode("closed");
      setMode("categories");
    }
  };

  // ── ナビゲーションヘルパー ──────────────────────────────────────────────
  function goMode(next: Mode, prev?: Mode) {
    setPrevMode(prev ?? mode);
    setMode(next);
  }

  function handleBack() {
    if (mode === "subcategories") { goMode("categories"); setCatId(null); }
    else if (mode === "intents")  { goMode("categories"); }
    else if (mode === "free-input") { goMode(prevMode); }
    else if (mode === "result")   { goMode(prevMode); setServiceRoute(null); }
    else                          { setMode("closed"); }
  }

  function handleReset() {
    setQuery("");
    setCatId(null);
    setIntentOpts([]);
    setServiceRoute(null);
    setFreeText("");
    setFreeRoutes([]);
    setFreeIdx(0);
    goMode("categories", "closed");
    inputRef.current?.focus();
  }

  // ── カテゴリ選択 ──────────────────────────────────────────────────────────
  function handleCatSelect(id: string) {
    setCatId(id);
    goMode("subcategories");
  }

  // ── サブカテゴリ選択 ──────────────────────────────────────────────────────
  function handleSubSelect(sub: Subcategory) {
    const route = routeIntent(query || sub.label, sub.label);
    setServiceRoute(route);
    goMode("result", "subcategories");
  }

  // ── インテント選択 ────────────────────────────────────────────────────────
  function handleIntentSelect(intent: string) {
    const route = routeIntent(query, intent);
    setServiceRoute(route);
    goMode("result", "intents");
  }

  // ── 自由記述送信 ─────────────────────────────────────────────────────────
  function handleFreeSubmit() {
    const seed = freeText.trim() || query.trim();
    if (!seed) return;
    const routes = buildFreeRoutes(seed);
    setFreeRoutes(routes);
    setFreeIdx(0);
    setServiceRoute(routes[0] ?? null);
    goMode("result", "free-input");
  }

  function buildFreeRoutes(text: string): ServiceRoute[] {
    const intents = [text];
    const seen = new Set<string>();
    const result: ServiceRoute[] = [];
    for (const intent of intents) {
      const r = routeIntent(text, intent);
      if (!seen.has(r.service)) { seen.add(r.service); result.push(r); }
    }
    // Also check the reverse intent
    const alt = routeIntent(text, text + " 基本情報");
    if (!seen.has(alt.service)) result.push(alt);
    return result.slice(0, 2);
  }

  // ─── Render ────────────────────────────────────────────────────────────

  const showDropdown = mode !== "closed";
  const step = dotStep(mode);
  const canBack = mode !== "closed" && mode !== "categories";

  return (
    <div ref={wrapRef} className="relative">
      {/* 検索入力 */}
      <div
        className="flex items-center rounded-2xl overflow-hidden transition-all"
        style={{
          border:     `2px solid ${showDropdown ? "#E85D04" : "#E85D04"}`,
          boxShadow:  "0 4px 20px rgba(232,93,4,0.15)",
        }}
      >
        <span className="pl-4 text-gray-400 shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={e => {
            if (e.key === "Escape") setMode("closed");
            if (e.key === "Enter" && query.trim()) {
              router.push(`/pt-gpt?q=${encodeURIComponent(query.trim())}`);
            }
          }}
          placeholder={`疾患・術式・症状・キーワードを入力して${"\n"}はじめましょう`}
          className="flex-1 px-3 py-3.5 text-sm bg-white outline-none placeholder-gray-400"
          style={{ color: "#1A1A1A" }}
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={() => { handleQueryChange(""); inputRef.current?.focus(); }}
            className="pr-2 text-gray-300 hover:text-gray-500 transition shrink-0">
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13"/>
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const q = query.trim();
            if (q) {
              // テキスト入力ありの場合は PT-GPT へ直接遷移
              router.push(`/pt-gpt?q=${encodeURIComponent(q)}`);
            } else {
              goMode("categories");
            }
          }}
          className="px-5 py-3.5 text-sm font-black text-white transition hover:opacity-90 active:scale-95"
          style={{ background: "#E85D04" }}>
          検索
        </button>
      </div>

      {/* ドロップダウン */}
      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl overflow-hidden z-40"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.14)", border: "1px solid #F3F4F6" }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-4 pt-3 pb-0">
            <div className="flex items-center gap-3">
              {canBack && (
                <button type="button" onClick={handleBack}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                    <path d="M10 13L5 8l5-5"/>
                  </svg>
                  戻る
                </button>
              )}
              <ProgressDots step={step} />
            </div>
            <button type="button" onClick={() => setMode("closed")}
              className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition"
              aria-label="閉じる">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                <path d="M1 1l12 12M13 1L1 13"/>
              </svg>
            </button>
          </div>

          {/* コンテンツ */}
          <div className="px-4 pt-3 pb-5 max-h-[70vh] overflow-y-auto">

            {/* ── カテゴリ ──────────────────────────────── */}
            {mode === "categories" && (
              <>
                <p className="text-sm font-black text-gray-900 mb-1">何にお悩みですか？</p>
                <p className="text-xs text-gray-400 mb-3">当てはまるものを選んでください</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <OptionButton key={cat.id} label={cat.label} onClick={() => handleCatSelect(cat.id)} />
                  ))}
                  <OptionButton label="その他・自由に入力する" onClick={() => goMode("free-input")} muted />
                </div>
              </>
            )}

            {/* ── サブカテゴリ ───────────────────────────── */}
            {mode === "subcategories" && selectedCat && (
              <>
                <p className="text-sm font-black text-gray-900 mb-1">もう少し詳しく教えてください</p>
                <p className="text-xs text-gray-400 mb-3">{selectedCat.label}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedCat.subcategories.map(sub => (
                    <OptionButton key={sub.id} label={sub.label} onClick={() => handleSubSelect(sub)} />
                  ))}
                  <OptionButton label="その他・自由に入力する" onClick={() => goMode("free-input", "subcategories")} muted />
                </div>
              </>
            )}

            {/* ── AI インテント ──────────────────────────── */}
            {mode === "intents" && (
              <>
                <p className="text-sm font-black text-gray-900 mb-1">
                  「{query}」について何を知りたいですか？
                </p>
                <p className="text-xs text-gray-400 mb-3">当てはまるものを選んでください</p>
                {loadingOpts ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
                    <span className="inline-block w-4 h-4 border-2 border-gray-200 border-t-orange-400 rounded-full animate-spin shrink-0" />
                    選択肢を生成中...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {intentOpts.map((opt, i) => (
                      <OptionButton key={i} label={opt} onClick={() => handleIntentSelect(opt)} />
                    ))}
                    {intentOpts.length === 0 && (
                      <p className="text-xs text-gray-400 py-2">選択肢を取得できませんでした</p>
                    )}
                    <OptionButton label="その他・自由に入力する" onClick={() => goMode("free-input", "intents")} muted />
                  </div>
                )}
              </>
            )}

            {/* ── 自由記述 ───────────────────────────────── */}
            {mode === "free-input" && (
              <>
                <p className="text-sm font-black text-gray-900 mb-1">お悩みを自由に入力してください</p>
                <p className="text-xs text-gray-400 mb-3">AIが最適なサービスを提案します</p>
                <textarea
                  ref={textaRef}
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey && freeText.trim()) {
                      e.preventDefault();
                      handleFreeSubmit();
                    }
                  }}
                  placeholder="例：患者の治療方針が決まらず困っています"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border text-sm resize-none focus:outline-none focus:border-orange-400 transition"
                  style={{ borderColor: "#E5E7EB", color: "#1A1A1A" }}
                />
                <button
                  type="button"
                  onClick={handleFreeSubmit}
                  disabled={!freeText.trim()}
                  className="mt-2 w-full py-3 rounded-xl font-black text-white text-sm transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: "#E85D04" }}
                >
                  サービスを提案してもらう →
                </button>
              </>
            )}

            {/* ── 結果 ───────────────────────────────────── */}
            {mode === "result" && serviceRoute && (
              <>
                <ResultCard
                  query={freeText.trim() || query.trim()}
                  route={serviceRoute}
                  onReset={handleReset}
                />
                {freeRoutes.length > 1 && freeIdx < freeRoutes.length - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = freeIdx + 1;
                      setFreeIdx(next);
                      setServiceRoute(freeRoutes[next]);
                    }}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold border transition hover:border-gray-400"
                    style={{ borderColor: "#E5E7EB", color: "#555" }}
                  >
                    別のサービスを見る
                  </button>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
