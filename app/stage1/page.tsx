"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const MedicalSearch         = dynamic(() => import("@/components/MedicalSearch").then(m => ({ default: m.MedicalSearch })), { ssr: false });
const TreatmentEvidence     = dynamic(() => import("@/components/TreatmentEvidence").then(m => ({ default: m.TreatmentEvidence })), { ssr: false });
const CaseConsultation      = dynamic(() => import("@/components/CaseConsultation").then(m => ({ default: m.CaseConsultation })), { ssr: false });
const ExperienceLevelWidget = dynamic(() => import("@/components/ExperienceLevelWidget").then(m => ({ default: m.ExperienceLevelWidget })), { ssr: false });

// ── Tab IDs ────────────────────────────────────────────────────────────────

type TabId = "search" | "evidence" | "case";

// ── SVG Icons (same as top-screen icons, but smaller) ─────────────────────

function BookIcon({ active }: { active: boolean }) {
  const c = active ? "#2563EB" : "#9ca3af";
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
      <rect x="5" y="4" width="16" height="22" rx="2" fill={c} fillOpacity="0.15" stroke={c} strokeWidth="1.5"/>
      <rect x="5" y="4" width="4" height="22" rx="1" fill={c} fillOpacity="0.4"/>
      <line x1="12" y1="10" x2="18" y2="10" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="14" x2="18" y2="14" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="18" x2="16" y2="18" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="20" y="7" width="8" height="19" rx="1.5" fill={c} fillOpacity="0.08" stroke={c} strokeWidth="1" strokeDasharray="2 1.5"/>
    </svg>
  );
}

function ChecklistIcon({ active }: { active: boolean }) {
  const c = active ? "#16a34a" : "#9ca3af";
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
      <circle cx="16" cy="9" r="5" fill={c} fillOpacity="0.15" stroke={c} strokeWidth="1.5"/>
      <path d="M8 24 C8 17 24 17 24 24 L24 26 L8 26 Z" fill={c} fillOpacity="0.12" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="19" y="16" width="10" height="12" rx="1.5" fill="white" stroke={c} strokeWidth="1.5"/>
      <polyline points="21,21 22.5,22.5 26,19.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="21,25 22.5,26.5 26,23.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  const c = active ? "#ea580c" : "#9ca3af";
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
      <rect x="3" y="5" width="20" height="14" rx="4" fill={c} fillOpacity="0.15" stroke={c} strokeWidth="1.5"/>
      <path d="M7 19 L5 26 L13 21" fill={c} fillOpacity="0.15" stroke={c} strokeWidth="1.2" strokeLinejoin="round"/>
      <circle cx="9" cy="12" r="1.5" fill={c}/>
      <circle cx="13" cy="12" r="1.5" fill={c} fillOpacity="0.6"/>
      <circle cx="17" cy="12" r="1.5" fill={c} fillOpacity="0.35"/>
      <rect x="19" y="4" width="10" height="8" rx="3" fill={c} fillOpacity="0.1" stroke={c} strokeWidth="1.2" strokeDasharray="2 1.5"/>
    </svg>
  );
}

// ── Tab config ─────────────────────────────────────────────────────────────

const TABS: {
  id:          TabId;
  label:       string;
  sublabel:    string;
  activeColor: string;
  activeBg:    string;
}[] = [
  { id: "search",   label: "疾患を調べる",  sublabel: "教科書・ガイドライン",  activeColor: "#2563EB", activeBg: "#eff6ff" },
  { id: "evidence", label: "治療を考える",  sublabel: "エビデンス＋個別提案",  activeColor: "#16a34a", activeBg: "#f0fdf4" },
  { id: "case",     label: "相談する",      sublabel: "患者状態を入力",        activeColor: "#ea580c", activeBg: "#fff7ed" },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function Stage1Page() {
  const [activeTab, setActiveTab] = useState<TabId>("search");

  const activeMeta = TABS.find(t => t.id === activeTab)!;

  return (
    <div
      className="flex flex-col print:block"
      style={{ height: "calc(100vh - 3.5rem)" }}
    >
      {/* ── Sticky catchphrase bar ── */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between print:hidden">
        <p className="text-xs text-gray-400 font-medium">
          臨床で必要なものが、全部ここにある。
        </p>
        {activeTab === "search" && <ExperienceLevelWidget />}
      </div>

      {/* ── Content area (scrollable) ── */}
      <div className="flex-1 overflow-y-auto min-h-0 print:overflow-visible">
        <div className="max-w-4xl mx-auto px-4 py-5">

          {/* Tab mode label */}
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 print:hidden"
            style={{ background: activeMeta.activeBg }}
          >
            {activeTab === "search"   && <BookIcon     active />}
            {activeTab === "evidence" && <ChecklistIcon active />}
            {activeTab === "case"     && <ChatIcon      active />}
            <div>
              <p className="text-sm font-black" style={{ color: activeMeta.activeColor }}>
                {activeMeta.label}
              </p>
              <p className="text-[10px]" style={{ color: activeMeta.activeColor, opacity: 0.7 }}>
                {activeMeta.sublabel}
              </p>
            </div>

            {/* Badges (search only) */}
            {activeTab === "search" && (
              <div className="ml-auto flex gap-1.5">
                <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">現役PTが作成</span>
              </div>
            )}
          </div>

          {/* Feature content */}
          <div
            key={activeTab}
            className="animate-in fade-in duration-200"
          >
            {activeTab === "search"   && <MedicalSearch />}
            {activeTab === "evidence" && <TreatmentEvidence />}
            {activeTab === "case"     && <CaseConsultation />}
          </div>
        </div>
      </div>

      {/* ── Fixed bottom tab bar ── */}
      <div className="shrink-0 bg-white border-t border-gray-200 print:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex max-w-4xl mx-auto">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all relative"
                style={{ color: isActive ? tab.activeColor : "#9ca3af" }}
              >
                {/* Active indicator */}
                {isActive && (
                  <div
                    className="absolute top-0 left-4 right-4 h-0.5 rounded-full"
                    style={{ background: tab.activeColor }}
                  />
                )}

                {/* Icon */}
                {tab.id === "search"   && <BookIcon     active={isActive} />}
                {tab.id === "evidence" && <ChecklistIcon active={isActive} />}
                {tab.id === "case"     && <ChatIcon      active={isActive} />}

                {/* Label */}
                <span
                  className={`text-[10px] leading-tight font-semibold transition-all ${isActive ? "font-black" : ""}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
