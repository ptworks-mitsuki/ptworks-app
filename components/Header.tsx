"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { notifications as STATIC_NOTIFS, type Notification, type NotificationType } from "@/app/config/notifications";

const ORANGE = "#E85D04";
const GREEN  = "#1B4332";
const READ_KEY = "ptworks_read_notifications";

interface HeaderProps {
  onSidebarToggle: () => void;
  sidebarOpen:     boolean;
}

// ─── Badge meta ──────────────────────────────────────────────────────────────

const TYPE_META: Record<NotificationType, { label: string; color: string }> = {
  feature:   { label: "新機能",       color: ORANGE   },
  update:    { label: "アップデート", color: GREEN    },
  fix:       { label: "修正",         color: "#6B7280" },
  important: { label: "重要",         color: "#EF4444" },
};

// ─── LocalStorage helpers ─────────────────────────────────────────────────

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Header({ onSidebarToggle, sidebarOpen }: HeaderProps) {
  const router = useRouter();
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [readIds,    setReadIds]    = useState<Set<string>>(new Set());
  const [isDesktop,  setIsDesktop]  = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // 初期化
  useEffect(() => {
    const visited = localStorage.getItem("pt-visited");
    if (visited) setIsReturningUser(true);
    else         localStorage.setItem("pt-visited", "1");
    setReadIds(loadReadIds());
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [notifOpen]);

  // 開いた時に表示中の通知を全て既読にする
  const openNotif = useCallback(() => {
    setNotifOpen(v => {
      if (!v) {
        // 開く時に全通知を既読セットへ追加
        const next = new Set(loadReadIds());
        STATIC_NOTIFS.forEach(n => next.add(n.id));
        saveReadIds(next);
        setReadIds(next);
      }
      return !v;
    });
  }, []);

  // 全て既読にする
  const markAllRead = useCallback(() => {
    const next = new Set<string>(STATIC_NOTIFS.map(n => n.id));
    saveReadIds(next);
    setReadIds(next);
  }, []);

  const isUnread = (n: Notification) => n.isNew && !readIds.has(n.id);
  const unreadCount = STATIC_NOTIFS.filter(isUnread).length;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm print:hidden sticky top-0 z-50 h-14">
      <div className="h-full max-w-full px-4 flex items-center justify-between gap-3">

        {/* ── 左：ハンバーガー＋ロゴ ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSidebarToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label={sidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0"
              style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}>
              P
            </div>
            <div className="hidden sm:flex items-baseline gap-0.5">
              <span className="font-black text-gray-900 text-base">PT</span>
              <span className="font-black text-base" style={{ color: ORANGE }}>Works</span>
            </div>
          </Link>
        </div>

        {/* ── 中央：タグライン ── */}
        <div className="hidden md:block flex-1 max-w-xs">
          <p className="text-[14px] text-center truncate" style={{ color: "#1B4332", fontWeight: 400 }}>理学療法士の考えを育てるAI</p>
        </div>

        {/* ── 右：アクション ── */}
        <div className="flex items-center gap-1.5">

          {/* ── ベルアイコン＋ドロップダウン ── */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={openNotif}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"
              aria-label="お知らせ"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>

              {/* 数字バッジ */}
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-white font-black leading-none px-1"
                  style={{ background: ORANGE, fontSize: 9 }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* ドロップダウン */}
            {notifOpen && (
              <div
                className="bg-white border border-gray-200 overflow-hidden"
                style={isDesktop ? {
                  position: "fixed",
                  top: 60,
                  right: 20,
                  left: "auto",
                  transform: "none",
                  width: 380,
                  maxHeight: "70vh",
                  overflowY: "auto",
                  zIndex: 9999,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  borderRadius: 16,
                } : {
                  position: "fixed",
                  top: 60,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "calc(100vw - 32px)",
                  maxWidth: 420,
                  maxHeight: "70vh",
                  overflowY: "auto",
                  zIndex: 9999,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  borderRadius: 16,
                }}
              >

                {/* ヘッダー行 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-black text-gray-900">お知らせ</p>
                  <button
                    onClick={markAllRead}
                    className="text-xs font-bold transition hover:opacity-70"
                    style={{ color: ORANGE }}
                  >
                    全て既読にする
                  </button>
                </div>

                {/* 通知リスト */}
                <div className="divide-y divide-gray-100">
                  {STATIC_NOTIFS.map(n => {
                    const unread = isUnread(n);
                    const meta   = TYPE_META[n.type];
                    return (
                      <div
                        key={n.id}
                        className="px-4 py-3.5 transition"
                        style={{ background: unread ? "#FFF7ED" : "#fff" }}
                      >
                        {/* タイプバッジ＋日付 */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="text-xs font-black px-2 py-0.5 rounded-full text-white"
                            style={{ background: meta.color, fontSize: 10 }}
                          >
                            {meta.label}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0 ml-2">{n.date}</span>
                        </div>

                        {/* タイトル */}
                        <p className="text-sm font-black text-gray-900 leading-snug mb-0.5"
                          style={{ wordBreak: "break-word", whiteSpace: "normal", overflowWrap: "break-word" }}>
                          {n.title}
                        </p>

                        {/* 本文 */}
                        <p className="text-xs text-gray-500 leading-relaxed"
                          style={{ wordBreak: "break-word", whiteSpace: "normal", overflowWrap: "break-word" }}>
                          {n.body}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* フッター */}
                <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            )}
          </div>

          {isReturningUser && (
            <Link
              href="/login"
              className="hidden sm:block text-xs font-medium text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
            >
              ログイン
            </Link>
          )}

          <Link
            href="/register"
            className="text-xs font-bold text-white px-3 py-1.5 rounded-lg transition hover:opacity-90 shadow-sm"
            style={{ background: ORANGE }}
          >
            無料登録
          </Link>

          <button
            onClick={handleLogout}
            className="hidden lg:block text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 transition ml-1"
          >
            logout
          </button>
        </div>
      </div>
    </header>
  );
}
