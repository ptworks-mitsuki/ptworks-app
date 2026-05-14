"use client";

import Link from "next/link";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const { history, removeHistory, clearHistory } = useSearchHistory();
  const router = useRouter();

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">利用履歴</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">過去に検索した疾患の一覧</p>
        </div>
        {history.length > 0 && (
          <button onClick={clearHistory}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 transition border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
            履歴を全削除
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <p className="text-4xl mb-4">📋</p>
          <p className="font-bold text-gray-900 dark:text-white mb-2">検索履歴がありません</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">メディカルサーチで疾患を検索すると、ここに表示されます</p>
          <Link href="/stage1"
            className="inline-block px-6 py-2.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90"
            style={{ background: "#E85D04" }}>
            メディカルサーチへ →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item, i) => (
            <div key={item.id}
              className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:border-orange-300 dark:hover:border-orange-700 transition group">
              <button
                onClick={() => router.push(`/stage1`)}
                className="flex items-center gap-3 flex-1 text-left">
                <span className="text-xs text-gray-300 dark:text-gray-600 font-mono w-5 shrink-0">{i + 1}</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-[#E85D04] transition">
                    {item.query}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(Number(item.id)).toLocaleDateString("ja-JP", {
                      year: "numeric", month: "long", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <Link href="/stage1"
                  className="text-xs text-[#E85D04] hover:underline font-semibold opacity-0 group-hover:opacity-100 transition">
                  再検索
                </Link>
                <button onClick={() => removeHistory(item.id)}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition text-sm opacity-0 group-hover:opacity-100">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
          最大20件まで保存されます
        </p>
      )}
    </main>
  );
}
