"use client";

import { useState, useRef } from "react";
import type { TreatmentEvidenceResult, EvidenceItem } from "@/app/api/treatment-evidence/route";
import type { PatientExplanationResult } from "@/app/api/patient-explanation/route";
import { PatientInfoForm, INITIAL_PATIENT_INFO } from "./PatientInfoForm";
import type { PatientInfo, HighlightConfig } from "./PatientInfoForm";
import { useSavedPlans } from "@/hooks/useSavedPlans";
import { ComedicalSection } from "./ComedicalSection";
import { saveNewNote } from "@/lib/notes";
import { SaveNoteModal, NoteToast, SaveIconButton } from "@/components/SaveNoteModal";
import { useRouter } from "next/navigation";
import type { TreatmentContext } from "@/app/stage1/homeexercise/page";
import { TREATMENT_CONTEXT_KEY } from "@/app/stage1/homeexercise/page";

interface TreatmentEvidenceProps {
  onSharedDiseaseChange?:     (disease: string) => void;
  onSharedPatientInfoChange?: (info: PatientInfo) => void;
}

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

// ── 疾患カテゴリ判定 → ハイライト設定 ───────────────────────────────────

function detectHighlights(disease: string): HighlightConfig {
  const d = disease;
  const isNeuro   = /脳|stroke|パーキンソン|麻痺|神経|髄|脊髄|片麻|ALS|多発性硬化|ニューロ/.test(d);
  const isOrtho   = /骨折|関節|膝|股|肩|腰|頸|脊椎|TKA|THA|靭帯|腱|整形|変形性|半月板|rotator|椎間板|すべり|狭窄|側弯/.test(d);
  const isCardio  = /心|肺|COPD|呼吸|心不全|循環|狭心|心筋|大動脈|慢性閉塞/.test(d);

  return {
    fim: isNeuro,
    bi:  isNeuro,
    mmt: isOrtho,
    rom: isOrtho,
    nrs: isOrtho || isCardio,
  };
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

// ── Save Plan Modal ───────────────────────────────────────────────────────

function SavePlanModal({
  disease,
  onSave,
  onClose,
}: {
  disease: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <p className="text-base font-black text-gray-900">治療プランに名前をつけて保存</p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) onSave(name.trim()); }}
          placeholder={`例：○○病棟の○○さんのリハ`}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 focus:outline-none text-gray-900 placeholder-gray-400 text-sm"
          autoFocus
        />
        <p className="text-[11px] text-gray-400">疾患「{disease}」の治療提案を保存します</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
            キャンセル
          </button>
          <button
            onClick={() => { if (name.trim()) onSave(name.trim()); }}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-black disabled:opacity-40 transition hover:opacity-90"
            style={{ background: "#E85D04" }}>
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function TreatmentEvidence({
  onSharedDiseaseChange,
  onSharedPatientInfoChange,
}: TreatmentEvidenceProps = {}) {
  const router = useRouter();
  const [showResults, setShowResults]   = useState(false);
  const [query,       setQuery]         = useState("");
  const [disease,     setDisease]       = useState("");
  const [patientInfo, setPatientInfo]   = useState<PatientInfo>(INITIAL_PATIENT_INFO);

  const { savePlan }           = useSavedPlans();
  const [showSaveModal,     setShowSaveModal]     = useState(false);
  const [savedMsg,          setSavedMsg]          = useState(false);
  const [showNoteModal,     setShowNoteModal]      = useState(false);
  const [noteSavedToast,    setNoteSavedToast]     = useState(false);
  const [noteSaved,         setNoteSaved]          = useState(false);

  // 親コンポーネントへの同期（「何でも相談する」タブで患者情報を引き継ぐため）
  const handleQueryChange = (v: string) => {
    setQuery(v);
    onSharedDiseaseChange?.(v);
  };
  const handlePatientInfoChange = (info: PatientInfo) => {
    setPatientInfo(info);
    onSharedPatientInfoChange?.(info);
  };
  const [result,      setResult]        = useState<TreatmentEvidenceResult | null>(null);
  const [loading,     setLoading]       = useState(false);
  const [error,       setError]         = useState<string | null>(null);
  const [retrying,    setRetrying]      = useState(false);
  const [retryN,      setRetryN]        = useState(0);
  const [slow,        setSlow]          = useState(false);

  // Patient explanation state
  const [expLoading, setExpLoading] = useState(false);
  const [expResult,  setExpResult]  = useState<PatientExplanationResult | null>(null);
  const [expError,   setExpError]   = useState<string | null>(null);

  const slowRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 疾患名 → ハイライト設定（リアルタイム）
  const highlights = detectHighlights(query);

  // 送信：治療エビデンス取得
  const handleSubmit = async () => {
    const q = query.trim();
    if (!q) return;
    const currentDisease = q;
    setDisease(currentDisease);
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
        body:    JSON.stringify({ disease: currentDisease, patientInfo }),
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
        setShowResults(true);
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

  // ── 結果表示 ──────────────────────────────────────────────────────────────

  if (showResults && result) {
    return (
      <div className="w-full space-y-5">
        {showSaveModal && (
          <SavePlanModal
            disease={disease}
            onSave={(name) => {
              savePlan(name, disease, patientInfo, result);
              setShowSaveModal(false);
              setSavedMsg(true);
              setTimeout(() => setSavedMsg(false), 2500);
            }}
            onClose={() => setShowSaveModal(false)}
          />
        )}

        {/* ノート保存モーダル */}
        {showNoteModal && result && (
          <SaveNoteModal
            type="treatment"
            defaultTitle={`${disease}${patientInfo.age ? ` ${patientInfo.age}歳` : ""}${patientInfo.gender ? ` ${patientInfo.gender}` : ""}`}
            content={[
              `【疾患名】${disease}`,
              patientInfo.age    ? `【年齢】${patientInfo.age}歳` : "",
              patientInfo.gender ? `【性別】${patientInfo.gender}` : "",
              patientInfo.goal   ? `【目標】${patientInfo.goal}` : "",
              "",
              "【治療方針】",
              ...result.standard.points.map(p => `・${p}`),
              "",
              "【使用文献】",
              ...result.standard.references.map(r => `・${r}`),
            ].filter(Boolean).join("\n")}
            literature={result.standard.references.map(r => ({ title: r, author: "", year: "" }))}
            onSave={({ title, memo, tags }) => {
              const content = [
                `【疾患名】${disease}`,
                patientInfo.age    ? `【年齢】${patientInfo.age}歳` : "",
                patientInfo.gender ? `【性別】${patientInfo.gender}` : "",
                patientInfo.goal   ? `【目標】${patientInfo.goal}` : "",
                "",
                "【治療方針】",
                ...result.standard.points.map(p => `・${p}`),
              ].filter(Boolean).join("\n");
              saveNewNote({
                type:       "treatment",
                title,
                content,
                memo,
                tags,
                literature: result.standard.references.map(r => ({ title: r, author: "", year: "" })),
              });
              setNoteSaved(true);
              setShowNoteModal(false);
              setNoteSavedToast(true);
              setTimeout(() => setNoteSavedToast(false), 2000);
            }}
            onCancel={() => setShowNoteModal(false)}
          />
        )}
        <NoteToast visible={noteSavedToast} />

        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">治療アプローチ提案</p>
            <h2 className="text-xl font-black text-gray-900">「{disease}」</h2>
            {(patientInfo.age || patientInfo.gender || patientInfo.goal) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {[patientInfo.age && `${patientInfo.age}歳`, patientInfo.gender, patientInfo.goal && `「${patientInfo.goal}」`].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SaveIconButton saved={noteSaved} onClick={() => setShowNoteModal(true)} />
            <button
              onClick={() => { setShowResults(false); setResult(null); setExpResult(null); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              ← 条件を変更
            </button>
          </div>
        </div>

        {/* 保存成功メッセージ */}
        {savedMsg && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-sm font-semibold text-orange-700">
            治療プランを保存しました
          </div>
        )}

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

        {/* 患者説明文 */}
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
        {expResult && <ExplanationDisplay result={expResult} onClose={() => setExpResult(null)} />}

        {/* 保存ボタン */}
        <button
          onClick={() => setShowSaveModal(true)}
          className="w-full py-3.5 rounded-2xl border-2 font-black text-sm transition hover:opacity-90 flex items-center justify-center gap-2"
          style={{ borderColor: "#E85D04", color: "#E85D04" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          この内容を保存する
        </button>

        {/* 文献検索ショートカット */}
        {query && (
          <a
            href={`/stage1/literature?q=${encodeURIComponent(query)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 font-bold text-sm transition hover:opacity-90"
            style={{ borderColor: "#1B4332", color: "#1B4332" }}
          >
            この治療に関連する文献を検索する →
          </a>
        )}

        {/* 自主トレ指導書作成ボタン */}
        {result && (
          <button
            onClick={() => {
              const ctx: TreatmentContext = {
                disease,
                treatmentContent: [
                  ...result.standard.points,
                  ...result.evidence.map(e => `${e.approach}：${e.detail}`),
                  result.synthesis,
                ].join("\n"),
                references: result.references,
              };
              try { localStorage.setItem(TREATMENT_CONTEXT_KEY, JSON.stringify(ctx)); } catch { /* ignore */ }
              router.push("/stage1/homeexercise");
            }}
            className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[0.98] shadow-md"
            style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
            </svg>
            自主トレ指導書を作成する →
          </button>
        )}

        <div className="mt-4"><ComedicalSection disease={disease} /></div>

        <p className="text-xs text-gray-400 text-center pb-2">
          ※ 文献・論文をもとに整理した情報です。臨床判断には一次文献・専門家への確認をお取りください。
        </p>
      </div>
    );
  }

  // ── 入力フォーム（疾患名＋患者情報を最初から同時表示） ─────────────────

  // ハイライトが1件以上あるか（ラベル表示用）
  const hasHighlight = Object.values(highlights).some(Boolean);

  return (
    <div className="w-full space-y-4">

      {/* ── 疾患名入力 ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-600 mb-3">
          担当患者さんの疾患名を入力してください
        </p>
        <input
          type="text"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="例：変形性膝関節症、脳梗塞、腰部脊柱管狭窄症"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-100 focus:outline-none text-gray-900 placeholder-gray-400 text-base transition"
          autoComplete="off"
        />

        {/* ハイライト案内（疾患名入力後に表示） */}
        {hasHighlight && (
          <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="#16a34a" strokeWidth="1.5"/>
              <path d="M5.5 8.5l2 2 3-4" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>
              <span className="font-bold">「{query}」</span> に関連性が高い項目を
              <span className="font-bold text-green-800"> 緑色 </span>
              でハイライトしています
            </span>
          </div>
        )}
      </div>

      {/* ── 患者情報フォーム（最初から表示） ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-sm font-bold text-gray-700">患者情報を入力</p>
          <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            全てスキップ可・入力した情報が提案に反映されます
          </span>
        </div>
        <PatientInfoForm
          info={patientInfo}
          onChange={handlePatientInfoChange}
          highlights={highlights}
        />
      </div>

      {/* エラー */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-xs text-red-400 underline">閉じる</button>
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !query.trim()}
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
