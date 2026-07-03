"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import type { PatientInfo } from "@/components/PatientInfoForm";
import { INITIAL_PATIENT_INFO } from "@/components/PatientInfoForm";

const MedicalSearch         = dynamic(() => import("@/components/MedicalSearch").then(m => ({ default: m.MedicalSearch })), { ssr: false });
const TreatmentEvidence     = dynamic(() => import("@/components/TreatmentEvidence").then(m => ({ default: m.TreatmentEvidence })), { ssr: false });
const CaseConsultation      = dynamic(() => import("@/components/CaseConsultation").then(m => ({ default: m.CaseConsultation })), { ssr: false });
const ExperienceLevelWidget = dynamic(() => import("@/components/ExperienceLevelWidget").then(m => ({ default: m.ExperienceLevelWidget })), { ssr: false });

// ── タブ定義 ───────────────────────────────────────────────────────────────

type TabId = "search" | "evidence" | "case";

const TABS: { id: TabId; label: string; sublabel: string }[] = [
  { id: "search",   label: "疾患を調べる",    sublabel: "疾患・ガイドライン"   },
  { id: "evidence", label: "治療を考える",     sublabel: "エビデンス＋個別提案" },
  { id: "case",     label: "何でも相談する",   sublabel: "患者状態を入力"       },
];

// ── オンボーディング ────────────────────────────────────────────────────────

const ONBOARDING_KEY = "pt-onboarding-v1";

function SearchIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#E85D04" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ClipboardIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#E85D04" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="12" y2="17" />
    </svg>
  );
}

function ChatIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#E85D04" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const SLIDES = [
  {
    title: "疾患を調べる",
    desc:  "教科書・ガイドラインをもとに\n疾患の全体像を調べられます\n疾患名や曖昧なワードで検索OK",
    Icon:  SearchIcon,
  },
  {
    title: "治療を考える",
    desc:  "担当患者の情報を入力すると\n個別の治療方針を提案します\nNRS・MMT・ROM等を入力して使う",
    Icon:  ClipboardIcon,
  },
  {
    title: "何でも相談する",
    desc:  "疾患に限らず臨床で生まれた\nどんな疑問も解決できます\n禁忌・解剖・評価の解釈・\n学会発表・副業まで何でもOK",
    Icon:  ChatIcon,
  },
] as const;

function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const slide  = SLIDES[slideIdx];
  const isLast = slideIdx === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xs z-10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-8 pt-10 pb-4 flex flex-col items-center text-center" style={{ minHeight: 280 }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "#FFF3E0" }}>
            <slide.Icon size={40} />
          </div>
          <h2 className="text-lg font-black text-gray-900 mb-3">{slide.title}</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{slide.desc}</p>
        </div>

        {/* ドットインジケーター */}
        <div className="flex justify-center gap-2 py-4">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlideIdx(i)}
              className="w-2 h-2 rounded-full transition-all duration-200"
              style={{ background: i === slideIdx ? "#E85D04" : "#D1D5DB" }}
              aria-label={`スライド${i + 1}`} />
          ))}
        </div>

        {/* ボタン */}
        <div className="px-6 pb-8 flex gap-3">
          {!isLast ? (
            <>
              <button onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition">
                スキップ
              </button>
              <button onClick={() => setSlideIdx(i => i + 1)}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white transition hover:opacity-90"
                style={{ background: "#E85D04" }}>
                次へ
              </button>
            </>
          ) : (
            <button onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-black text-white transition hover:opacity-90"
              style={{ background: "#E85D04" }}>
              はじめる
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ページ ─────────────────────────────────────────────────────────────────

export default function Stage1Page() {
  const [activeTab,      setActiveTab]      = useState<TabId>("search");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [sharedDisease,     setSharedDisease]     = useState("");
  const [sharedPatientInfo, setSharedPatientInfo] = useState<PatientInfo>(INITIAL_PATIENT_INFO);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const currentIndex = TABS.findIndex(t => t.id === activeTab);

  // 初回アクセス時のみモーダルを表示
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true);
    }
  }, []);

  const handleCloseOnboarding = () => {
    if (typeof window !== "undefined") localStorage.setItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  };

  // ── スワイプ：水平50px以上 かつ 水平>垂直×2 のみタブ切替 ─────────────────

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

    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 2) return;

    if (dx > 0 && currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1].id);
    } else if (dx < 0 && currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].id);
    }
  }

  return (
    <>
      <div className="flex flex-col print:block" style={{ height: "calc(100vh - 3.5rem)" }}>

        {/* ── 上部タブバー ── */}
        <div className="shrink-0 bg-white border-b border-gray-200 print:hidden">

          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-medium">
              臨床で必要なものが、全部ここにある。
            </p>
            <div className="flex items-center gap-2">
              {activeTab === "search" && <ExperienceLevelWidget />}
              <button
                onClick={() => setShowOnboarding(true)}
                className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-[11px] font-bold text-gray-400 hover:border-orange-400 hover:text-orange-500 transition shrink-0"
                aria-label="使い方を見る"
              >
                ?
              </button>
            </div>
          </div>

          <div className="flex">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex flex-col items-center py-2.5 px-2 transition-all relative"
                  style={{ color: isActive ? "#E85D04" : "#9CA3AF" }}>
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full transition-all duration-200"
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

        {/* ── コンテンツエリア ── */}
        <div className="flex-1 overflow-y-auto min-h-0 print:overflow-visible"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}>
          <div className="max-w-4xl mx-auto px-4 py-5">
            <div className={activeTab === "search"   ? "" : "hidden"}><MedicalSearch /></div>
            <div className={activeTab === "evidence" ? "" : "hidden"}>
              <TreatmentEvidence
                onSharedDiseaseChange={setSharedDisease}
                onSharedPatientInfoChange={setSharedPatientInfo}
              />
            </div>
            <div className={activeTab === "case"     ? "" : "hidden"}>
              <CaseConsultation sharedDisease={sharedDisease} sharedPatientInfo={sharedPatientInfo} />
            </div>
          </div>
        </div>
      </div>

      {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}
    </>
  );
}
