"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PtGptTopicView } from "@/components/PtGptTopicView";
import { UsageIndicator } from "@/components/UsageIndicator";
import { getRecentTopic } from "@/lib/recent-topics";
import type { GptIntent } from "@/app/api/pt-gpt/route";

// ─── 定数 ─────────────────────────────────────────────────────────────────

const QUICK_TAGS = [
  "変形性膝関節症",
  "人工股関節の禁忌",
  "脳梗塞の評価",
  "算定日数を確認したい",
  "副業の始め方",
];

// ─── ランディング（質問前の入力UI） ──────────────────────────────────────

function PtGptLanding({ onSubmit }: { onSubmit: (q: string) => void }) {
  const [input, setInput] = useState("");
  const textaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const handleSend = (q: string) => {
    if (!q.trim()) return;
    onSubmit(q.trim());
  };

  const canSend = input.trim().length > 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-8">
      <div className="max-w-2xl mx-auto pt-8 pb-4">

        {/* アイコン・タイトル */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{ background: "linear-gradient(135deg,#E85D04,#c44b00)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-1">PT専用GPT</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            PT Worksはあなたの考えを育てるAIです。<br />
            答えを出すだけでなく、一緒に考えていきましょう。
          </p>
        </div>

        {/* 検索欄 */}
        <div className="mb-1">
          <div className="flex items-end gap-2">
            <div
              className="flex-1 flex items-end rounded-2xl bg-white overflow-hidden transition"
              style={{ border: "2px solid #E85D04", minHeight: 56 }}
            >
              <textarea
                ref={textaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && canSend) {
                    e.preventDefault();
                    handleSend(input);
                  }
                }}
                placeholder="疾患名・術式・症状・臨床の疑問を入力"
                rows={1}
                className="w-full px-4 py-4 text-sm bg-transparent resize-none outline-none placeholder-gray-400 max-h-40"
                style={{ color: "#1A1A1A" }}
              />
            </div>
            <button
              onClick={() => handleSend(input)}
              disabled={!canSend}
              className="shrink-0 rounded-xl flex items-center justify-center transition hover:opacity-90 active:scale-95 disabled:opacity-30"
              style={{ background: "#E85D04", width: 56, height: 56 }}
              aria-label="送信"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-300 text-center mt-1.5">Enter で送信 / Shift+Enter で改行</p>
          <div className="mt-2 px-3 py-2 rounded-xl border-l-4"
            style={{ background: "#FFF5F0", borderLeftColor: "#E85D04" }}>
            <p className="text-xs text-gray-500 leading-relaxed">
              現在プレビュー版のため、長い回答が途中で止まる場合があります。正式リリース後は全文が表示されるようになります。
            </p>
          </div>
        </div>

        {/* こんな質問ができます */}
        <div className="mb-5 mt-5">
          <p className="text-xs font-bold text-gray-400 mb-2 text-center">こんな質問ができます</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_TAGS.map(tag => (
              <button key={tag} onClick={() => handleSend(tag)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition hover:border-orange-400 hover:text-orange-600 active:scale-95"
                style={{ background: "#F9FAFB", borderColor: "#E5E7EB", color: "#555" }}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* カテゴリカード */}
        <div className="grid grid-cols-2 gap-2">
          {([
            { label: "疾患・医療知識",   desc: "教科書・ガイドラインベースで回答" },
            { label: "臨床の相談",       desc: "先輩PTとして具体的にアドバイス" },
            { label: "専用サービス誘導", desc: "スライド・文献・指導書など" },
            { label: "キャリア・副業",   desc: "PTの働き方・収入アップ" },
          ]).map(item => (
            <div key={item.label} className="rounded-2xl p-3 border border-gray-100" style={{ background: "#F9FAFB" }}>
              <p className="text-xs font-black text-gray-900 mb-0.5">{item.label}</p>
              <p className="text-[10px] text-gray-400 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─── Inner (uses useSearchParams) ─────────────────────────────────────────

function PtGptInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q")     ?? undefined;
  const topicId  = searchParams.get("topic") ?? undefined;

  // Load preloaded topic from localStorage (続きから始める経由)
  const [preloaded] = useState<{
    id: string;
    answer: string;
    intent: GptIntent | null;
    query: string;
    followUps: import("@/lib/recent-topics").SavedFollowUp[];
  } | undefined>(() => {
    if (!topicId) return undefined;
    try {
      const t = getRecentTopic(topicId);
      if (t) return { id: t.id, answer: t.answer, intent: t.intent, query: t.query, followUps: t.followUps ?? [] };
    } catch { /* ignore */ }
    return undefined;
  });

  const [topicQuery, setTopicQuery] = useState<string | undefined>(() => {
    if (preloaded?.query) return preloaded.query;
    if (urlQuery) return urlQuery;
    try {
      const stored = sessionStorage.getItem("ptgpt_pending_query");
      if (stored) { sessionStorage.removeItem("ptgpt_pending_query"); return stored; }
    } catch { /* ignore */ }
    return undefined;
  });

  // Safety nets for async URL params
  useEffect(() => {
    if (urlQuery && !topicQuery) setTopicQuery(urlQuery);
  }, [urlQuery, topicQuery]);

  useEffect(() => {
    if (topicQuery) return;
    try {
      const stored = sessionStorage.getItem("ptgpt_pending_query");
      if (stored) { sessionStorage.removeItem("ptgpt_pending_query"); setTopicQuery(stored); }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // クエリがある → PtGptTopicView（全アクセス経路で統一）
  if (topicQuery) {
    return (
      <PtGptTopicView
        initialQuery={topicQuery}
        preloadedAnswer={preloaded?.answer}
        preloadedIntent={preloaded?.intent ?? undefined}
        preloadedFollowUps={preloaded?.followUps}
        preloadedId={preloaded?.id}
        onBack={() => router.back()}
      />
    );
  }

  // クエリなし → ランディング入力画面（全アクセス経路で統一）
  return (
    <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>

      <header className="shrink-0 bg-white border-b border-gray-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div style={{ borderLeft: "4px solid #E85D04", paddingLeft: 12 }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: "#111", margin: 0, lineHeight: 1.25 }}>
                PT<span style={{ color: "#E85D04" }}>専用GPT</span>
              </p>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0" }}>疾患・臨床・キャリアまで何でも</p>
            </div>
          </div>
        </div>
      </header>

      {/* 利用状況バー（有料プランのみ表示） */}
      <UsageIndicator />

      <PtGptLanding onSubmit={setTopicQuery} />
    </div>
  );
}

export default function PtGptPage() {
  return (
    <Suspense>
      <PtGptInner />
    </Suspense>
  );
}
