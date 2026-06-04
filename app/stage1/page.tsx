"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";

// コンポーネントを遅延読み込み（ただし全タブ同時にマウント → 状態保持）
const MedicalSearch         = dynamic(() => import("@/components/MedicalSearch").then(m => ({ default: m.MedicalSearch })), { ssr: false });
const TreatmentEvidence     = dynamic(() => import("@/components/TreatmentEvidence").then(m => ({ default: m.TreatmentEvidence })), { ssr: false });
const CaseConsultation      = dynamic(() => import("@/components/CaseConsultation").then(m => ({ default: m.CaseConsultation })), { ssr: false });
const ExperienceLevelWidget = dynamic(() => import("@/components/ExperienceLevelWidget").then(m => ({ default: m.ExperienceLevelWidget })), { ssr: false });

// ── タブ定義 ───────────────────────────────────────────────────────────────

type TabId = "search" | "evidence" | "case";

const TABS: { id: TabId; label: string; sublabel: string }[] = [
  { id: "search",   label: "調べる",       sublabel: "疾患・ガイドライン"   },
  { id: "evidence", label: "治療を考える",  sublabel: "エビデンス＋個別提案" },
  { id: "case",     label: "相談する",      sublabel: "患者状態を入力"       },
];

const SWIPE_THRESHOLD = 50; // px

// ── ページ ─────────────────────────────────────────────────────────────────

export default function Stage1Page() {
  const [activeTab, setActiveTab] = useState<TabId>("search");

  // スワイプ検出用
  const touchStartX = useRef<number | null>(null);

  const currentIndex = TABS.findIndex(t => t.id === activeTab);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < SWIPE_THRESHOLD) return;
    if (diff > 0 && currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1].id);
    } else if (diff < 0 && currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].id);
    }
    touchStartX.current = null;
  }

  return (
    <div
      className="flex flex-col print:block"
      style={{ height: "calc(100vh - 3.5rem)" }}
    >

      {/* ── 上部タブバー ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 print:hidden">

        {/* キャッチコピー行 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <p className="text-xs text-gray-400 font-medium">
            臨床で必要なものが、全部ここにある。
          </p>
          {activeTab === "search" && <ExperienceLevelWidget />}
        </div>

        {/* タブ */}
        <div className="flex">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center py-2.5 px-2 transition-all relative"
                style={{ color: isActive ? "#E85D04" : "#9CA3AF" }}
              >
                {/* 下線インジケーター */}
                <div
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full transition-all duration-200"
                  style={{ background: isActive ? "#E85D04" : "transparent" }}
                />
                <span
                  className="text-sm font-semibold leading-tight transition-all"
                  style={{ fontWeight: isActive ? 800 : 600 }}
                >
                  {tab.label}
                </span>
                <span className="text-[10px] mt-0.5 opacity-70 hidden sm:block">
                  {tab.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── コンテンツエリア（スワイプ対応） ── */}
      <div
        className="flex-1 overflow-y-auto min-h-0 print:overflow-visible"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="max-w-4xl mx-auto px-4 py-5">

          {/*
            3つのコンポーネントを常にマウントしておく。
            CSS の hidden クラスで表示/非表示を切り替えることで
            タブを切り替えても入力内容・チャット履歴が消えない。
          */}
          <div className={activeTab === "search" ? "" : "hidden"}>
            <MedicalSearch />
          </div>
          <div className={activeTab === "evidence" ? "" : "hidden"}>
            <TreatmentEvidence />
          </div>
          <div className={activeTab === "case" ? "" : "hidden"}>
            <CaseConsultation />
          </div>

        </div>
      </div>

    </div>
  );
}
