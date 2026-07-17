"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { loadNotes, type Note } from "@/lib/notes";

const NotesDictionary = dynamic(
  () => import("@/components/NotesDictionary").then(m => m.NotesDictionary),
  { ssr: false }
);

// ── カテゴリ定義 ──────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "orthopedic",
    emoji: "📗",
    label: "整形外科",
    color: "#1B4332",
    bg: "#F0FDF4",
    keywords: ["整形", "骨", "関節", "靭帯", "腱", "変形性", "骨折", "肩", "膝", "腰", "股関節", "足", "手", "頸椎", "腰椎", "側弯", "脊椎", "半月板", "棘上筋", "インナー", "ローテーター"],
  },
  {
    id: "neuro",
    emoji: "📘",
    label: "脳血管疾患",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    keywords: ["脳", "脳梗塞", "脳出血", "くも膜", "片麻痺", "失語", "高次脳", "神経", "パーキンソン", "ALS", "多発性硬化", "脊髄", "末梢神経"],
  },
  {
    id: "cardio",
    emoji: "📙",
    label: "呼吸器・循環器",
    color: "#B45309",
    bg: "#FFFBEB",
    keywords: ["呼吸", "肺", "COPD", "心臓", "心不全", "心筋梗塞", "血圧", "循環", "浮腫", "SpO2", "酸素"],
  },
  {
    id: "pediatric",
    emoji: "📒",
    label: "小児",
    color: "#7C3AED",
    bg: "#F5F3FF",
    keywords: ["小児", "子ども", "子供", "発達", "脳性麻痺", "ダウン症", "自閉", "ADHD", "学童"],
  },
  {
    id: "career",
    emoji: "📔",
    label: "キャリア・副業",
    color: "#0F766E",
    bg: "#F0FDFA",
    keywords: ["キャリア", "副業", "転職", "開業", "給与", "収入", "独立", "起業", "フリーランス"],
  },
];

function detectCategory(note: Note): typeof CATEGORIES[number] | null {
  const text = `${note.title} ${note.content}`.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(kw => text.includes(kw.toLowerCase()))) return cat;
  }
  return null;
}

// ── Stats ─────────────────────────────────────────────────────────────────

function useNoteStats() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    try { setNotes(loadNotes()); } catch { /* ignore */ }
  }, []);

  const total = notes.length;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = notes.filter(n => new Date(n.createdAt).getTime() > oneWeekAgo).length;

  // Streak: count consecutive days with at least one note
  const dateSet = new Set(notes.map(n => n.createdAt.slice(0, 10)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dateSet.has(key)) streak++;
    else break;
  }

  return { notes, total, thisWeek, streak };
}

// ── CategorySection ───────────────────────────────────────────────────────

function CategorySection({ notes }: { notes: Note[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const grouped = CATEGORIES.map(cat => ({
    cat,
    items: notes.filter(n => detectCategory(n)?.id === cat.id),
  })).filter(g => g.items.length > 0);

  const others = notes.filter(n => !detectCategory(n));

  if (notes.length === 0) {
    return (
      <div className="rounded-2xl px-5 py-8 text-center" style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
        <p className="text-sm font-bold text-gray-500 mb-1">まだノートがありません</p>
        <p className="text-xs text-gray-400">PT専用GPTの回答・文献を保存するとここに表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {grouped.map(({ cat, items }) => (
        <div key={cat.id} className="rounded-2xl overflow-hidden border border-gray-100 bg-white"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <button
            onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left transition hover:opacity-80"
            style={{ background: cat.bg }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{cat.emoji}</span>
              <span className="text-sm font-black" style={{ color: cat.color }}>{cat.label}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: cat.color }}>
                {items.length}件
              </span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              className="w-4 h-4 transition-transform" style={{ color: cat.color, transform: expanded === cat.id ? "rotate(90deg)" : "none" }}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          {expanded === cat.id && (
            <div className="divide-y divide-gray-50">
              {items.map(note => (
                <div key={note.id} className="px-4 py-3">
                  <p className="text-xs font-bold text-gray-800 leading-snug truncate">{note.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{note.createdAt.slice(0, 10)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {others.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <button
            onClick={() => setExpanded(expanded === "other" ? null : "other")}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left transition hover:opacity-80"
            style={{ background: "#F9FAFB" }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">📓</span>
              <span className="text-sm font-black text-gray-600">その他</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-400 text-white">{others.length}件</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              className="w-4 h-4 transition-transform" style={{ color: "#9CA3AF", transform: expanded === "other" ? "rotate(90deg)" : "none" }}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          {expanded === "other" && (
            <div className="divide-y divide-gray-50">
              {others.map(note => (
                <div key={note.id} className="px-4 py-3">
                  <p className="text-xs font-bold text-gray-800 leading-snug truncate">{note.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{note.createdAt.slice(0, 10)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

type TabId = "all" | "category";

export default function MyNotePage() {
  const { notes, total, thisWeek, streak } = useNoteStats();
  const [tab, setTab] = useState<TabId>("all");

  return (
    <div className="min-h-screen" style={{ background: "#FFFBF5" }}>
      <div className="max-w-xl mx-auto px-4 pb-16">

        {/* ── ヘッダー ── */}
        <div className="pt-6 pb-5">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-orange-50 transition text-gray-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </Link>
          </div>

          {/* ノートヒーローカード */}
          <div className="rounded-2xl px-5 py-5 mb-4" style={{ background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)", boxShadow: "0 4px 20px rgba(27,67,50,0.25)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5">My Note</p>
                <h1 className="text-white text-2xl font-black">📓 マイノート</h1>
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div>
                <p className="text-white/70 text-[10px] font-bold mb-0.5">あなたの臨床知識</p>
                <p className="text-white font-black text-3xl leading-none">{total}<span className="text-base font-bold ml-1">件</span></p>
              </div>
              <div>
                <p className="text-white/70 text-[10px] font-bold mb-0.5">今週</p>
                <p className="text-white font-black text-xl leading-none">+{thisWeek}<span className="text-sm font-bold ml-0.5">件</span></p>
              </div>
              {streak > 0 && (
                <div className="ml-auto">
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <span className="text-base">🔥</span>
                    <div>
                      <p className="text-white font-black text-sm leading-none">{streak}日</p>
                      <p className="text-white/60 text-[9px] leading-none">連続記録中</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 学習サイクル */}
          <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
            <p className="text-xs font-bold" style={{ color: "#9A3412" }}>学習サイクル</p>
            <div className="flex items-center gap-1.5 text-xs font-black">
              <span style={{ color: "#E85D04" }}>検索</span>
              <span className="text-gray-400">→</span>
              <span style={{ color: "#1B4332" }}>保存</span>
              <span className="text-gray-400">→</span>
              <span style={{ color: "#2563EB" }}>復習</span>
            </div>
          </div>
        </div>

        {/* ── タブ ── */}
        <div className="flex gap-2 mb-4">
          {([
            { id: "all",      label: "すべて" },
            { id: "category", label: "カテゴリ別" },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-xl text-xs font-black transition"
              style={{
                background: tab === t.id ? "#E85D04" : "#fff",
                color:      tab === t.id ? "#fff" : "#6B7280",
                border:     tab === t.id ? "none" : "1px solid #E5E7EB",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── コンテンツ ── */}
        {tab === "all" ? (
          <NotesDictionary />
        ) : (
          <CategorySection notes={notes} />
        )}
      </div>
    </div>
  );
}
