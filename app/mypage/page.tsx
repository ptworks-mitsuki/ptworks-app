"use client";

import Link from "next/link";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useFreeQuota } from "@/hooks/useFreeQuota";

const MOCK_NOTIFICATIONS = [
  { id: 1, text: "新機能：患者状態フィルターが追加されました",     date: "2025-05-13", read: false },
  { id: 2, text: "Stage 2（副業支援プラン）が近日公開予定です",   date: "2025-05-10", read: false },
  { id: 3, text: "メディカルサーチのAIモデルが更新されました",     date: "2025-05-05", read: true  },
];

export default function MyPage() {
  const { history }   = useSearchHistory();
  const { bookmarks } = useBookmarks();
  const { used, total, remaining, percentage } = useFreeQuota();

  const todayCount  = history.filter(h => {
    const d = new Date(h.id);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">マイページ</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">利用状況・プラン確認</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">現在のプラン</p>
          <p className="font-black text-gray-900 dark:text-white text-lg mb-1">無料プラン</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Stage 1 メディカルサーチ</p>
          <Link href="/pricing"
            className="block text-center py-2 rounded-xl font-bold text-white text-xs transition hover:opacity-90"
            style={{ background: "#E85D04" }}>
            アップグレード →
          </Link>
        </div>

        {/* Quota */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">今月の無料枠</p>
          <p className="font-black text-gray-900 dark:text-white text-3xl">{remaining}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">/ {total} 回 残り</p>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${percentage}%`, background: percentage >= 80 ? "#dc2626" : "#E85D04" }} />
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{used} / {total} 回使用済み</p>
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3">今月の学習状況</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">今日の検索</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm">{todayCount} 件</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">今月の検索</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm">{used} 件</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">ブックマーク</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm">{bookmarks.length} 件</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white">お知らせ</h2>
          <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold">
            {MOCK_NOTIFICATIONS.filter(n => !n.read).length} 件未読
          </span>
        </div>
        <div className="space-y-2">
          {MOCK_NOTIFICATIONS.map(n => (
            <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl ${
              !n.read ? "bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30" : "bg-gray-50 dark:bg-gray-700/30"
            }`}>
              {!n.read && <span className="w-2 h-2 rounded-full bg-[#E85D04] shrink-0 mt-1" />}
              {n.read  && <span className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0 mt-1" />}
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{n.text}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{n.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href: "/stage1",        icon: "🔬", label: "メディカルサーチ" },
          { href: "/learn",         icon: "📚", label: "学習コンテンツ" },
          { href: "/stage1/slides", icon: "📊", label: "スライド生成" },
          { href: "/history",       icon: "📋", label: "利用履歴" },
          { href: "/bookmarks",     icon: "🔖", label: "ブックマーク" },
          { href: "/pricing",       icon: "💴", label: "プラン比較" },
          { href: "/about",         icon: "✨", label: "PT Worksとは" },
          { href: "/faq",           icon: "❓", label: "よくある質問" },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition text-sm text-gray-700 dark:text-gray-300">
            <span>{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
