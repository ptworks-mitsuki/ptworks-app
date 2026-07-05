"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useFreeQuota } from "@/hooks/useFreeQuota";

// ─── 定数 ─────────────────────────────────────────────────────────────────

const BANNER_KEY  = "pt-banner-closed-v2";
const STREAK_KEY  = "pt-streak-days";
const GPT_HISTORY_KEY = "pt-gpt-history";
const PLANS_KEY   = "pt-saved-plans";

const QUICK_TAGS = [
  "変形性膝関節症",
  "人工股関節の禁忌",
  "脳梗塞の評価",
  "算定日数",
  "副業の始め方",
];

const QUICK_ACCESS = [
  { id: "treatment", label: "治療を考える",       sub: "AI個別提案",  href: "/stage1",              icon: <IconClipboard /> },
  { id: "slides",    label: "スライド自動生成",   sub: "発表を10分で", href: "/stage1/slides",       icon: <IconSlides /> },
  { id: "calc",      label: "診療報酬・算定ガイド", sub: "点数・加算", href: "/learn/reimbursement", icon: <IconCalc /> },
  { id: "lit",       label: "文献検索",           sub: "論文・書籍",  href: "/stage1/literature",   icon: <IconBook /> },
  { id: "homeex",    label: "自主トレ指導書作成", sub: "患者指導に",  href: "/stage1/homeexercise", icon: <IconSheet /> },
  { id: "learn",     label: "学習コンテンツ",     sub: "スキルアップ", href: "/learn",               icon: <IconGraduate /> },
];

const BOTTOM_TABS = [
  { label: "ホーム",   emoji: "🏠", href: "/"        },
  { label: "PT-GPT",  emoji: "🤖", href: "/pt-gpt"  },
  { label: "治療",     emoji: "🩺", href: "/stage1"  },
  { label: "サービス", emoji: "📋", href: null        }, // opens sheet
  { label: "MY",       emoji: "👤", href: "/mypage"  },
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
function IconClose({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 1l12 12M13 1L1 13"/>
    </svg>
  );
}

// ─── 挨拶 ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "おはようございます";
  return "お疲れ様です";
}

// ─── 通知ドロップダウン ───────────────────────────────────────────────────

const NOTIFICATIONS = [
  { id: 1, text: "PT専用GPTが追加されました。疾患・相談が1つの窓口に",  date: "2026-07-06", read: false },
  { id: 2, text: "疾患を調べる の教科書参照が強化されました",            date: "2026-06-25", read: false },
  { id: 3, text: "AIモデルが最新版（Sonnet 4.6）に更新されました",       date: "2026-06-20", read: true  },
];

// ─── サービスシート ────────────────────────────────────────────────────────

function ServiceSheet({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl overflow-hidden"
        style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }}
      >
        {/* ハンドル */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-4 pb-2 pt-1 flex items-center justify-between">
          <p className="text-base font-black" style={{ color: "#1A1A1A" }}>サービス一覧</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition" style={{ color: "#888" }}>
            <IconClose size={14} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 px-4 pb-6">
          {QUICK_ACCESS.map(item => (
            <a key={item.id} href={item.href} onClick={onClose}
              className="flex flex-col items-center text-center py-4 px-2 rounded-2xl border transition active:scale-95"
              style={{ background: "#F9FAFB", borderColor: "#F3F4F6", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <span className="mb-2" style={{ color: "#888" }}>{item.icon}</span>
              <p className="text-xs font-black leading-snug" style={{ color: "#1A1A1A" }}>{item.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "#888" }}>{item.sub}</p>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── ホームページ ─────────────────────────────────────────────────────────

interface GptMessage { id: string; role: string; content: string; }
interface SavedPlan  { id: string; name: string; disease: string; savedAt: number; }

export default function HomePage() {
  const router   = useRouter();
  const pathname = usePathname();
  const { used, total, remaining, isExhausted, percentage } = useFreeQuota();

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [bannerClosed, setBannerClosed] = useState(true);
  const [showNotif,    setShowNotif]    = useState(false);
  const [showService,  setShowService]  = useState(false);
  const [streak,       setStreak]       = useState(0);
  const [recentItems,  setRecentItems]  = useState<{ id: string; title: string; sub: string; href: string }[]>([]);

  const [query,        setQuery]        = useState("");
  const [focused,      setFocused]      = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);

  const unread  = NOTIFICATIONS.filter(n => !n.read).length;
  const isLow   = remaining <= 2;
  const greeting = getGreeting();

  // ── localStorage 読み込み ──
  useEffect(() => {
    try {
      if (!localStorage.getItem(BANNER_KEY)) setBannerClosed(false);
      const s = localStorage.getItem(STREAK_KEY);
      if (s) setStreak(Number(s));

      // PT-GPT 履歴
      const gh = localStorage.getItem(GPT_HISTORY_KEY);
      const gptItems = gh
        ? (JSON.parse(gh) as GptMessage[])
            .filter(m => m.role === "user")
            .slice(-3)
            .reverse()
            .map(m => ({
              id:    m.id,
              title: m.content.slice(0, 40) + (m.content.length > 40 ? "..." : ""),
              sub:   "PT専用GPT",
              href:  `/pt-gpt?q=${encodeURIComponent(m.content)}`,
            }))
        : [];

      // 保存プラン
      const pp = localStorage.getItem(PLANS_KEY);
      const planItems = pp
        ? (JSON.parse(pp) as SavedPlan[])
            .slice(0, 2)
            .map(p => ({
              id:    p.id,
              title: p.name || p.disease,
              sub:   "治療プラン",
              href:  "/stage1",
            }))
        : [];

      setRecentItems([...gptItems, ...planItems].slice(0, 3));
    } catch { /* ignore */ }
  }, []);

  // 通知ドロップ外クリックで閉じる
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    if (showNotif) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showNotif]);

  // textarea 自動リサイズ
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
    router.push(`/pt-gpt?q=${encodeURIComponent(q)}`);
  };

  const handleTag = (tag: string) => {
    router.push(`/pt-gpt?q=${encodeURIComponent(tag)}`);
  };

  return (
    <div className="bg-white min-h-screen" style={{ color: "#1A1A1A" }}>

      {/* サイドバー */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* サービスシート */}
      {showService && <ServiceSheet onClose={() => setShowService(false)} />}

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

        {/* ③ 挨拶・残り回数・ストリーク */}
        <section className="pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            {/* 挨拶 */}
            <p className="text-[22px] font-black leading-tight" style={{ color: "#1A1A1A" }}>
              {greeting}
            </p>

            {/* ストリーク */}
            {streak > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full shrink-0"
                style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
                <span className="text-base leading-none">🔥</span>
                <span className="text-sm font-black" style={{ color: "#E85D04" }}>{streak}</span>
                <span className="text-[11px] font-semibold" style={{ color: "#EA580C" }}>日連続</span>
              </div>
            )}
          </div>

          {/* 無料枠 */}
          <div className="rounded-2xl px-4 py-3"
            style={{
              background:   isExhausted ? "#FEF2F2" : isLow ? "#FFF7ED" : "#F9FAFB",
              border:       `1px solid ${isExhausted ? "#FECACA" : isLow ? "#FED7AA" : "#F3F4F6"}`,
            }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold" style={{ color: isLow ? "#9A3412" : "#888" }}>
                今月の無料枠
              </p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[11px] font-semibold" style={{ color: isLow ? "#EA580C" : "#888" }}>残り</span>
                <span className="text-xl font-black leading-none" style={{ color: isLow ? "#E85D04" : "#1A1A1A" }}>{remaining}</span>
                <span className="text-[11px] font-semibold" style={{ color: isLow ? "#EA580C" : "#888" }}>回</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isLow ? "#FED7AA" : "#E5E7EB" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percentage}%`, background: isLow ? "#E85D04" : "#1B4332" }} />
            </div>
            {isExhausted && (
              <p className="text-[10px] mt-2 font-bold text-red-600">
                今月の無料枠を使い切りました —{" "}
                <a href="/pricing" className="underline underline-offset-2">アップグレード</a>
              </p>
            )}
          </div>
        </section>

        {/* ④ PT専用GPT 検索窓 */}
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

          {/* クイックタグ */}
          <div className="flex gap-2 overflow-x-auto mt-3 pb-1" style={{ scrollbarWidth: "none" }}>
            {QUICK_TAGS.map(tag => (
              <button key={tag} onClick={() => handleTag(tag)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition hover:border-orange-400 hover:text-orange-600 active:scale-95"
                style={{ background: "#F9FAFB", borderColor: "#E5E7EB", color: "#888" }}>
                {tag}
              </button>
            ))}
          </div>
        </section>

        {/* ⑤ クイックアクセス */}
        <section className="mb-6">
          <h2 className="text-base font-black mb-3" style={{ color: "#1A1A1A" }}>クイックアクセス</h2>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_ACCESS.map(item => (
              <a key={item.id} href={item.href}
                className="flex flex-col items-center text-center py-4 px-2 rounded-2xl border transition active:scale-95 hover:border-orange-200"
                style={{
                  background:  "#F9FAFB",
                  borderColor: "#F3F4F6",
                  boxShadow:   "0 2px 8px rgba(0,0,0,0.04)",
                  borderRadius: "16px",
                }}>
                <span className="mb-2" style={{ color: "#888" }}>{item.icon}</span>
                <p className="text-xs font-black leading-snug" style={{ color: "#1A1A1A" }}>{item.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#888" }}>{item.sub}</p>
              </a>
            ))}
          </div>
        </section>

        {/* ⑥ 続きから始める */}
        <section className="mb-28">
          <h2 className="text-base font-black mb-3" style={{ color: "#1A1A1A" }}>続きから始める</h2>
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
                <a key={item.id} href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 bg-white border-b last:border-0 transition hover:bg-gray-50 active:bg-gray-100"
                  style={{ borderColor: "#F3F4F6" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#E85D04" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "#1A1A1A" }}>{item.title}</p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "#888" }}>{item.sub}</p>
                  </div>
                  <span style={{ color: "#ccc" }}><IconChevronRight /></span>
                </a>
              ))}
            </div>
          )}
        </section>

      </div>{/* /max-w-xl */}

      {/* ⑦ 下部ナビゲーションバー */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t"
        style={{ borderColor: "#F3F4F6", boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
        <div className="flex max-w-xl mx-auto">
          {BOTTOM_TABS.map(tab => {
            const isActive = tab.href ? pathname === tab.href : false;
            const isServiceTab = tab.label === "サービス";
            return (
              <button
                key={tab.label}
                onClick={() => {
                  if (isServiceTab) {
                    setShowService(v => !v);
                  } else if (tab.href) {
                    router.push(tab.href);
                  }
                }}
                className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors"
                style={{ color: isActive ? "#E85D04" : "#888", background: "none", border: "none", cursor: "pointer" }}
              >
                <span className="text-lg leading-none">{tab.emoji}</span>
                <span className="text-[10px] font-semibold leading-none"
                  style={{ color: isActive ? "#E85D04" : "#888" }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
