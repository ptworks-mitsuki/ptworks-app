"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { OnboardingModal, isOnboardingDone } from "@/components/OnboardingModal";
import { useFreeQuota } from "@/hooks/useFreeQuota";
import { loadRecentTopics, deleteRecentTopic } from "@/lib/recent-topics";

// ─── 定数 ─────────────────────────────────────────────────────────────────

const BANNER_KEY = "pt-banner-closed-v2";
const STREAK_KEY = "pt-streak-days";
const PLANS_KEY  = "pt-saved-plans";

const SAMPLE_QUESTIONS = [
  "変形性膝関節症の運動療法はどこまでエビデンスがある？",
  "肩関節周囲炎の禁忌は？",
  "脳梗塞発症後のリハビリ開始時期は？",
];

const QUICK_ACCESS_TOP = [
  { id: "gpt",  label: "PT専用GPT", sub: "AI何でも相談", href: "/pt-gpt",             icon: <IconChat />,  },
  { id: "lit",  label: "文献検索",  sub: "論文・書籍",   href: "/stage1/literature", icon: <IconBook />,  },
  { id: "myp",  label: "マイノート", sub: "保存・復習",    href: "/mynote",            icon: <IconSheet size={22} /> },
];

const QUICK_ACCESS_SUB = [
  { id: "treatment", label: "AI治療考察", sub: "AI個別提案", href: "/stage1/treatment",    icon: <IconClipboard size={18} /> },
  { id: "slides",    label: "スライド",   sub: "発表資料",   href: "/stage1/slides",       icon: <IconSlides    size={18} /> },
  { id: "calc",      label: "診療報酬",   sub: "点数・加算", href: "/learn/reimbursement", icon: <IconCalc      size={18} /> },
  { id: "homeex",    label: "自主トレ",   sub: "患者指導",   href: "/stage1/homeexercise", icon: <IconSheet     size={18} /> },
];

// ─── アイコン ─────────────────────────────────────────────────────────────

function IconMenu({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function IconBell({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
function IconSend({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}
function IconChevronRight({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  );
}
function IconClipboard({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
    </svg>
  );
}
function IconSlides({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
function IconCalc({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/>
    </svg>
  );
}
function IconBook({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function IconSheet({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
    </svg>
  );
}
function IconGraduate({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  );
}
function IconChat({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconClose({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 1l12 12M13 1L1 13"/>
    </svg>
  );
}

// ─── 通知 ─────────────────────────────────────────────────────────────────

const NOTIFICATIONS = [
  { id: 1, text: "PT専用GPTが追加されました。疾患・相談が1つの窓口に",  date: "2026-07-06", read: false },
  { id: 2, text: "疾患を調べる の教科書参照が強化されました",            date: "2026-06-25", read: false },
  { id: 3, text: "AIモデルが最新版（Sonnet 4.6）に更新されました",       date: "2026-06-20", read: true  },
];

// ─── ホームページ ─────────────────────────────────────────────────────────

interface SavedPlan { id: string; name: string; disease: string; savedAt: number; }
interface RecentItem { id: string; title: string; sub: string; href: string; topicId?: string; }

export default function HomePage() {
  const router = useRouter();
  const { used, total, remaining, isExhausted, percentage } = useFreeQuota();

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [bannerClosed, setBannerClosed] = useState(true);
  const [showNotif,    setShowNotif]    = useState(false);
  const [streak,       setStreak]       = useState(0);
  const [recentItems,  setRecentItems]  = useState<RecentItem[]>([]);
  const [deleteToast,      setDeleteToast]      = useState(false);
  const [comingSoonToast,  setComingSoonToast]  = useState(false);
  const [showOnboarding,   setShowOnboarding]   = useState(false);
  const deleteToastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const comingSoonTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [query,   setQuery]   = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);

  const unread = NOTIFICATIONS.filter(n => !n.read).length;
  const isLow  = remaining <= 2;

  // ── 初回オンボーディング ──
  useEffect(() => {
    if (!isOnboardingDone()) setShowOnboarding(true);
  }, []);

  // ── localStorage 読み込み ──
  useEffect(() => {
    try {
      if (!localStorage.getItem(BANNER_KEY)) setBannerClosed(false);
      const s = localStorage.getItem(STREAK_KEY);
      if (s) setStreak(Number(s));

      const topics = loadRecentTopics();
      const gptItems: RecentItem[] = topics.slice(0, 3).map(t => {
        const diffMs  = Date.now() - new Date(t.savedAt).getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const timeStr = diffMin < 60
          ? `${diffMin}分前`
          : diffMin < 1440
          ? `${Math.floor(diffMin / 60)}時間前`
          : `${Math.floor(diffMin / 1440)}日前`;
        return {
          id:      t.id,
          title:   t.title || t.query.slice(0, 20),
          sub:     `PT専用GPT・${timeStr}`,
          href:    `/pt-gpt?topic=${encodeURIComponent(t.id)}`,
          topicId: t.id,
        };
      });

      const pp = localStorage.getItem(PLANS_KEY);
      const planItems: RecentItem[] = pp
        ? (JSON.parse(pp) as SavedPlan[])
            .slice(0, 2)
            .map(p => ({ id: p.id, title: p.name || p.disease, sub: "治療プラン", href: "/stage1" }))
        : [];

      setRecentItems([...gptItems, ...planItems].slice(0, 3));
    } catch { /* ignore */ }
  }, []);

  const handleDeleteRecent = (topicId: string) => {
    deleteRecentTopic(topicId);
    setRecentItems(prev => prev.filter(item => item.topicId !== topicId));
    if (deleteToastTimer.current) clearTimeout(deleteToastTimer.current);
    setDeleteToast(true);
    deleteToastTimer.current = setTimeout(() => setDeleteToast(false), 1000);
  };

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    if (showNotif) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showNotif]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [query]);

  const closeBanner = () => {
    setBannerClosed(true);
    try { localStorage.setItem(BANNER_KEY, "1"); } catch { /* ignore */ }
  };

  const handleSend = () => {
    const q = query.trim();
    if (!q) return;
    try { sessionStorage.setItem("ptgpt_pending_query", q); } catch { /* ignore */ }
    router.push(`/pt-gpt?q=${encodeURIComponent(q)}`);
  };

  const handleSample = (q: string) => {
    setQuery(q);
    textareaRef.current?.focus();
  };

  const handleComingSoon = () => {
    if (comingSoonTimer.current) clearTimeout(comingSoonTimer.current);
    setComingSoonToast(true);
    comingSoonTimer.current = setTimeout(() => setComingSoonToast(false), 1000);
  };

  return (
    <div className="bg-white min-h-screen" style={{ color: "#1A1A1A" }}>

      {/* サイドバー */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ① ヘッダー */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between px-4 h-14 max-w-xl mx-auto">

          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(v => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              style={{ color: "#1A1A1A" }} aria-label="メニューを開く">
              <IconMenu size={20} />
            </button>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-base"
              style={{ background: "linear-gradient(135deg,#E85D04,#c44b00)" }}>P</div>
            <span className="text-lg font-black tracking-tight">
              PT<span style={{ color: "#E85D04" }}>Works</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div ref={notifRef} className="relative">
              <button onClick={() => setShowNotif(v => !v)}
                className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                style={{ color: "#1A1A1A" }} aria-label="お知らせ">
                <IconBell size={20} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                    style={{ background: "#E85D04" }}>{unread}</span>
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-bold">お知らせ</p>
                    <span className="text-[11px] text-gray-400">{unread}件の未読</span>
                  </div>
                  <ul>
                    {NOTIFICATIONS.map(n => (
                      <li key={n.id}
                        className="px-4 py-3 border-b border-gray-50 flex items-start gap-3 last:border-0"
                        style={{ background: n.read ? "white" : "#FFFBF7" }}>
                        <span className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                          style={{ background: n.read ? "transparent" : "#E85D04" }} />
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

            <a href="/pricing"
              className="px-3 py-2 rounded-xl text-xs font-black text-white transition hover:opacity-90 active:scale-95"
              style={{ background: "#E85D04", whiteSpace: "nowrap" }}>
              プランを見る
            </a>
          </div>
        </div>
      </header>

      {/* ヘッダー分スペース */}
      <div className="h-14" />

      {/* ② お知らせバナー */}
      {!bannerClosed && (
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#1B4332" }}>
          <p className="flex-1 text-xs text-white leading-snug truncate">
            PT専用GPTが追加されました。疾患・相談・副業を1つの窓口でサポートします
          </p>
          <button onClick={closeBanner}
            className="shrink-0 w-5 h-5 flex items-center justify-center text-white/60 hover:text-white transition"
            aria-label="閉じる">
            <IconClose size={12} />
          </button>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4">

        {/* ③ キャッチコピー・サービス説明 */}
        <section className="pt-7 pb-5 text-center">
          <h1 className="text-[20px] font-black leading-tight mb-2" style={{ color: "#1A1A1A" }}>
            理学療法士のための<br />AI思考パートナー
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
            有料版Claude AIを基盤に、理学療法士専用へ進化。<br />
            PubMed・J-STAGEの文献データベースと連携し<br />
            無料で月5回まで利用可能です。
          </p>
        </section>

        {/* ④ 質問例（吹き出しカード） */}
        <section className="mb-4">
          <p className="text-xs font-bold mb-2.5" style={{ color: "#9CA3AF" }}>こんな質問ができます</p>
          <div className="space-y-2">
            {SAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSample(q)}
                className="w-full text-left px-4 py-3 rounded-2xl border transition hover:border-orange-300 hover:bg-orange-50 active:scale-[0.98]"
                style={{
                  background:   "#F9FAFB",
                  borderColor:  "#E5E7EB",
                  borderRadius: "16px",
                }}
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 text-base leading-none">💬</span>
                  <p className="text-sm leading-snug" style={{ color: "#374151" }}>{q}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ⑤ PT専用GPT 検索窓 */}
        <section className="mb-4">
          <div
            className="rounded-2xl overflow-hidden transition-all duration-200"
            style={{
              background:  "#F5F5F5",
              border:      `2px solid ${focused ? "#E85D04" : "transparent"}`,
              boxShadow:   focused ? "0 0 0 4px rgba(232,93,4,0.08)" : "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <textarea
              ref={textareaRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="疾患・術式・臨床の疑問を入力..."
              rows={3}
              className="w-full px-4 pt-4 pb-2 bg-transparent outline-none resize-none text-sm leading-relaxed placeholder-gray-400"
              style={{ color: "#1A1A1A", minHeight: "88px", maxHeight: "160px" }}
            />
            <div className="flex items-center justify-end px-3 pb-3">
              <button
                onClick={handleSend}
                disabled={!query.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-black transition hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "#E85D04" }}
                aria-label="送信">
                <IconSend size={15} />
                <span>送信</span>
              </button>
            </div>
          </div>
        </section>

        {/* ⑥ 残り回数・ストリーク（控えめ） */}
        <section className="mb-6">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
            style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
            {/* 無料枠 */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#E5E7EB", maxWidth: 80 }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%`, background: isLow ? "#E85D04" : "#9CA3AF" }} />
              </div>
              <p className="text-xs" style={{ color: isLow ? "#E85D04" : "#9CA3AF" }}>
                <span className="font-black">{remaining}</span>
                <span className="font-normal">/{total}回</span>
              </p>
              {isExhausted && (
                <a href="/pricing" className="text-[11px] font-bold underline underline-offset-2"
                  style={{ color: "#E85D04" }}>
                  アップグレード
                </a>
              )}
            </div>

            {/* ストリーク */}
            {streak > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-sm leading-none">🔥</span>
                <span className="text-xs font-black" style={{ color: "#9CA3AF" }}>{streak}日</span>
              </div>
            )}
          </div>
        </section>

        {/* ⑦ クイックアクセス */}
        <section className="mb-6">
          <h2 className="text-sm font-black mb-3" style={{ color: "#1A1A1A" }}>クイックアクセス</h2>

          {/* 上段：大 3列 */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            {QUICK_ACCESS_TOP.map(item => (
              <a key={item.id} href={item.href}
                className="flex flex-col items-center text-center py-4 px-2 rounded-2xl border transition active:scale-95"
                style={{
                  background:  "#FFF7ED",
                  borderColor: "#FED7AA",
                  boxShadow:   "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                <span className="mb-2" style={{ color: "#E85D04" }}>{item.icon}</span>
                <p className="text-xs font-black leading-snug" style={{ color: "#1A1A1A" }}>{item.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#888" }}>{item.sub}</p>
              </a>
            ))}
          </div>

          {/* 下段：小 4列（準備中） */}
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ACCESS_SUB.map(item => (
              <button key={item.id} type="button" onClick={handleComingSoon}
                className="relative flex flex-col items-center text-center py-3 px-1 rounded-xl border"
                style={{
                  background:  "#F9FAFB",
                  borderColor: "#F3F4F6",
                  boxShadow:   "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                <span className="absolute top-1 right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "#E5E7EB", color: "#9CA3AF" }}>準備中</span>
                <span className="mb-1.5" style={{ color: "#D1D5DB" }}>{item.icon}</span>
                <p className="text-[10px] font-black leading-snug" style={{ color: "#D1D5DB" }}>{item.label}</p>
                <p className="text-[9px] mt-0.5" style={{ color: "#D1D5DB" }}>{item.sub}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ⑧ 続きから始める */}
        <section className="mb-28">
          <h2 className="text-sm font-black mb-3" style={{ color: "#1A1A1A" }}>続きから始める</h2>
          {recentItems.length === 0 ? (
            <div className="rounded-2xl px-5 py-6 text-center"
              style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
              <p className="text-sm" style={{ color: "#888" }}>まだ履歴がありません。</p>
              <p className="text-sm mt-1" style={{ color: "#888" }}>
                上の検索窓から
                <a href="/pt-gpt" style={{ color: "#E85D04" }} className="font-bold underline underline-offset-2 mx-1">PT専用GPT</a>
                を試してみましょう
              </p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border"
              style={{ borderColor: "#F3F4F6", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              {recentItems.map(item => (
                <div key={item.id}
                  className="flex items-center bg-white border-b last:border-0"
                  style={{ borderColor: "#F3F4F6" }}>
                  <a href={item.href}
                    className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3.5 transition hover:bg-gray-50 active:bg-gray-100">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#E85D04" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#1A1A1A" }}>{item.title}</p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: "#888" }}>{item.sub}</p>
                    </div>
                    <span style={{ color: "#ccc" }}><IconChevronRight /></span>
                  </a>
                  {item.topicId && (
                    <button
                      onClick={() => handleDeleteRecent(item.topicId!)}
                      className="shrink-0 w-11 h-11 flex items-center justify-center text-gray-300 hover:text-red-400 transition"
                      aria-label="削除">
                      <IconClose size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* 削除トースト */}
      {deleteToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold pointer-events-none"
          style={{ background: "rgba(0,0,0,0.72)", whiteSpace: "nowrap" }}>
          削除しました
        </div>
      )}

      {/* 準備中トースト */}
      {comingSoonToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold pointer-events-none"
          style={{ background: "rgba(0,0,0,0.72)", whiteSpace: "nowrap" }}>
          準備中です
        </div>
      )}

      {/* オンボーディングモーダル */}
      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
        />
      )}

    </div>
  );
}
