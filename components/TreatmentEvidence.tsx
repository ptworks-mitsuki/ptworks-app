"use client";

import { useState, useRef } from "react";
import type { TreatmentEvidenceResult, EvidenceItem } from "@/app/api/treatment-evidence/route";
import type { PatientExplanationResult } from "@/app/api/patient-explanation/route";
import { PatientInfoForm, INITIAL_PATIENT_INFO } from "./PatientInfoForm";
import type { PatientInfo } from "./PatientInfoForm";

// ── Error helpers ─────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const SLOW_MS     = 15_000;

function toJapanese(err: unknown): string {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (m.includes("429") || m.includes("529") || m.includes("overload"))  return "現在アクセスが集中しています。しばらくお待ちください。";
  if (m.includes("timeout"))   return "通信に時間がかかっています。しばらくお待ちください。";
  if (m.includes("fetch"))     return "通信環境をご確認ください。";
  if (/[ぁ-ん]/.test(m))       return err instanceof Error ? err.message : String(err);
  return "現在メンテナンス中です。しばらくお待ちください。";
}

function isRetryable(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return m.includes("429") || m.includes("529") || m.includes("overload") ||
         m.includes("timeout") || m.includes("fetch") || m.includes("network");
}

// ── Study type badge ──────────────────────────────────────────────────────

const STUDY_COLOR: Record<string, { bg: string; text: string }> = {
  "RCT":        { bg: "#dbeafe", text: "#1d4ed8" },
  "系統的レビュー": { bg: "#ede9fe", text: "#7c3aed" },
  "メタ解析":    { bg: "#fce7f3", text: "#be185d" },
  "コホート研究": { bg: "#dcfce7", text: "#15803d" },
};

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const tc = STUDY_COLOR[item.studyType] ?? { bg: "#f3f4f6", text: "#374151" };
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="font-semibold text-blue-900 text-sm leading-tight flex-1">{item.approach}</p>
        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: tc.bg, color: tc.text }}>{item.studyType}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-2">{item.detail}</p>
      <p className="text-xs text-gray-400 font-medium">📄 {item.source}</p>
    </div>
  );
}

function BulletBlock({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").filter(Boolean).map((line, i) => (
        <p key={i} className="text-sm text-gray-800 leading-relaxed">{line}</p>
      ))}
    </div>
  );
}

// ── Patient Explanation display ───────────────────────────────────────────

function ExplanationDisplay({
  result, onClose,
}: { result: PatientExplanationResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const fullText = [
    result.title,
    "",
    ...result.sections.flatMap(s => [`【${s.heading}】`, s.body, ""]),
    result.encouragement,
  ].join("\n");

  return (
    <div className="rounded-2xl border-2 border-green-200 bg-green-50 overflow-hidden">
      <div className="bg-green-600 px-5 py-3.5 flex items-center justify-between">
        <div>
          <p className="text-white font-black text-base">💬 患者さんへの説明文</p>
          <p className="text-green-200 text-xs mt-0.5">そのままお渡しできます</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(fullText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="text-xs font-bold text-white bg-green-500 hover:bg-green-400 px-3 py-1.5 rounded-lg transition"
          >
            {copied ? "✓ コピー済み" : "📋 コピー"}
          </button>
          <button onClick={onClose} className="text-green-200 hover:text-white text-sm transition">✕</button>
        </div>
      </div>
      <div className="px-5 py-5 space-y-4">
        <h3 className="text-lg font-black text-green-900">{result.title}</h3>
        {result.sections.map((s, i) => (
          <div key={i}>
            <p className="text-sm font-bold text-green-800 mb-1.5">【{s.heading}】</p>
            <div className="text-sm text-gray-800 leading-[1.8] space-y-1">
              {s.body.split("\n").map((line, j) => <p key={j}>{line}</p>)}
            </div>
          </div>
        ))}
        <div className="rounded-xl bg-green-100 border border-green-200 px-4 py-3 mt-2">
          <p className="text-sm text-green-800 font-medium leading-relaxed">
            💪 {result.encouragement}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

type Step = "disease" | "form" | "results";

export function TreatmentEvidence() {
  const [step,        setStep]        = useState<Step>("disease");
  const [query,       setQuery]       = useState("");
  const [disease,     setDisease]     = useState("");
  const [patientInfo, setPatientInfo] = useState<PatientInfo>(INITIAL_PATIENT_INFO);
  const [result,      setResult]      = useState<TreatmentEvidenceResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [retrying,    setRetrying]    = useState(false);
  const [retryN,      setRetryN]      = useState(0);
  const [slow,        setSlow]        = useState(false);

  // Patient explanation state
  const [expLoading, setExpLoading] = useState(false);
  const [expResult,  setExpResult]  = useState<PatientExplanationResult | null>(null);
  const [expError,   setExpError]   = useState<string | null>(null);

  const slowRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 1: disease confirmed
  const handleDiseaseNext = () => {
    const q = query.trim();
    if (!q) return;
    setDisease(q);
    setStep("form");
  };

  // Step 2: fetch treatment evidence
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setExpResult(null);
    setRetrying(false);
    setRetryN(0);
    setSlow(false);

    if (slowRef.current) clearTimeout(slowRef.current);
    slowRef.current = setTimeout(() => setSlow(true), SLOW_MS);

    const tryOnce = async (): Promise<TreatmentEvidenceResult> => {
      const res = await fetch("/api/treatment-evidence", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ disease, patientInfo }),
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
        setStep("results");
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

  // Patient explanation
  const handleExplanation = async () => {
    if (!result) return;
    setExpLoading(true);
    setExpError(null);
    setExpResult(null);

    const treatmentSummary = result.standard.points.slice(0, 3).join("、");

    try {
      const res = await fetch("/api/patient-explanation", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ disease, patientInfo, treatmentSummary }),
      });
      const data = await res.json() as PatientExplanationResult | { error: string };
      if ("error" in data) throw new Error(data.error);
      setExpResult(data);
    } catch (err) {
      setExpError(toJapanese(err));
    } finally {
      setExpLoading(false);
    }
  };

  // ── Step 1: Disease input ──────────────────────────────────────────────

  if (step === "disease") {
    return (
      <div className="w-full">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-600 mb-3">
            担当患者さんの疾患名を入力してください
          </p>
          <div className="flex gap-2">
            <input type="text" value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleDiseaseNext()}
              placeholder="例：変形性膝関節症、脳梗塞、腰部脊柱管狭窄症"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none text-gray-900 placeholder-gray-400 text-base transition"
              autoComplete="off"
            />
            <button onClick={handleDiseaseNext} disabled={!query.trim()}
              className="px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap">
              次へ →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Patient info form ──────────────────────────────────────────

  if (step === "form") {
    return (
      <div className="w-full space-y-4">
        {/* Disease header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">対象疾患</p>
            <h2 className="text-xl font-black text-gray-900">「{disease}」</h2>
          </div>
          <button onClick={() => setStep("disease")} className="text-xs text-gray-400 hover:text-gray-600 transition">
            ← 疾患を変更
          </button>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-sm font-bold text-gray-700">患者情報を入力（全てスキップ可）</p>
            <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              入力した情報が提案に反映されます
            </span>
          </div>
          <PatientInfoForm info={patientInfo} onChange={setPatientInfo} />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-xs text-red-400 underline">閉じる</button>
          </div>
        )}

        {/* Submit button */}
        <button type="button" onClick={handleSubmit} disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-black text-base hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-md"
          style={{ background: "linear-gradient(135deg, #15803d, #22c55e)" }}
        >
          {retrying ? (
            <><span className="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />再接続しています…（{retryN}/{MAX_RETRIES}回目）</>
          ) : loading ? (
            <><span className="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />文献・論文をもとに整理中…</>
          ) : (
            <>この患者の治療アプローチを提案する →</>
          )}
        </button>

        {slow && loading && !retrying && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <span className="inline-block w-4 h-4 border-2 border-blue-400/40 border-t-blue-500 rounded-full animate-spin shrink-0" />
            <p className="text-sm text-blue-700">生成中です。しばらくお待ちください…</p>
          </div>
        )}
      </div>
    );
  }

  // ── Step 3: Results ────────────────────────────────────────────────────

  if (step === "results" && result) {
    return (
      <div className="w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">治療アプローチ提案</p>
            <h2 className="text-xl font-black text-gray-900">「{disease}」</h2>
            {(patientInfo.age || patientInfo.gender || patientInfo.goal) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {[patientInfo.age && `${patientInfo.age}歳`, patientInfo.gender, patientInfo.goal && `「${patientInfo.goal}」`].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button onClick={() => { setStep("form"); setResult(null); setExpResult(null); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition">
            ← 条件を変更
          </button>
        </div>

        {/* ① 日本の標準的アプローチ */}
        <div className="rounded-xl border-l-[5px] border-l-green-500 border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-gray-100">
            <span className="text-lg">🏥</span>
            <span className="font-semibold text-green-700 text-base">① 日本の標準的アプローチ</span>
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

        {/* ② 海外の最新エビデンス */}
        <div className="rounded-xl border-l-[5px] border-l-blue-500 border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-gray-100">
            <span className="text-lg">🌍</span>
            <span className="font-semibold text-blue-700 text-base">② 海外の最新エビデンス</span>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              RCT・系統的レビュー
            </span>
          </div>
          <div className="px-5 py-4 space-y-3">
            {result.evidence.map((item, i) => <EvidenceCard key={i} item={item} />)}
          </div>
        </div>

        {/* ③ この患者さんへの個別提案 */}
        <div className="rounded-xl border-l-[5px] border-l-orange-500 border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-gray-100">
            <span className="text-lg">🩺</span>
            <span className="font-semibold text-orange-700 text-base">③ この患者さんへの個別提案</span>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              状態・目標・生活背景に特化
            </span>
          </div>
          <div className="px-5 py-4">
            <BulletBlock text={result.personalized} />
          </div>
        </div>

        {/* 統合コメント */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-xs font-bold text-amber-700 mb-1.5">💡 現場への活用メモ</p>
          <p className="text-sm text-amber-900 leading-relaxed">{result.synthesis}</p>
        </div>

        {/* 全参考文献 */}
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

        {/* ── 患者説明文ボタン ── */}
        {!expResult && (
          <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5">
            <p className="text-sm font-bold text-green-800 mb-1">
              💬 この患者さんへの説明文を作成する
            </p>
            <p className="text-xs text-green-700 mb-4 leading-relaxed">
              入力した患者情報をもとに、専門用語を使わない患者・ご家族向けの説明文を自動生成します。
              そのままお渡しできる形式で作成します。
            </p>
            {expError && <p className="text-red-500 text-xs mb-3">{expError}</p>}
            <button
              onClick={handleExplanation}
              disabled={expLoading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #15803d, #22c55e)" }}
            >
              {expLoading ? (
                <><span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />説明文を生成中…</>
              ) : (
                <>📝 患者さんへの説明文を作成する</>
              )}
            </button>
          </div>
        )}

        {/* Explanation result */}
        {expResult && (
          <ExplanationDisplay result={expResult} onClose={() => setExpResult(null)} />
        )}

        <p className="text-xs text-gray-400 text-center pb-2">
          ※ 文献・論文をもとに整理した情報です。臨床判断には一次文献・専門家への確認をお取りください。
        </p>
      </div>
    );
  }

  return null;
}
