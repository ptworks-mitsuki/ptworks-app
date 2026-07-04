"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { categories } from "@/app/config/service-guide";
import type { Subcategory } from "@/app/config/service-guide";

// ─── 自由記述マッチャー ────────────────────────────────────────────────────

interface MatchResult {
  service: string;
  url:     string;
  reason:  string;
}

const KEYWORD_MAP: Array<{ keywords: string[]; service: string; url: string; reason: string }> = [
  { keywords: ["治療","リハビリ","方針","アプローチ","プログラム"],          service: "治療を考える",         url: "/stage1", reason: "治療方針・リハビリアプローチの提案に最適です" },
  { keywords: ["疾患","病気","診断","定義","概要","症状"],                   service: "疾患を調べる",          url: "/stage1", reason: "疾患情報を教科書・ガイドライン基準で確認できます" },
  { keywords: ["評価","スケール","MMT","FIM","BI","NRS","テスト","検査"],    service: "疾患を調べる",          url: "/stage1", reason: "評価・検査項目を疾患別に確認できます" },
  { keywords: ["禁忌","リスク","注意","危険","禁止"],                        service: "疾患を調べる",          url: "/stage1", reason: "禁忌・リスク管理の情報を確認できます" },
  { keywords: ["自主トレ","指導書","ホームエクサ","体操","運動指導"],        service: "自主トレ指導書作成",    url: "/stage1/homeexercise", reason: "患者向け自主トレ指導書を自動生成できます" },
  { keywords: ["スライド","発表","学会","プレゼン","原稿"],                  service: "スライド自動生成",      url: "/stage1/slides", reason: "学会発表スライドを自動生成できます" },
  { keywords: ["論文","文献","根拠","エビデンス","研究"],                    service: "文献検索",              url: "/stage1/literature", reason: "関連論文・文献を素早く検索できます" },
  { keywords: ["参考書","教科書","書籍","テキスト"],                         service: "参考書検索",            url: "/stage1/literature", reason: "おすすめの参考書・教科書を検索できます" },
  { keywords: ["算定","加算","点数","診療報酬","請求","減算"],               service: "診療報酬・算定ガイド",  url: "/stage1/learning/diagnosis", reason: "診療報酬・算定ルールを確認できます" },
  { keywords: ["副業","収入","稼ぐ","コンテンツ","動画","販売"],            service: "副業支援パック",        url: "/stage2", reason: "PT向け副業の始め方をサポートします" },
  { keywords: ["開業","独立","院","経営","整体"],                            service: "開業・院運営パック",    url: "/stage3", reason: "開業・院運営に必要な情報を提供します" },
  { keywords: ["解剖","筋肉","起始","停止","神経","血管"],                   service: "何でも相談する",        url: "/stage1", reason: "解剖学的な質問に詳しく答えます" },
  { keywords: ["学習","勉強","知識","スキル","資格","セミナー"],             service: "学習コンテンツ",        url: "/stage1/learning", reason: "PTとしての知識・スキルアップをサポートします" },
];

function matchFreeText(text: string): MatchResult[] {
  if (!text.trim()) return [];
  const t = text.toLowerCase();
  const scored = KEYWORD_MAP.map(entry => ({
    ...entry,
    score: entry.keywords.filter(kw => t.includes(kw)).length,
  })).filter(e => e.score > 0).sort((a, b) => b.score - a.score);

  const seen  = new Set<string>();
  const dedup = scored.filter(e => {
    if (seen.has(e.service)) return false;
    seen.add(e.service);
    return true;
  }).slice(0, 2);

  if (dedup.length === 0) {
    return [{ service: "何でも相談する", url: "/stage1", reason: "まず何でも相談してみましょう" }];
  }
  return dedup;
}

// ─── ProgressDots ─────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width:      i < current ? "8px" : "6px",
            height:     i < current ? "8px" : "6px",
            background: i < current ? "#E85D04" : "#D1D5DB",
          }}
        />
      ))}
    </div>
  );
}

// ─── ResultCard ───────────────────────────────────────────────────────────

function ResultCard({
  service, url, reason, onReset,
}: {
  service: string; url: string; reason: string; onReset: () => void;
}) {
  const router = useRouter();
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1.5px solid #E85D04" }}>
      <div className="px-1 py-1 text-center text-[10px] font-black text-white tracking-wider uppercase"
        style={{ background: "#E85D04" }}>
        おすすめのサービス
      </div>
      <div className="px-5 py-5 bg-white">
        <p className="text-lg font-black text-gray-900 mb-1">
          「{service}」が最適です
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mb-5">{reason}</p>
        <button
          onClick={() => router.push(url)}
          className="w-full py-3.5 rounded-xl font-black text-white text-sm transition hover:opacity-90 active:scale-[0.98]"
          style={{ background: "#E85D04" }}
        >
          {service}を開く →
        </button>
      </div>
      <div className="px-5 pb-4 bg-white">
        <button
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          ← 最初からやり直す
        </button>
      </div>
    </div>
  );
}

// ─── ServiceGuide (メイン) ────────────────────────────────────────────────

type StepId = "s1" | "s2" | "s3" | "free";

interface Props {
  onClose: () => void;
}

export function ServiceGuide({ onClose }: Props) {
  const [stepId,       setStepId]       = useState<StepId>("s1");
  const [prevStepId,   setPrevStepId]   = useState<StepId | null>(null);
  const [catId,        setCatId]        = useState<string | null>(null);
  const [result,       setResult]       = useState<{ service: string; url: string; reason: string } | null>(null);
  const [freeResults,  setFreeResults]  = useState<MatchResult[]>([]);
  const [freeText,     setFreeText]     = useState("");
  const [freeIdx,      setFreeIdx]      = useState(0);
  const [sliding,      setSliding]      = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const dotStep = stepId === "s1" ? 1 : stepId === "s2" ? 2 : 3;

  function goTo(next: StepId) {
    if (sliding) return;
    setSliding(true);
    setPrevStepId(stepId);
    setTimeout(() => {
      setStepId(next);
      setSliding(false);
    }, 200);
  }

  function handleCatSelect(id: string) {
    setCatId(id);
    goTo("s2");
  }

  function handleSubSelect(sub: Subcategory) {
    setResult({ service: sub.service, url: sub.url, reason: `「${sub.label}」に最適なサービスです` });
    goTo("s3");
  }

  function handleFreeSubmit() {
    const results = matchFreeText(freeText);
    setFreeResults(results);
    setFreeIdx(0);
    goTo("s3");
    setResult(results[0] ?? null);
  }

  function handleReset() {
    setCatId(null);
    setResult(null);
    setFreeText("");
    setFreeResults([]);
    setFreeIdx(0);
    goTo("s1");
  }

  function handleBack() {
    if (stepId === "s2" || stepId === "free") { goTo("s1"); setCatId(null); }
    else if (stepId === "s3") { goTo(catId ? "s2" : "free"); }
  }

  function showOtherResult() {
    const next = freeIdx + 1;
    if (next < freeResults.length) {
      setFreeIdx(next);
      setResult(freeResults[next]);
    }
  }

  useEffect(() => {
    if (stepId === "free") setTimeout(() => textareaRef.current?.focus(), 250);
  }, [stepId]);

  const selectedCat = categories.find(c => c.id === catId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/40" />

      {/* シート */}
      <div
        className="relative bg-white rounded-t-3xl w-full max-w-xl overflow-hidden"
        style={{ boxShadow: "0 -8px 32px rgba(0,0,0,0.14)", maxHeight: "92vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* グリップ */}
        <div className="pt-3 pb-0 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div className="flex items-center gap-3">
            {stepId !== "s1" && (
              <button
                onClick={handleBack}
                className="text-xs text-gray-400 hover:text-gray-700 transition flex items-center gap-0.5"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                  <path d="M10 13L5 8l5-5"/>
                </svg>
                戻る
              </button>
            )}
            <ProgressDots total={3} current={dotStep} />
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            style={{ color: "#9CA3AF" }}
            aria-label="閉じる"
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
              <path d="M1 1l12 12M13 1L1 13"/>
            </svg>
          </button>
        </div>

        {/* コンテンツ（スライドアニメーション） */}
        <div
          className="overflow-y-auto px-5 pb-8"
          style={{
            maxHeight:   "72vh",
            opacity:     sliding ? 0 : 1,
            transform:   sliding ? "translateX(12px)" : "translateX(0)",
            transition:  "opacity 0.2s ease, transform 0.2s ease",
          }}
        >

          {/* ── ステップ1：大カテゴリ ─────────────────────────────── */}
          {stepId === "s1" && (
            <div>
              <p className="text-base font-black text-gray-900 mb-1">何にお悩みですか？</p>
              <p className="text-xs text-gray-400 mb-4">当てはまるものを選んでください</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCatSelect(cat.id)}
                    className="text-left px-4 py-3.5 rounded-xl border text-sm font-semibold transition active:scale-[0.97]"
                    style={{
                      background:   "#FAFAFA",
                      borderColor:  "#E5E7EB",
                      color:        "#1A1A1A",
                      lineHeight:   "1.4",
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
                <button
                  onClick={() => goTo("free")}
                  className="text-left px-4 py-3.5 rounded-xl border text-sm font-semibold transition active:scale-[0.97]"
                  style={{
                    background:  "#FAFAFA",
                    borderColor: "#E5E7EB",
                    color:       "#9CA3AF",
                  }}
                >
                  その他・自由に入力する
                </button>
              </div>
            </div>
          )}

          {/* ── ステップ2：サブカテゴリ ───────────────────────────── */}
          {stepId === "s2" && selectedCat && (
            <div>
              <p className="text-base font-black text-gray-900 mb-1">もう少し詳しく教えてください</p>
              <p className="text-xs text-gray-400 mb-4">{selectedCat.label}</p>
              <div className="space-y-2">
                {selectedCat.subcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => handleSubSelect(sub)}
                    className="w-full text-left px-4 py-3.5 rounded-xl border text-sm font-semibold transition hover:border-orange-400 hover:bg-orange-50 active:scale-[0.98]"
                    style={{ background: "#FAFAFA", borderColor: "#E5E7EB", color: "#1A1A1A" }}
                  >
                    {sub.label}
                  </button>
                ))}
                <button
                  onClick={() => goTo("free")}
                  className="w-full text-left px-4 py-3.5 rounded-xl border text-sm font-semibold transition active:scale-[0.98]"
                  style={{ background: "#FAFAFA", borderColor: "#E5E7EB", color: "#9CA3AF" }}
                >
                  その他・自由に入力する
                </button>
              </div>
            </div>
          )}

          {/* ── 自由記述 ──────────────────────────────────────────── */}
          {stepId === "free" && (
            <div>
              <p className="text-base font-black text-gray-900 mb-1">お悩みを自由に入力してください</p>
              <p className="text-xs text-gray-400 mb-4">AIが最適なサービスを提案します</p>
              <textarea
                ref={textareaRef}
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && freeText.trim()) { e.preventDefault(); handleFreeSubmit(); } }}
                placeholder="例：患者の治療方針が決まらなくて困っています"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border text-sm resize-none focus:outline-none focus:border-orange-400 transition"
                style={{ borderColor: "#E5E7EB", color: "#1A1A1A" }}
              />
              <button
                onClick={handleFreeSubmit}
                disabled={!freeText.trim()}
                className="mt-3 w-full py-3.5 rounded-xl font-black text-white text-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                style={{ background: "#E85D04" }}
              >
                サービスを提案してもらう →
              </button>
            </div>
          )}

          {/* ── ステップ3：結果 ───────────────────────────────────── */}
          {stepId === "s3" && result && (
            <div>
              <p className="text-base font-black text-gray-900 mb-4">おすすめのサービスが見つかりました</p>
              <ResultCard
                service={result.service}
                url={result.url}
                reason={result.reason}
                onReset={handleReset}
              />
              {freeResults.length > 1 && freeIdx < freeResults.length - 1 && (
                <button
                  onClick={showOtherResult}
                  className="mt-3 w-full py-3 rounded-xl text-sm font-semibold border transition hover:border-gray-400"
                  style={{ borderColor: "#E5E7EB", color: "#555555" }}
                >
                  別のサービスを見る
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
