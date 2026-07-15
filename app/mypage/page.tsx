"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useFreeQuota } from "@/hooks/useFreeQuota";
import dynamic from "next/dynamic";
const NotesDictionary = dynamic(() => import("@/components/NotesDictionary").then(m => m.NotesDictionary), { ssr: false });

// モック：実認証が実装されたら差し替える
const MOCK_USER    = { name: "田中 優子" };
const CURRENT_PLAN = "free" as "free" | "stage1" | "stage2" | "stage3" | "stage4";

// ── クイックアクセス ──────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    id:    "pt-gpt",
    label: "PT専用GPT",
    sub:   "AI何でも相談",
    href:  "/pt-gpt",
    comingSoon: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    id:    "literature",
    label: "文献検索",
    sub:   "論文・書籍",
    href:  "/stage1/literature",
    comingSoon: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    id:    "treatment",
    label: "AI治療考察",
    sub:   "AI個別提案",
    href:  "/stage1/treatment",
    comingSoon: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1"/>
      </svg>
    ),
  },
  {
    id:    "slides",
    label: "スライド",
    sub:   "発表資料",
    href:  "/stage1/slides",
    comingSoon: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
];

// ── Main page ─────────────────────────────────────────────────────────────

export default function MyPage() {
  const { used, total, remaining, isExhausted, percentage } = useFreeQuota();
  const isFree = CURRENT_PLAN === "free";
  const isLow  = remaining <= 2 && !isExhausted;

  const [comingSoonToast, setComingSoonToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleComingSoon = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setComingSoonToast(true);
    toastTimer.current = setTimeout(() => setComingSoonToast(false), 1000);
  };

  return (
    <div className="max-w-xl mx-auto px-4 pb-12 space-y-5">

      {/* ① 簡易ヘッダー */}
      <div className="pt-4">
        <p className="text-base font-bold text-gray-900 mb-2">
          こんにちは、{MOCK_USER.name}さん
        </p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500 shrink-0">
            今月の残り検索：
            <span className="font-black" style={{ color: isLow ? "#E85D04" : "#1A1A1A" }}>
              {remaining}回
            </span>
          </p>
          <div className="flex-1 h-1 rounded-full overflow-hidden max-w-[100px]"
            style={{ background: "#F3F4F6" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width:      `${percentage}%`,
                background: isLow ? "#E85D04" : "#9CA3AF",
              }} />
          </div>
          <p className="text-[10px] text-gray-400 shrink-0">{used}/{total}</p>
        </div>
      </div>

      {/* ② マイノート（最優先） */}
      <NotesDictionary />

      {/* ⑦ クイックアクセス */}
      <div>
        <h2 className="text-sm font-black text-gray-900 mb-3">今すぐ使う</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {QUICK_ACTIONS.map(action =>
            action.comingSoon ? (
              <button key={action.id} type="button" onClick={handleComingSoon}
                className="relative flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-left"
                style={{
                  background:   "#F9FAFB",
                  borderColor:  "#F3F4F6",
                  boxShadow:    "0 1px 4px rgba(0,0,0,0.04)",
                  color:        "#D1D5DB",
                }}>
                <span className="absolute top-1.5 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "#E5E7EB", color: "#9CA3AF" }}>準備中</span>
                <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "#F3F4F6" }}>
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black truncate">{action.label}</p>
                  <p className="text-[10px] truncate" style={{ color: "#D1D5DB" }}>{action.sub}</p>
                </div>
              </button>
            ) : (
              <Link key={action.id} href={action.href}
                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl border border-gray-100 bg-white transition hover:border-orange-200 hover:bg-orange-50 active:scale-95"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)", color: "#E85D04" }}>
                <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "#FFF7ED" }}>
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black truncate" style={{ color: "#E85D04" }}>{action.label}</p>
                  <p className="text-[10px] text-gray-400 truncate">{action.sub}</p>
                </div>
              </Link>
            )
          )}
        </div>
      </div>

      {/* ⑧ アップグレード誘導（最下部・オレンジ） */}
      {isFree && (
        <div className="rounded-2xl px-5 py-4"
          style={{ background: "#E85D04" }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold text-white/70 mb-0.5">プランアップグレード</p>
              <p className="text-white font-black text-base leading-tight">
                ¥980/月で<br />検索が無制限に
              </p>
            </div>
            <Link href="/pricing"
              className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-black bg-white transition hover:opacity-90 active:scale-95"
              style={{ color: "#E85D04" }}>
              くわしく見る
            </Link>
          </div>
        </div>
      )}

      {/* 準備中トースト */}
      {comingSoonToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold pointer-events-none"
          style={{ background: "rgba(0,0,0,0.72)", whiteSpace: "nowrap" }}>
          準備中です
        </div>
      )}

    </div>
  );
}
