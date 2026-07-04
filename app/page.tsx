"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ServiceGuide } from "@/components/ServiceGuide";
import { useFreeQuota } from "@/hooks/useFreeQuota";

// ─── 型 ───────────────────────────────────────────────────────────────────

interface HistoryItem { id: string; query: string; timestamp: number; }
interface SavedPlan   { id: string; name: string; disease: string; savedAt: number; }

// ─── 定数 ─────────────────────────────────────────────────────────────────

const BANNER_KEY  = "pt-banner-closed-v1";
const STREAK_KEY  = "pt-streak-days";
const HISTORY_KEY = "pt-search-history";
const PLANS_KEY   = "pt-saved-plans";

const QUICK_TAGS = ["変形性膝関節症", "脳梗塞", "人工股関節の禁忌", "肩の評価", "廃用症候群", "テニス肘"];

const NOTIFICATIONS = [
  { id: 1, text: "新機能：スライド生成が追加されました",     date: "2026-07-01", read: false },
  { id: 2, text: "疾患を調べる の教科書参照が強化されました", date: "2026-06-25", read: false },
  { id: 3, text: "AIモデルが最新版（Sonnet）に更新されました", date: "2026-06-20", read: true },
];

const QUICK_ACCESS = [
  { id: "search",   label: "疾患を調べる",      sub: "教科書・辞典",   href: "/stage1",              main: true  },
  { id: "evidence", label: "治療を考える",       sub: "AI個別提案",     href: "/stage1",              main: false },
  { id: "case",     label: "何でも相談",         sub: "先輩PTに聞く",   href: "/stage1",              main: false },
  { id: "slides",   label: "スライド生成",       sub: "発表を10分で",   href: "/stage1/slides",       main: false },
  { id: "lit",      label: "文献検索",           sub: "論文・書籍",     href: "/stage1/literature",   main: false },
  { id: "calc",     label: "算定ガイド",         sub: "点数・加算",     href: "/learn/reimbursement", main: false },
  { id: "learn",    label: "学習コンテンツ",     sub: "スキルを伸ばす", href: "/learn",               main: false },
  { id: "market",   label: "コンテンツマーケット", sub: "動画・PDF販売",  href: "/market",              main: false },
];

const PLANS_DATA = [
  {
    label: "無料プラン",   price: "¥0",      priceNote: "/月",
    badge: null,          badgeColor: "",
    bg: "#F9FAFB",        border: "#D1D5DB",
    btnLabel: "現在のプラン", btnColor: "#9CA3AF", btnBg: "#F3F4F6",
    features: ["検索 5回/月", "副業診断 1回"],
    note: null,           current: true,
  },
  {
    label: "臨床サポート", price: "¥980",    priceNote: "/月",
    badge: "人気No.1",    badgeColor: "#E85D04",
    bg: "#FFF7ED",        border: "#E85D04",
    btnLabel: "アップグレード", btnColor: "#fff", btnBg: "#E85D04",
    features: ["検索 無制限", "スライド生成", "文献検索", "算定ガイド"],
    note: null,           current: false,
  },
  {
    label: "副業支援",     price: "¥3,980",  priceNote: "/月（初月¥980）",
    badge: "稼ぐ",         badgeColor: "#1B4332",
    bg: "#F0FDF4",        border: "#1B4332",
    btnLabel: "詳しく見る", btnColor: "#fff", btnBg: "#1B4332",
    features: ["動画・資料販売", "収益50%還元", "AIコーチング", "返金保証3ヶ月"],
    note: "副業で月5万円以上稼ぐPTが増えています",
    current: false,
  },
  {
    label: "開業・院運営", price: "¥5,980",  priceNote: "/月（初月¥2,980）",
    badge: "開業",         badgeColor: "#2563EB",
    bg: "#EFF6FF",        border: "#2563EB",
    btnLabel: "詳しく見る", btnColor: "#fff", btnBg: "#2563EB",
    features: ["口コミ返信生成", "SNS投稿AI", "確定申告補助", "Google最適化"],
    note: null,           current: false,
  },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return "おはようございます。\n今日も臨床準備を始めましょう";
  if (h >= 12 && h < 18) return "お疲れ様です。\n昼休みに臨床準備はいかがですか";
  return "今日の振り返りに\nPT Worksを活用してください";
}

function getSeasonalDisease(): { label: string; name: string; desc: string } {
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 8)  return { label: "今の時期に多い疾患", name: "熱中症による廃用症候群", desc: "夏季の入院長期化に備えた早期リハビリが重要です" };
  if (m >= 9 && m <= 11) return { label: "今の時期に多い疾患", name: "変形性関節症", desc: "気温低下による疼痛増悪。評価と運動療法の見直しを" };
  if (m === 12 || m <= 2) return { label: "今の時期に多い疾患", name: "転倒・骨折", desc: "凍結路面での転倒が増加。リスク管理を再確認してください" };
  return { label: "新人PTの方へ", name: "基礎疾患の総復習", desc: "入職シーズン。頻出疾患を教科書ベースで確認しましょう" };
}

// ─── アイコン ─────────────────────────────────────────────────────────────

function IconSearch({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IconClipboard({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
    </svg>
  );
}
function IconChat({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconSlides({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
function IconBook({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function IconCalc({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/>
    </svg>
  );
}
function IconGraduate({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  );
}
function IconShop({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}
function IconMenu({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function IconBell({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
function IconChevronRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  );
}

function getQAIcon(id: string, size = 20) {
  switch (id) {
    case "search":   return <IconSearch size={size} />;
    case "evidence": return <IconClipboard size={size} />;
    case "case":     return <IconChat size={size} />;
    case "slides":   return <IconSlides size={size} />;
    case "lit":      return <IconBook size={size} />;
    case "learn":    return <IconGraduate size={size} />;
    case "market":   return <IconShop size={size} />;
    default:         return <IconCalc size={size} />;
  }
}

// ─── ホームページ ─────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { used, total, remaining, isExhausted, percentage } = useFreeQuota();
  const [sidebarOpen,  setSidebarOpen]    = useState(false);
  const [bannerClosed, setBannerClosed]   = useState(true);
  const [showNotif,    setShowNotif]      = useState(false);
  const [query,        setQuery]          = useState("");
  const [showPicker,   setShowPicker]     = useState(false);
  const [guideOpen,    setGuideOpen]      = useState(false);
  const [streak,       setStreak]         = useState(3);
  const [history,      setHistory]        = useState<HistoryItem[]>([]);
  const [savedPlans,   setSavedPlans]     = useState<SavedPlan[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const unread = NOTIFICATIONS.filter(n => !n.read).length;
  const seasonal = getSeasonalDisease();
  const greeting = getGreeting();

  useEffect(() => {
    try {
      if (!localStorage.getItem(BANNER_KEY)) setBannerClosed(false);
      const s = localStorage.getItem(STREAK_KEY);
      if (s) setStreak(Number(s));
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory((JSON.parse(h) as HistoryItem[]).slice(0, 10));
      const p = localStorage.getItem(PLANS_KEY);
      if (p) setSavedPlans((JSON.parse(p) as SavedPlan[]).slice(0, 5));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    if (showNotif) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNotif]);

  const closeBanner = () => {
    setBannerClosed(true);
    try { localStorage.setItem(BANNER_KEY, "1"); } catch { /* ignore */ }
  };

  const handleSearch = () => {
    if (query.trim()) setShowPicker(true);
  };

  const handleTagSearch = (tag: string) => {
    router.push(`/stage1?q=${encodeURIComponent(tag)}`);
  };

  const handlePick = (dest: string) => {
    setShowPicker(false);
    router.push(`${dest}?q=${encodeURIComponent(query)}`);
  };

  const isLow    = remaining <= 2;
  const usagePct = percentage;

  // 最近の履歴：検索履歴 + 保存プランをマージして最大3件
  const recentItems: { id: string; title: string; sub: string; href: string }[] = [
    ...history.slice(0, 3).map(h => ({
      id:    h.id,
      title: h.query,
      sub:   `疾患を調べる · ${new Date(h.timestamp).toLocaleDateString("ja-JP")}`,
      href:  `/stage1?q=${encodeURIComponent(h.query)}`,
    })),
    ...savedPlans.slice(0, 2).map(p => ({
      id:    p.id,
      title: p.name || p.disease,
      sub:   `治療プラン · ${new Date(p.savedAt).toLocaleDateString("ja-JP")}`,
      href:  "/stage1",
    })),
  ]
    .sort((a, b) => 0) // preserve order
    .slice(0, 3);

  return (
    <div className="bg-white min-h-screen pb-24" style={{ color: "#1A1A1A" }}>

      {/* サイドバー */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ① ヘッダー */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between px-4 h-14 max-w-xl mx-auto">

          {/* 左：ハンバーガー＋ロゴ */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              style={{ color: "#1A1A1A" }}
              aria-label="メニューを開く"
            >
              <IconMenu size={20} />
            </button>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-base"
              style={{ background: "linear-gradient(135deg,#E85D04,#c44b00)" }}>P</div>
            <span className="text-lg font-black tracking-tight">
              PT<span style={{ color: "#E85D04" }}>Works</span>
            </span>
          </div>

          {/* 右側 */}
          <div className="flex items-center gap-2">
            {/* ベルアイコン */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setShowNotif(v => !v)}
                className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                style={{ color: "#1A1A1A" }}
                aria-label="お知らせ"
              >
                <IconBell size={20} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                    style={{ background: "#E85D04" }}>
                    {unread}
                  </span>
                )}
              </button>

              {/* 通知ドロップダウン */}
              {showNotif && (
                <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-bold">お知らせ</p>
                    <span className="text-[11px] text-gray-400">{unread}件の未読</span>
                  </div>
                  <ul>
                    {NOTIFICATIONS.map(n => (
                      <li key={n.id} className="px-4 py-3 border-b border-gray-50 flex items-start gap-3 last:border-0"
                        style={{ background: n.read ? "white" : "#FFFBF7" }}>
                        {!n.read && (
                          <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: "#E85D04" }} />
                        )}
                        {n.read && <span className="mt-1.5 w-2 h-2 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-xs text-gray-800 leading-snug">{n.text}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{n.date}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* プランを見るボタン */}
            <a href="/pricing"
              className="px-4 py-2 rounded-xl text-xs font-black text-white transition hover:opacity-90 active:scale-95"
              style={{ background: "#E85D04" }}>
              プランを見る
            </a>
          </div>
        </div>
      </header>

      {/* ヘッダー分スペース */}
      <div className="h-14" />

      {/* ② お知らせバナー */}
      {!bannerClosed && (
        <div className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: "#1B4332" }}>
          <p className="flex-1 text-xs text-white leading-snug truncate">
            新機能：疾患を調べる に教科書3冊以上の参照が追加されました
          </p>
          <a href="/pricing"
            className="shrink-0 text-xs font-bold transition hover:opacity-80"
            style={{ color: "#E85D04" }}>
            詳細 →
          </a>
          <button onClick={closeBanner}
            className="shrink-0 w-5 h-5 flex items-center justify-center text-white/60 hover:text-white transition"
            aria-label="閉じる">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
              <path d="M1 1l12 12M13 1L1 13"/>
            </svg>
          </button>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4">

        {/* ③ ヒーローゾーン */}
        <section className="pt-5 pb-2">

          {/* 挨拶 */}
          <p className="text-[22px] font-black leading-snug mb-4 whitespace-pre-line" style={{ color: "#1A1A1A" }}>
            {greeting}
          </p>

          {/* 無料枠＋連続使用日数カード */}
          <div className="rounded-2xl flex items-center gap-4 px-4 py-4 mb-5"
            style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>

            {/* 左：無料枠 */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold mb-1.5" style={{ color: "#888888" }}>今月の無料枠</p>
              <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: "#E5E7EB" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${usagePct}%`, background: isLow ? "#EF4444" : "#E85D04" }} />
              </div>
              <p className="text-xs font-bold" style={{ color: isLow ? "#EF4444" : "#1A1A1A" }}>
                {used}/{total}回使用
                {isLow && <span className="ml-1.5 text-[10px]">（残り{remaining}回）</span>}
              </p>
            </div>

            {/* 区切り */}
            <div className="w-px h-10 bg-gray-200 shrink-0" />

            {/* 右：連続使用 */}
            <div className="shrink-0 text-center w-16">
              <span className="text-base">🔥</span>
              <p className="text-2xl font-black leading-none mt-0.5" style={{ color: "#E85D04" }}>{streak}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "#888888" }}>日連続使用中</p>
            </div>
          </div>

          {/* ④ 検索窓 */}
          <div className="rounded-2xl overflow-hidden mb-3"
            style={{ border: "2px solid #E85D04", boxShadow: "0 4px 20px rgba(232,93,4,0.15)" }}>
            <div className="flex items-center bg-white">
              <span className="pl-4 text-gray-400 shrink-0"><IconSearch size={18} /></span>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="疾患・症状・キーワードを入力"
                className="flex-1 px-3 py-3.5 text-sm bg-transparent outline-none placeholder-gray-400"
                style={{ color: "#1A1A1A" }}
                autoComplete="off"
              />
              <button
                onClick={handleSearch}
                disabled={!query.trim()}
                className="px-5 py-3.5 text-sm font-black text-white transition hover:opacity-90 active:scale-95 disabled:opacity-40"
                style={{ background: "#E85D04" }}>
                検索
              </button>
            </div>
          </div>

          {/* クイックタグ */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_TAGS.map(tag => (
              <button key={tag} onClick={() => handleTagSearch(tag)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition hover:border-orange-400 hover:text-orange-600 active:scale-95"
                style={{ background: "#F9FAFB", borderColor: "#E5E7EB", color: "#888888" }}>
                {tag}
              </button>
            ))}
          </div>

          {/* はじめましょうボタン */}
          <div className="mt-4">
            <button
              onClick={() => setGuideOpen(true)}
              className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition hover:opacity-90 active:scale-[0.98]"
              style={{ background: "#E85D04", boxShadow: "0 4px 16px rgba(232,93,4,0.25)" }}
            >
              はじめましょう →
            </button>
            <p className="text-center text-[11px] mt-2" style={{ color: "#9CA3AF" }}>
              悩み別に最適なサービスをご案内します
            </p>
          </div>
        </section>

        {/* 悩み別サービス診断 */}
        {guideOpen && <ServiceGuide onClose={() => setGuideOpen(false)} />}

        {/* 検索機能選択モーダル */}
        {showPicker && (
          <div className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={() => setShowPicker(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-t-3xl w-full max-w-xl px-4 pt-5 pb-8"
              style={{ boxShadow: "0 -8px 32px rgba(0,0,0,0.12)" }}
              onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-5" />
              <p className="text-sm font-bold mb-1" style={{ color: "#1A1A1A" }}>
                「{query}」をどの機能で調べますか？
              </p>
              <p className="text-[11px] mb-4" style={{ color: "#888888" }}>機能を選んでください</p>
              <div className="space-y-2">
                {[
                  { label: "疾患を調べる",  sub: "教科書・ガイドライン辞典",  href: "/stage1", icon: <IconSearch size={18}/> },
                  { label: "治療を考える",  sub: "AI個別治療提案",            href: "/stage1", icon: <IconClipboard size={18}/> },
                  { label: "何でも相談する",sub: "先輩PTチャット",             href: "/stage1", icon: <IconChat size={18}/> },
                ].map(opt => (
                  <button key={opt.label} onClick={() => handlePick(opt.href)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition hover:border-orange-400 active:scale-[0.98]"
                    style={{ background: "#F9FAFB", borderColor: "#E5E7EB" }}>
                    <span style={{ color: "#E85D04" }}>{opt.icon}</span>
                    <div className="text-left">
                      <p className="text-sm font-bold" style={{ color: "#1A1A1A" }}>{opt.label}</p>
                      <p className="text-[11px]" style={{ color: "#888888" }}>{opt.sub}</p>
                    </div>
                    <span className="ml-auto" style={{ color: "#888888" }}><IconChevronRight /></span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ⑤ クイックアクセス */}
        <section className="mt-6">
          <h2 className="text-[18px] font-black mb-3" style={{ color: "#1A1A1A" }}>クイックアクセス</h2>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ACCESS.map(item => (
              <a key={item.id} href={item.href}
                className="flex flex-col items-center text-center px-1 py-3 rounded-2xl border transition active:scale-95"
                style={{
                  background:   item.main ? "#FFF7ED" : "#F9FAFB",
                  borderColor:  item.main ? "#E85D04" : "#F3F4F6",
                  boxShadow:    "0 2px 8px rgba(0,0,0,0.04)",
                  transition:   "transform 0.15s",
                }}>
                <span className="mb-2" style={{ color: item.main ? "#E85D04" : "#888888" }}>
                  {getQAIcon(item.id, 22)}
                </span>
                <p className="text-xs font-black leading-snug" style={{ color: "#1A1A1A" }}>{item.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#888888" }}>{item.sub}</p>
              </a>
            ))}
          </div>
        </section>

        {/* ⑥ 続きから始める */}
        <section className="mt-6">
          <h2 className="text-[18px] font-black mb-3" style={{ color: "#1A1A1A" }}>続きから始める</h2>
          {recentItems.length === 0 ? (
            <div className="rounded-2xl px-5 py-6 text-center"
              style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
              <p className="text-sm" style={{ color: "#888888" }}>まだ履歴がありません。</p>
              <p className="text-sm mt-0.5" style={{ color: "#888888" }}>
                <a href="/stage1" style={{ color: "#E85D04" }} className="font-bold underline underline-offset-2">疾患を調べる</a>から始めてみましょう
              </p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border"
              style={{ borderColor: "#F3F4F6", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              {recentItems.map((item, i) => (
                <a key={item.id} href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 bg-white border-b last:border-0 transition hover:bg-gray-50 active:bg-gray-100"
                  style={{ borderColor: "#F3F4F6" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#E85D04" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "#1A1A1A" }}>{item.title}</p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "#888888" }}>{item.sub}</p>
                  </div>
                  <span style={{ color: "#888888" }}><IconChevronRight /></span>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* ⑦ 今日のおすすめ */}
        <section className="mt-6">
          <h2 className="text-[18px] font-black mb-3" style={{ color: "#1A1A1A" }}>今日のおすすめ</h2>
          <div className="rounded-2xl px-5 py-5 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 60%, #1B4332 100%)" }}>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
              {seasonal.label}
            </p>
            <p className="text-xl font-black text-white leading-snug mb-1">{seasonal.name}</p>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
              {seasonal.desc}
            </p>
            <a href={`/stage1?q=${encodeURIComponent(seasonal.name)}`}
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-black text-white transition hover:opacity-90 active:scale-95"
              style={{ background: "#E85D04" }}>
              今すぐ調べる →
            </a>
            {/* デコ円 */}
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-10"
              style={{ background: "white" }} />
            <div className="absolute -right-4 -bottom-10 w-36 h-36 rounded-full opacity-5"
              style={{ background: "white" }} />
          </div>
        </section>

        {/* ⑧ プランを選ぶ */}
        <section className="mt-6 mb-2">
          <h2 className="text-[18px] font-black mb-3" style={{ color: "#1A1A1A" }}>プランを選ぶ</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {PLANS_DATA.map(plan => (
              <div key={plan.label}
                className="shrink-0 w-48 rounded-2xl border-2 flex flex-col p-4"
                style={{
                  background:   plan.bg,
                  borderColor:  plan.current ? plan.border : "#E5E7EB",
                  boxShadow:    plan.current ? `0 0 0 2px ${plan.border}` : "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                {/* バッジ */}
                {plan.badge && (
                  <span className="self-start text-[10px] font-black text-white px-2 py-0.5 rounded-full mb-2"
                    style={{ background: plan.badgeColor }}>
                    {plan.badge}
                  </span>
                )}
                <p className="text-sm font-black mb-1" style={{ color: "#1A1A1A" }}>{plan.label}</p>
                <p className="text-base font-black mb-0.5" style={{ color: "#1A1A1A" }}>{plan.price}</p>
                <p className="text-[10px] mb-3" style={{ color: "#888888" }}>{plan.priceNote}</p>
                <ul className="space-y-1 flex-1 mb-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-1 text-[11px]" style={{ color: "#1A1A1A" }}>
                      <span className="font-bold mt-0.5 shrink-0" style={{ color: "#E85D04" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.note && (
                  <p className="text-[10px] mb-3 px-2 py-1.5 rounded-lg leading-snug"
                    style={{ background: "rgba(27,67,50,0.08)", color: "#1B4332" }}>
                    {plan.note}
                  </p>
                )}
                <button className="w-full py-2 rounded-xl text-xs font-black transition hover:opacity-90 active:scale-95"
                  style={{ background: plan.btnBg, color: plan.btnColor }}>
                  {plan.btnLabel}
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>{/* /max-w-xl */}

      {/* ⑨ 下部ナビゲーションバー */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t"
        style={{ borderColor: "#F3F4F6", boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
        <div className="flex max-w-xl mx-auto">
          {[
            { label: "ホーム",   emoji: "🏠", href: "/"                   },
            { label: "調べる",   emoji: "📖", href: "/stage1"             },
            { label: "治療",     emoji: "🩺", href: "/stage1"             },
            { label: "相談",     emoji: "💬", href: "/stage1"             },
            { label: "MY",       emoji: "👤", href: "/mypage"             },
          ].map(tab => {
            const active = tab.href === "/" && typeof window !== "undefined" && location.pathname === "/";
            return (
              <a key={tab.label} href={tab.href}
                className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all"
                style={{
                  color: tab.href === "/" ? "#E85D04" : "#888888",
                  transition: "color 0.2s",
                }}>
                <span className="text-lg leading-none">{tab.emoji}</span>
                <span className="text-[10px] font-semibold leading-none"
                  style={{ color: tab.href === "/" ? "#E85D04" : "#888888" }}>
                  {tab.label}
                </span>
              </a>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
