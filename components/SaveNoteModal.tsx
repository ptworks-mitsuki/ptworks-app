"use client";

import { useState, useEffect, useRef } from "react";
import { loadTags, type NoteType, type NoteLiterature } from "@/lib/notes";

// ── バッジ色 ──────────────────────────────────────────────────────────────

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  gpt:          "GPT回答",
  treatment:    "治療プラン",
  literature:   "文献",
  homeexercise: "指導書",
};
export const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  gpt:          "#1B4332",
  treatment:    "#E85D04",
  literature:   "#2563EB",
  homeexercise: "#7C3AED",
};

// ── Props ─────────────────────────────────────────────────────────────────

interface SaveNoteModalProps {
  type:         NoteType;
  defaultTitle: string;
  content:      string;
  literature?:  NoteLiterature[];
  onSave: (data: {
    title:      string;
    memo:       string;
    tags:       string[];
  }) => void;
  onCancel: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export function SaveNoteModal({
  type, defaultTitle, onSave, onCancel,
}: SaveNoteModalProps) {
  const [title,    setTitle]    = useState(defaultTitle.slice(0, 40));
  const [memo,     setMemo]     = useState("");
  const [tags,     setTags]     = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [allTags,  setAllTags]  = useState<string[]>([]);
  const tagRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAllTags(loadTags());
  }, []);

  const addTag = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags(prev => [...prev, trimmed]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

  const suggestedTags = allTags.filter(t =>
    !tags.includes(t) &&
    (tagInput === "" || t.includes(tagInput)),
  ).slice(0, 6);

  const color = NOTE_TYPE_COLORS[type];
  const label = NOTE_TYPE_LABELS[type];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* ヘッダー */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: color }}>
              {label}
            </span>
            <p className="text-base font-black text-gray-900">ノートに保存</p>
          </div>
          <button onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
              <path d="M1 1l12 12M13 1L1 13"/>
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">

          {/* タイトル */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition"
              style={{ color: "#1A1A1A" }}
              placeholder="タイトルを入力"
              maxLength={80}
            />
          </div>

          {/* メモ */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">メモ（任意）</label>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition resize-none"
              style={{ color: "#1A1A1A" }}
              placeholder="自分の気づきを入力..."
              rows={3}
            />
          </div>

          {/* タグ */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">タグ（任意）</label>

            {/* 選択済みタグ */}
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {tags.map(t => (
                <span key={t}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer"
                  style={{ background: "#FFF7ED", color: "#E85D04", border: "1px solid #FED7AA" }}
                  onClick={() => removeTag(t)}>
                  {t}
                  <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-2.5 h-2.5">
                    <path d="M1 1l8 8M9 1L1 9"/>
                  </svg>
                </span>
              ))}
            </div>

            {/* タグ入力 */}
            <div className="flex gap-2">
              <input
                ref={tagRef}
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); }
                }}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-400 transition"
                placeholder="タグを入力して Enter"
              />
              <button onClick={() => addTag(tagInput)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
                style={{ background: "#E85D04" }}>
                追加
              </button>
            </div>

            {/* サジェスト */}
            {suggestedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {suggestedTags.map(t => (
                  <button key={t} onClick={() => addTag(t)}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-200 hover:border-orange-300 hover:text-orange-600 transition"
                    style={{ background: "#F9FAFB", color: "#888" }}>
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* アクション */}
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition">
              キャンセル
            </button>
            <button
              onClick={() => { if (title.trim()) onSave({ title: title.trim(), memo, tags }); }}
              disabled={!title.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-black text-white transition hover:opacity-90 disabled:opacity-30"
              style={{ background: "#E85D04" }}>
              保存する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────

export function NoteToast({ visible }: { visible: boolean }) {
  return (
    <div
      className="fixed bottom-24 left-1/2 z-[70] px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-xl pointer-events-none transition-all duration-300"
      style={{
        background: "#1B4332",
        transform:  `translateX(-50%) translateY(${visible ? "0" : "12px"})`,
        opacity:    visible ? 1 : 0,
      }}>
      ノートに保存しました
    </div>
  );
}

// ── Save icon button ──────────────────────────────────────────────────────

export function SaveIconButton({
  saved, onClick, size = 16,
}: { saved: boolean; onClick: () => void; size?: number }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition hover:opacity-80 active:scale-95"
      style={{
        background:  saved ? "#FFF7ED" : "#F9FAFB",
        borderColor: saved ? "#FED7AA" : "#E5E7EB",
        color:       saved ? "#E85D04" : "#9CA3AF",
      }}
      title={saved ? "保存済み" : "ノートに保存"}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={saved ? "#E85D04" : "none"}
        stroke={saved ? "#E85D04" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      {saved ? "保存済み" : "保存"}
    </button>
  );
}
