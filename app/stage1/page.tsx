"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { PtGptChat } from "@/components/PtGptChat";

const LiteratureContent = dynamic(
  () => import("@/app/stage1/literature/page"),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><span className="text-sm text-gray-400">読み込み中...</span></div> },
);

// ── タブ定義 ───────────────────────────────────────────────────────────────

type TabId = "gpt" | "literature";

const TABS: { id: TabId; label: string; sublabel: string }[] = [
  { id: "gpt",        label: "PT専用GPT",  sublabel: "疾患・相談・キャリア" },
  { id: "literature", label: "文献検索",    sublabel: "論文・教科書"         },
];

// ── Inner (uses useSearchParams) ───────────────────────────────────────────

function Stage1Inner() {
  const searchParams = useSearchParams();
  const initialTab   = (searchParams.get("tab") as TabId) ?? "gpt";
  const initialQuery = searchParams.get("q") ?? undefined;

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const currentIndex = TABS.findIndex(t => t.id === activeTab);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    touchStartX.current = null;
    touchStartY.current = null;

    // 水平移動が50px以上 かつ 水平移動が垂直移動の2倍以上の場合のみ切り替え
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 2) return;

    if (dx > 0 && currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1].id);
    } else if (dx < 0 && currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].id);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 3.5rem)" }}>

      {/* タブバー */}
      <div className="shrink-0 bg-white border-b border-gray-200">
        <div className="flex">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center py-2.5 px-2 transition-all relative"
                style={{ color: isActive ? "#E85D04" : "#9CA3AF" }}>
                <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full transition-all duration-200"
                  style={{ background: isActive ? "#E85D04" : "transparent" }} />
                <span className="text-sm leading-tight transition-all"
                  style={{ fontWeight: isActive ? 800 : 600 }}>
                  {tab.label}
                </span>
                <span className="text-[10px] mt-0.5 opacity-70 hidden sm:block">{tab.sublabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 min-h-0 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>

        {/* PT専用GPT タブ */}
        <div className={`h-full ${activeTab === "gpt" ? "flex flex-col" : "hidden"}`}>
          <PtGptChat initialQuery={activeTab === "gpt" ? initialQuery : undefined} />
        </div>

        {/* 文献検索 タブ */}
        <div className={`h-full overflow-y-auto ${activeTab === "literature" ? "block" : "hidden"}`}>
          <Suspense fallback={<div className="flex items-center justify-center h-32"><span className="text-sm text-gray-400">読み込み中...</span></div>}>
            {activeTab === "literature" && <LiteratureContent />}
          </Suspense>
        </div>

      </div>
    </div>
  );
}

export default function Stage1Page() {
  return (
    <Suspense>
      <Stage1Inner />
    </Suspense>
  );
}
