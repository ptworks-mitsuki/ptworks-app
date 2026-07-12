"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PtGptChat } from "@/components/PtGptChat";
import { PtGptTopicView } from "@/components/PtGptTopicView";
import { getRecentTopic } from "@/lib/recent-topics";
import type { GptIntent } from "@/app/api/pt-gpt/route";

// ─── Inner (uses useSearchParams) ─────────────────────────────────────────

function PtGptInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const urlQuery  = searchParams.get("q")       ?? undefined;
  const topicId   = searchParams.get("topic")    ?? undefined;
  const sessionId = searchParams.get("session")  ?? undefined;

  // Load preloaded topic from localStorage (when navigating from 続きから始める)
  const [preloaded] = useState<{ answer: string; intent: GptIntent | null; query: string } | undefined>(() => {
    if (!topicId) return undefined;
    try {
      const t = getRecentTopic(topicId);
      if (t) return { answer: t.answer, intent: t.intent, query: t.query };
    } catch { /* ignore */ }
    return undefined;
  });

  // Lock the query on first render from preloaded, URL param, or sessionStorage.
  // Once set it never clears, so URL changes cannot reset the view.
  const [topicQuery, setTopicQuery] = useState<string | undefined>(() => {
    if (preloaded?.query) return preloaded.query;
    if (urlQuery) return urlQuery;
    try {
      const stored = sessionStorage.getItem("ptgpt_pending_query");
      if (stored) { sessionStorage.removeItem("ptgpt_pending_query"); return stored; }
    } catch { /* ignore */ }
    return undefined;
  });

  // Safety net: catch URL param that arrives after initial render
  useEffect(() => {
    if (urlQuery && !topicQuery) setTopicQuery(urlQuery);
  }, [urlQuery, topicQuery]);

  // Also drain sessionStorage on mount in case useState init was skipped
  useEffect(() => {
    if (topicQuery) return;
    try {
      const stored = sessionStorage.getItem("ptgpt_pending_query");
      if (stored) { sessionStorage.removeItem("ptgpt_pending_query"); setTopicQuery(stored); }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fresh query → topic-document view (locked — never unmounts due to URL change)
  if (topicQuery) {
    return (
      <PtGptTopicView
        initialQuery={topicQuery}
        preloadedAnswer={preloaded?.answer}
        preloadedIntent={preloaded?.intent ?? undefined}
        onBack={() => router.back()}
      />
    );
  }

  // Session / direct open → legacy chat view
  return (
    <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>

      {/* ヘッダー */}
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

      {/* チャット本体 */}
      <div className="flex-1 min-h-0">
        <PtGptChat
          initialQuery={undefined}
          sessionId={sessionId}
          onClear={() => {}}
        />
      </div>

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
