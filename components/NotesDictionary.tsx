"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  loadNotes, updateNote, deleteNote, exportNotes, importNotes,
  type Note, type NoteType,
} from "@/lib/notes";
import { NOTE_TYPE_LABELS, NOTE_TYPE_COLORS } from "@/components/SaveNoteModal";

// ── タブ ──────────────────────────────────────────────────────────────────

type Tab = "all" | NoteType;

const TABS: { id: Tab; label: string }[] = [
  { id: "all",        label: "全て"    },
  { id: "gpt",        label: "GPT回答"   },
  { id: "treatment",  label: "治療プラン" },
  { id: "literature", label: "文献"       },
];

type SortKey = "newest" | "type" | "tag";

// ── 編集モーダル ──────────────────────────────────────────────────────────

function EditModal({
  note,
  onSave,
  onClose,
}: {
  note: Note;
  onSave: (patch: { title: string; memo: string; tags: string[] }) => void;
  onClose: () => void;
}) {
  const [title,    setTitle]    = useState(note.title);
  const [memo,     setMemo]     = useState(note.memo);
  const [tags,     setTags]     = useState<string[]>(note.tags);
  const [tagInput, setTagInput] = useState("");

  const addTag = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags(p => [...p, trimmed]);
    setTagInput("");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <p className="text-base font-black text-gray-900">ノートを編集</p>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
              <path d="M1 1l12 12M13 1L1 13"/>
            </svg>
          </button>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">タイトル</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition"
              style={{ color: "#1A1A1A" }} maxLength={80} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">メモ</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition resize-none"
              style={{ color: "#1A1A1A" }} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">タグ</label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {tags.map(t => (
                <span key={t} onClick={() => setTags(p => p.filter(x => x !== t))}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer"
                  style={{ background: "#FFF7ED", color: "#E85D04", border: "1px solid #FED7AA" }}>
                  {t}
                  <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-2.5 h-2.5">
                    <path d="M1 1l8 8M9 1L1 9"/>
                  </svg>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-400 transition"
                placeholder="タグを追加" />
              <button onClick={() => addTag(tagInput)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: "#E85D04" }}>追加</button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition">
              キャンセル
            </button>
            <button onClick={() => { if (title.trim()) onSave({ title: title.trim(), memo, tags }); }}
              disabled={!title.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-black text-white hover:opacity-90 transition disabled:opacity-30"
              style={{ background: "#E85D04" }}>
              保存する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NoteCard ──────────────────────────────────────────────────────────────

function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note:     Note;
  onEdit:   (n: Note) => void;
  onDelete: (id: string) => void;
}) {
  const router   = useRouter();
  const [expanded, setExpanded] = useState(false);
  const color = NOTE_TYPE_COLORS[note.type];
  const label = NOTE_TYPE_LABELS[note.type];

  const handleLiteratureSearch = () => {
    const title = note.literature[0]?.title || note.title;
    router.push(`/stage1/literature?q=${encodeURIComponent(title)}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
            style={{ background: color }}>
            {label}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-gray-900 leading-snug line-clamp-2">{note.title}</p>
          </div>
        </div>

        {/* タグ */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {note.tags.map(t => (
              <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#FFF7ED", color: "#E85D04", border: "1px solid #FED7AA" }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* メモ */}
        {note.memo && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">
            {note.memo}
          </p>
        )}

        {/* 展開コンテンツ */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
              {note.content.slice(0, 1000)}{note.content.length > 1000 && "…"}
            </p>
            {note.literature.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400">参考文献</p>
                {note.literature.map((lit, i) => (
                  <div key={i} className="text-xs text-gray-600 leading-snug">
                    {lit.author && <span className="font-semibold">{lit.author} </span>}
                    {lit.title}
                    {lit.year && <span className="text-gray-400"> ({lit.year})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* フッター */}
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[10px] text-gray-400">
            {new Date(note.createdAt).toLocaleDateString("ja-JP")}
          </span>
          <div className="flex items-center gap-1.5">
            {note.type === "literature" && note.literature.length > 0 && (
              <button onClick={handleLiteratureSearch}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition">
                文献検索で調べる
              </button>
            )}
            <button onClick={() => setExpanded(v => !v)}
              className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
              {expanded ? "閉じる" : "展開"}
            </button>
            <button onClick={() => onEdit(note)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-400 hover:text-gray-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onClick={() => onDelete(note.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 transition text-gray-400 hover:text-red-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function NotesDictionary() {
  const [notes,     setNotes]     = useState<Note[]>([]);
  const [tab,       setTab]       = useState<Tab>("all");
  const [query,     setQuery]     = useState("");
  const [sortKey,   setSortKey]   = useState<SortKey>("newest");
  const [editNote,  setEditNote]  = useState<Note | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const reload = useCallback(() => setNotes(loadNotes()), []);

  useEffect(() => { reload(); }, [reload]);

  const handleDelete = (id: string) => {
    if (!confirm("このノートを削除しますか？")) return;
    deleteNote(id);
    reload();
  };

  const handleEdit = (note: Note) => setEditNote(note);

  const handleEditSave = (patch: { title: string; memo: string; tags: string[] }) => {
    if (!editNote) return;
    updateNote(editNote.id, patch);
    setEditNote(null);
    reload();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const { count } = importNotes(ev.target?.result as string);
        setImportMsg(`${count}件のノートをインポートしました`);
        setTimeout(() => setImportMsg(null), 3000);
        reload();
      } catch {
        setImportMsg("インポートに失敗しました");
        setTimeout(() => setImportMsg(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // フィルタリング + 検索
  const filtered = notes
    .filter(n => tab === "all" || n.type === tab)
    .filter(n => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.memo.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortKey === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortKey === "type")   return a.type.localeCompare(b.type);
      if (sortKey === "tag")    return (a.tags[0] ?? "").localeCompare(b.tags[0] ?? "");
      return 0;
    });

  return (
    <div>
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-black text-gray-900">自分の辞書</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{notes.length}件</span>
          <button onClick={exportNotes}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
            style={{ color: "#888" }}>
            エクスポート
          </button>
          <label className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
            style={{ color: "#888" }}>
            インポート
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      {importMsg && (
        <div className="mb-3 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "#F0FDF4", color: "#16a34a", border: "1px solid #BBF7D0" }}>
          {importMsg}
        </div>
      )}

      {/* タブ */}
      <div className="flex border-b border-gray-100 mb-3">
        {TABS.map(t => {
          const count = t.id === "all" ? notes.length : notes.filter(n => n.type === t.id).length;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-bold transition relative ${active ? "" : "text-gray-400 hover:text-gray-600"}`}
              style={{ color: active ? "#E85D04" : undefined }}>
              {active && <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: "#E85D04" }} />}
              {t.label}
              {count > 0 && (
                <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? "#E85D04" : "#E5E7EB", color: active ? "white" : "#9CA3AF" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 検索 + 並び替え */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="タイトル・内容・タグで検索"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400 transition"
            style={{ color: "#1A1A1A" }}
          />
        </div>
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none text-gray-600 bg-white"
        >
          <option value="newest">新しい順</option>
          <option value="type">種類別</option>
          <option value="tag">タグ別</option>
        </select>
      </div>

      {/* ノート一覧 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl px-5 py-8 text-center"
          style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
          <p className="text-sm font-bold text-gray-500 mb-1">
            {notes.length === 0 ? "まだノートがありません" : "該当するノートがありません"}
          </p>
          <p className="text-xs text-gray-400">
            {notes.length === 0
              ? "PT専用GPTの回答・治療プラン・文献を保存するとここに表示されます"
              : "検索条件を変えてみてください"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 編集モーダル */}
      {editNote && (
        <EditModal
          note={editNote}
          onSave={handleEditSave}
          onClose={() => setEditNote(null)}
        />
      )}
    </div>
  );
}
