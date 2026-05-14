"use client";

import { useState } from "react";
import Link from "next/link";

// ── Questions ──────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    q: "現在の主な働き方は？",
    options: [
      { label: "病院・クリニック勤務",       tags: ["clinical"] },
      { label: "訪問リハビリ・在宅",         tags: ["clinical", "side"] },
      { label: "整骨院・整体院",             tags: ["side", "independence"] },
      { label: "フリーランス・複数掛け持ち", tags: ["side", "independence"] },
    ],
  },
  {
    q: "今一番の悩みは何ですか？",
    options: [
      { label: "最新の疾患情報・治療法が不足",     tags: ["clinical"] },
      { label: "収入を増やしたい",                 tags: ["side"] },
      { label: "院の集客・SNS運用が大変",          tags: ["independence"] },
      { label: "業務が多すぎて効率化したい",        tags: ["efficiency"] },
    ],
  },
  {
    q: "副業・独立にどのくらい興味がありますか？",
    options: [
      { label: "今は考えていない",       tags: ["clinical"] },
      { label: "少し考えている",         tags: ["side"] },
      { label: "かなり真剣に考えている", tags: ["side", "independence"] },
      { label: "すでに始めている",       tags: ["independence"] },
    ],
  },
  {
    q: "3年後の目標に近いのは？",
    options: [
      { label: "専門スキルをさらに高める",   tags: ["clinical"] },
      { label: "副業で月＋5万円以上",        tags: ["side"] },
      { label: "自分の治療院を開院する",     tags: ["independence"] },
      { label: "複数の収入源を持つ",         tags: ["side", "independence"] },
    ],
  },
  {
    q: "月々のツール費用はどれくらいまで払えますか？",
    options: [
      { label: "無料のみ（¥0）",               tags: ["clinical"] },
      { label: "¥1,000くらいまで",             tags: ["clinical", "side"] },
      { label: "¥5,000くらいまで",             tags: ["side", "independence"] },
      { label: "成果が出るなら制限なし",       tags: ["independence"] },
    ],
  },
];

const RESULTS: Record<string, { stage: number; title: string; price: string; desc: string; href: string; color: string; bg: string }> = {
  clinical: {
    stage: 1, title: "Stage 1 · メディカルサーチ",
    price: "無料〜¥980/月",
    desc: "まずは臨床知識をAIで即サーチ。疾患・症状・治療アプローチを素早くキャッチアップ。",
    href: "/stage1", color: "#1B4332", bg: "bg-green-50 border-green-200",
  },
  side: {
    stage: 2, title: "Stage 2 · 副業支援プラン",
    price: "¥3,980/月",
    desc: "副業診断・AIコーチング・コンテンツ生成で、副業収入への最短ルートを提供。",
    href: "/stage2", color: "#2563eb", bg: "bg-blue-50 border-blue-200",
  },
  independence: {
    stage: 3, title: "Stage 3 · 業務効率化プラン",
    price: "¥5,980/月",
    desc: "集客・口コミ・業務自動化まで。治療院オーナーに必要なAI機能をフルセット。",
    href: "/stage3", color: "#7c3aed", bg: "bg-purple-50 border-purple-200",
  },
  efficiency: {
    stage: 3, title: "Stage 3 · 業務効率化プラン",
    price: "¥5,980/月",
    desc: "口コミ対応・確定申告補助・業務自動化で、院の運営コストを大幅削減。",
    href: "/stage3", color: "#7c3aed", bg: "bg-purple-50 border-purple-200",
  },
};

export function CareerQuiz() {
  const [current, setCurrent] = useState(0);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [result, setResult] = useState<string | null>(null);

  const handleSelect = (tags: string[]) => {
    const next = { ...tagCounts };
    tags.forEach(t => { next[t] = (next[t] ?? 0) + 1; });
    setTagCounts(next);

    if (current < QUESTIONS.length - 1) {
      setCurrent(c => c + 1);
    } else {
      // Determine top tag
      const sorted = Object.entries(next).sort((a, b) => b[1] - a[1]);
      const top = sorted[0]?.[0] ?? "clinical";
      setResult(top);
    }
  };

  const reset = () => {
    setCurrent(0);
    setTagCounts({});
    setResult(null);
  };

  const res = result ? RESULTS[result] ?? RESULTS.clinical : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm max-w-2xl mx-auto">

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700"
        style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)" }}>
        <p className="text-white font-black text-lg">🎯 PTキャリア診断</p>
        <p className="text-green-200 text-xs mt-0.5">
          あなたに最適なプランを5問で診断します
        </p>
      </div>

      {!result ? (
        <div className="p-6">
          {/* Progress */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">質問 {current + 1} / {QUESTIONS.length}</p>
            <div className="flex gap-1">
              {QUESTIONS.map((_, i) => (
                <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${
                  i <= current ? "bg-[#E85D04]" : "bg-gray-200 dark:bg-gray-600"
                }`} />
              ))}
            </div>
          </div>

          <p className="font-bold text-gray-900 dark:text-white text-base mb-4">
            Q{current + 1}. {QUESTIONS[current].q}
          </p>

          <div className="space-y-2">
            {QUESTIONS[current].options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(opt.tags)}
                className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-[#E85D04] hover:bg-orange-50 dark:hover:bg-orange-900/20 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition group"
              >
                <span className="text-[#E85D04] font-bold mr-2 group-hover:mr-3 transition-all">→</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : res ? (
        <div className="p-6 animate-fadeIn">
          <div className="text-center mb-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">診断結果</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mb-1">
              Stage {res.stage} がおすすめ！
            </p>
          </div>

          <div className={`rounded-xl border p-4 mb-5 ${res.bg} dark:bg-opacity-10 dark:border-opacity-30`}>
            <p className="font-bold text-gray-900 text-base mb-1">{res.title}</p>
            <p className="text-xs font-semibold mb-2" style={{ color: res.color }}>{res.price}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{res.desc}</p>
          </div>

          <div className="flex gap-2">
            <Link
              href={res.href}
              className="flex-1 py-3 rounded-xl font-bold text-white text-sm text-center transition hover:opacity-90"
              style={{ background: res.color }}
            >
              このプランを見る →
            </Link>
            <button
              onClick={reset}
              className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              もう一度
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
