"use client";

import { useState, useRef } from "react";
import type { TreatmentEvidenceResult, EvidenceItem } from "@/app/api/treatment-evidence/route";

const MAX_RETRIES = 3;
const SLOW_MS = 15_000;

const STUDY_TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  "RCT":        { bg: "#dbeafe", text: "#1d4ed8" },
  "系統的レビュー": { bg: "#ede9fe", text: "#7c3aed" },
  "メタ解析":    { bg: "#fce7f3", text: "#be185d" },
  "コホート研究": { bg: "#dcfce7", text: "#15803d" },
};

function toJapanese(err: unknown): string {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (m.includes("429") || m.includes("529") || m.includes("overload") || m.includes("アクセスが集中")) {
    return "現在アクセスが集中しています。しばらくお待ちください。";
  }
  if (m.includes("timeout") || m.includes("時間がかかって")) {
    return "通信に時間がかかっています。しばらくお待ちください。";
  }
  if (m.includes("fetch") || m.includes("network")) {
    return "通信環境をご確認ください。";
  }
  if (/[ぁ-ん]/.test(m)) return err instanceof Error ? err.message : String(err);
  return "現在メンテナンス中です。しばらくお待ちください。";
}

function isRetryable(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return m.includes("429") || m.includes("529") || m.includes("overload") ||
         m.includes("timeout") || m.includes("fetch") || m.includes("network");
}

function BulletBlock({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {text.split("\n").filter(Boolean).map((line, i) => (
        <p key={i} className="text-sm text-gray-800 leading-relaxed">{line}</p>
      ))}
    </div>
  );
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const tc = STUDY_TYPE_COLOR[item.studyType] ?? { bg: "#f3f4f6", text: "#374151" };
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="font-semibold text-blue-900 text-sm leading-tight flex-1">{item.approach}</p>
        <span
          className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: tc.bg, color: tc.text }}
        >
          {item.studyType}
        </span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-2">{item.detail}</p>
      <p className="text-xs text-gray-400 font-medium">📄 {item.source}</p>
    </div>
  );
}

export function TreatmentEvidence() {
  const [query,    setQuery]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<TreatmentEvidenceResult | null>(null);
  const [disease,  setDisease]  = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryN,   setRetryN]   = useState(0);
  const [slow,     setSlow]     = useState(false);
  const slowRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = async (q = query) => {
    const term = q.trim();
    if (!term) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setDisease(term);
    setRetrying(false);
    setRetryN(0);
    setSlow(false);

    if (slowRef.current) clearTimeout(slowRef.current);
    slowRef.current = setTimeout(() => setSlow(true), SLOW_MS);

    const tryOnce = async (): Promise<TreatmentEvidenceResult> => {
      const res = await fetch("/api/treatment-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease: term }),
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) throw new Error("non-json");
      const data = await res.json() as TreatmentEvidenceResult | { error: string };
      if ("error" in data) throw new Error(data.error);
      return data;
    };

    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        setRetrying(true);
        setRetryN(attempt);
        await new Promise<void>(r => setTimeout(r, 1_500 * attempt));
        setRetrying(false);
      }
      try {
        const data = await tryOnce();
        if (slowRef.current) clearTimeout(slowRef.current);
        setSlow(false);
        setResult(data);
        setLoading(false);
        return;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_RETRIES && isRetryable(err)) continue;
        break;
      }
    }
    if (slowRef.current) clearTimeout(slowRef.current);
    setSlow(false);
    setError(toJapanese(lastErr));
    setLoading(false);
  };

  return (
    <div className="w-full">
      {/* ── Search box ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="疾患名を入力（例：変形性膝関節症、脳梗塞）"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none text-gray-900 placeholder-gray-400 text-base transition"
            disabled={loading}
            autoComplete="off"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {retrying ? `再接続中…(${retryN}/${MAX_RETRIES})` : "生成中…"}
              </span>
            ) : "検索"}
          </button>
        </div>

        {slow && loading && !retrying && (
          <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
            <span className="inline-block w-3.5 h-3.5 border-2 border-blue-400/40 border-t-blue-500 rounded-full animate-spin shrink-0" />
            <p className="text-xs text-blue-700">生成中です。しばらくお待ちください…</p>
          </div>
        )}

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={() => handleSearch()} className="mt-2 text-xs text-red-500 underline">もう一度試す</button>
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {result && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">「{disease}」の治療アプローチ</h2>
            <span className="text-xs text-gray-400">教科書＋最新エビデンス</span>
          </div>

          {/* ── 日本の標準的アプローチ ── */}
          <div className="rounded-xl border-l-[5px] border-l-green-500 border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-gray-100">
              <span className="text-lg">🏥</span>
              <span className="font-semibold text-green-700 text-base">日本の標準的アプローチ</span>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                教科書・ガイドライン準拠
              </span>
            </div>
            <div className="px-5 py-4">
              <BulletBlock text={result.standard.points.join("\n")} />
              {result.standard.references.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 mb-2">出典</p>
                  <ul className="space-y-1">
                    {result.standard.references.map((r, i) => (
                      <li key={i} className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                        {i + 1}. {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ── 海外の最新エビデンス ── */}
          <div className="rounded-xl border-l-[5px] border-l-blue-500 border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-gray-100">
              <span className="text-lg">🌍</span>
              <span className="font-semibold text-blue-700 text-base">海外の最新エビデンス</span>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                RCT・系統的レビュー
              </span>
            </div>
            <div className="px-5 py-4 space-y-3">
              {result.evidence.map((item, i) => (
                <EvidenceCard key={i} item={item} />
              ))}
            </div>
          </div>

          {/* ── 統合コメント ── */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-xs font-bold text-amber-700 mb-1.5">💡 現場への活用メモ</p>
            <p className="text-sm text-amber-900 leading-relaxed">{result.synthesis}</p>
          </div>

          {/* ── 全参考文献 ── */}
          {result.references.length > 0 && (
            <details className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-50 transition select-none">
                📚 全参考文献（{result.references.length}件）
              </summary>
              <ul className="px-5 pb-4 space-y-1.5 border-t border-gray-100 pt-3">
                {result.references.map((r, i) => (
                  <li key={i} className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                    {i + 1}. {r}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <p className="text-xs text-gray-400 text-center pb-2">
            ※ 文献・論文をもとに整理した情報です。臨床判断には一次文献・専門家への確認をお取りください。
          </p>
        </div>
      )}
    </div>
  );
}
