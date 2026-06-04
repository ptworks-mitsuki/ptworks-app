"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface HeaderProps {
  onSidebarToggle: () => void;
  sidebarOpen:     boolean;
}

const NOTIFICATIONS = [
  { id: 1, text: "新機能：患者状態フィルターが追加されました",     date: "2025-05-13", read: false },
  { id: 2, text: "Stage 2（副業支援プラン）が近日公開予定です",   date: "2025-05-10", read: false },
  { id: 3, text: "メディカルサーチのAIモデルが更新されました",     date: "2025-05-05", read: true  },
];

const UNREAD_COUNT = NOTIFICATIONS.filter(n => !n.read).length;

export function Header({ onSidebarToggle, sidebarOpen }: HeaderProps) {
  const router = useRouter();
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const visited = localStorage.getItem("pt-visited");
    if (visited) {
      setIsReturningUser(true);
    } else {
      localStorage.setItem("pt-visited", "1");
    }
  }, []);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

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
              <span className="font-black text-base" style={{ color: "#E85D04" }}>Works</span>
            </div>
          </Link>
        </div>

        {/* ── 中央：タグライン ── */}
        <div className="hidden md:block flex-1 max-w-xs">
          <p className="text-xs text-gray-400 text-center truncate">現役PTが作る、臨床準備のためのAIツール</p>
        </div>

        {/* ── 右：アクション ── */}
        <div className="flex items-center gap-1.5">

          {/* ── ベルアイコン＋ドロップダウン ── */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"
              aria-label="お知らせ"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {UNREAD_COUNT > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E85D04]" />
              )}
            </button>

            {/* ドロップダウン */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-black text-gray-900">お知らせ</p>
                  {UNREAD_COUNT > 0 && (
                    <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                      style={{ background: "#E85D04" }}>
                      {UNREAD_COUNT} 件未読
                    </span>
                  )}
                </div>

                {/* 通知リスト */}
                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {NOTIFICATIONS.map(n => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 ${
                        !n.read ? "bg-orange-50/60" : "bg-white"
                      }`}
                    >
                      <div
                        className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                        style={{ background: n.read ? "#D1D5DB" : "#E85D04" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-snug">{n.text}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{n.date}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* フッター */}
                <div className="px-4 py-2 border-t border-gray-100 text-center">
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
            style={{ background: "#E85D04" }}
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
