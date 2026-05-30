"use client";

import { useState } from "react";
import { MedicalSearch }       from "@/components/MedicalSearch";
import { TreatmentEvidence }   from "@/components/TreatmentEvidence";
import { CaseConsultation }    from "@/components/CaseConsultation";
import { ExperienceLevelWidget } from "@/components/ExperienceLevelWidget";

// ── Tab definitions ────────────────────────────────────────────────────────

type TabId = "search" | "evidence" | "case";

const TABS: { id: TabId; icon: string; label: string; desc: string }[] = [
  {
    id:    "search",
    icon:  "🔍",
    label: "検索サーチ",
    desc:  "教科書・ガイドラインベース",
  },
  {
    id:    "evidence",
    icon:  "🌍",
    label: "治療アプローチ",
    desc:  "最新エビデンス付き",
  },
  {
    id:    "case",
    icon:  "🩺",
    label: "症例相談",
    desc:  "患者状態を入力して相談",
  },
];

const TAB_ACTIVE: Record<TabId, { bg: string; border: string; text: string; dot: string }> = {
  search:   { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", dot: "#3b82f6" },
  evidence: { bg: "#f0fdf4", border: "#22c55e", text: "#15803d", dot: "#22c55e" },
  case:     { bg: "#fff7ed", border: "#f97316", text: "#c2410c", dot: "#f97316" },
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function Stage1Page() {
  const [activeTab, setActiveTab] = useState<TabId>("search");

  return (
    <main className="max-w-4xl mx-auto px-4 py-6" role="main">

      {/* ── Header ── */}
      <div className="mb-5 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-semibold text-green-700">臨床サポートパック</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
                <span className="text-xs font-bold text-orange-700">現役PTが作っています</span>
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-800">
              メディカルサーチ
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              臨床の質を上げるための準備ツール — 文献・論文をもとに整理します
            </p>
          </div>
          {/* Experience level picker */}
          <ExperienceLevelWidget />
        </div>

        {/* ── 3-mode Tabs ── */}
        <div className="grid grid-cols-3 gap-2">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const ac = TAB_ACTIVE[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="rounded-xl border-2 px-3 py-3 text-center transition-all"
                style={
                  isActive
                    ? { background: ac.bg, borderColor: ac.border }
                    : { background: "#f9fafb", borderColor: "#e5e7eb" }
                }
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  {isActive && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: ac.dot }}
                    />
                  )}
                  <span className="text-base leading-none">{tab.icon}</span>
                  <span
                    className="font-bold text-sm"
                    style={{ color: isActive ? ac.text : "#374151" }}
                  >
                    {tab.label}
                  </span>
                </div>
                <p
                  className="text-[10px] leading-tight"
                  style={{ color: isActive ? ac.text : "#9ca3af" }}
                >
                  {tab.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Tab description strip */}
        {activeTab === "search" && (
          <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
            <span className="text-blue-500 shrink-0">ℹ</span>
            <p className="text-xs text-blue-700">
              日本の教科書・ガイドラインに準拠した病態・解剖・評価・禁忌など<strong> 8項目</strong>を整理します。
              各セクションに参考文献・難易度バッジを表示します。
            </p>
          </div>
        )}
        {activeTab === "evidence" && (
          <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
            <span className="text-green-600 shrink-0">ℹ</span>
            <p className="text-xs text-green-800">
              日本の標準的アプローチに加え、<strong>海外の最新エビデンス（RCT・系統的レビュー）</strong>を出典付きで表示します。
              教科書と最新文献の違いが一目でわかります。
            </p>
          </div>
        )}
        {activeTab === "case" && (
          <div className="mt-3 flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5">
            <span className="text-orange-500 shrink-0">ℹ</span>
            <p className="text-xs text-orange-800">
              患者の<strong>年代・痛み・ROM・術後経過・受療環境</strong>などを入力すると、
              その患者に合った具体的なアプローチを文献・論文をもとに整理します。
            </p>
          </div>
        )}
      </div>

      {/* ── Tab content ── */}
      {activeTab === "search"   && <MedicalSearch />}
      {activeTab === "evidence" && <TreatmentEvidence />}
      {activeTab === "case"     && <CaseConsultation />}

    </main>
  );
}
