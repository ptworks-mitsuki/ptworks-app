"use client";

import { useState } from "react";
import Link from "next/link";
import { useBookmarks } from "@/hooks/useBookmarks";

export default function BookmarksPage() {
  const { bookmarks, removeBookmark, updateNote } = useBookmarks();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText]   = useState("");

  const startEdit = (id: string, currentNote: string) => {
    setEditingId(id);
    setNoteText(currentNote);
  };

  const saveNote = (id: string) => {
    updateNote(id, noteText);
    setEditingId(null);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">ブックマーク・メモ</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          保存した疾患にメモを追加できます。メディカルサーチ結果から追加してください。
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <p className="text-4xl mb-4">🔖</p>
          <p className="font-bold text-gray-900 dark:text-white mb-2">ブックマークがありません</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            メディカルサーチの検索結果から疾患をブックマークできます
          </p>
          <Link href="/stage1"
            className="inline-block px-6 py-2.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90"
            style={{ background: "#E85D04" }}>
            メディカルサーチへ →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map(bm => (
            <div key={bm.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#E85D04]">🔖</span>
                  <h3 className="font-bold text-gray-900 dark:text-white">{bm.disease}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/stage1"
                    className="text-xs text-[#E85D04] hover:underline font-semibold">
                    再検索
                  </Link>
                  <button onClick={() => removeBookmark(bm.id)}
                    className="text-xs text-gray-300 dark:text-gray-600 hover:text-red-500 transition">
                    削除
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">
                {new Date(bm.createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
              </p>

              {editingId === bm.id ? (
                <div>
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    placeholder="メモを入力..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => saveNote(bm.id)}
                      className="px-4 py-1.5 rounded-lg font-bold text-white text-xs transition hover:opacity-90"
                      style={{ background: "#E85D04" }}>
                      保存
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="px-4 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => startEdit(bm.id, bm.note)}
                  className="min-h-[2.5rem] px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/10 transition border border-dashed border-gray-200 dark:border-gray-600">
                  {bm.note ? (
                    <p className="leading-relaxed">{bm.note}</p>
                  ) : (
                    <p className="text-gray-300 dark:text-gray-600 text-xs">クリックしてメモを追加...</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
