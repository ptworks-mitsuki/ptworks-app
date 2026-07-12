"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GptIntent, PtGptEvent } from "@/app/api/pt-gpt/route";
import { saveNewNote } from "@/lib/notes";
import { SaveNoteModal, NoteToast } from "@/components/SaveNoteModal";
import { withBadges, EvidenceLevelAccordion } from "@/components/EvidenceBadges";
import { saveRecentTopic, updateRecentTopic, type SavedFollowUp } from "@/lib/recent-topics";

// ── Types ──────────────────────────────────────────────────────────────────

interface FollowUp {
  id: string;
  question: string;
  answer: string;
  loading: boolean;
  error: boolean;
}

// ── Section parsing ────────────────────────────────────────────────────────

interface MarkdownSection {
  title: string;
  content: string;
}

function parseMarkdownSections(text: string): MarkdownSection[] {
  const lines = text.split("\n");
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;
  let preamble = "";

  for (const line of lines) {
    const m = line.match(/^#{1,3}\s+(.+)/);
    if (m) {
      if (current) {
        sections.push({ ...current, content: current.content.trimEnd() });
      } else if (preamble.trim()) {
        sections.push({ title: "", content: preamble.trimEnd() });
        preamble = "";
      }
      current = { title: m[1], content: "" };
    } else if (current) {
      current.content += line + "\n";
    } else {
      preamble += line + "\n";
    }
  }
  if (current) sections.push({ ...current, content: current.content.trimEnd() });
  else if (preamble.trim()) sections.push({ title: "", content: preamble.trimEnd() });

  return sections.filter(s => s.content.trim() || s.title);
}

function stripSuggestions(text: string): string {
  const markerRe = /\n---+\s*\n\s*💡[^\n]*/;
  const idx = markerRe.exec(text)?.index;
  return idx !== undefined ? text.slice(0, idx).trimEnd() : text;
}

// ── SSE streaming ──────────────────────────────────────────────────────────

async function streamGptResponse(opts: {
  query: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  onChunk: (text: string) => void;
  onIntent: (intent: GptIntent) => void;
  onDone: () => void;
  onError: (msg: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const { query, history, onChunk, onIntent, onDone, onError, signal } = opts;
  const res = await fetch("/api/pt-gpt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, history }),
    signal,
  });

  if (!res.ok || !res.body) { onError("通信エラーが発生しました。"); return; }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const ev = JSON.parse(line.slice(6)) as PtGptEvent;
        if (ev.type === "intent") onIntent(ev.intent);
        else if (ev.type === "chunk") onChunk(ev.text);
        else if (ev.type === "done")  onDone();
        else if (ev.type === "error") onError(ev.error);
      } catch { /* ignore */ }
    }
  }
}

// ── Markdown renderer ──────────────────────────────────────────────────────

function MdBody({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="text-sm text-gray-800 leading-relaxed mb-2 last:mb-0">
            {withBadges(children)}
          </p>
        ),
        strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
        em:     ({ children }) => <em className="italic text-gray-700">{children}</em>,
        h2: ({ children }) => <h2 className="text-sm font-black text-gray-900 mt-4 mb-1.5 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold text-gray-800 mt-3 mb-1">{children}</h3>,
        hr: () => <hr className="my-3 border-gray-200" />,
        ul: ({ children }) => <ul className="space-y-1 my-2 pl-0">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-1 my-2 pl-4 list-decimal">{children}</ol>,
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-sm text-gray-800 leading-relaxed">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
            <span>{withBadges(children)}</span>
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-3 my-2 text-sm text-gray-600 italic">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-gray-200 bg-gray-50 px-2 py-1.5 text-left font-bold text-gray-800">{children}</th>,
        td: ({ children }) => <td className="border border-gray-200 px-2 py-1.5 text-gray-700">{children}</td>,
        code: ({ children, className }) => {
          const isBlock = className?.startsWith("language-");
          return isBlock
            ? <pre className="bg-gray-900 text-green-300 text-xs p-3 rounded-xl my-3 overflow-x-auto"><code>{children}</code></pre>
            : <code className="bg-gray-100 text-gray-800 text-xs px-1.5 py-0.5 rounded font-mono">{children}</code>;
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

// ── Intent label ──────────────────────────────────────────────────────────

const INTENT_LABELS: Record<GptIntent, string> = {
  disease: "疾患・医療知識",
  consult: "臨床相談",
  career:  "キャリア",
  service: "PT Worksのサービス",
};

// ── Main component ─────────────────────────────────────────────────────────

interface PtGptTopicViewProps {
  initialQuery: string;
  preloadedAnswer?: string;
  preloadedIntent?: GptIntent;
  preloadedFollowUps?: SavedFollowUp[];
  preloadedId?: string;
  onBack?: () => void;
}

export function PtGptTopicView({
  initialQuery,
  preloadedAnswer,
  preloadedIntent,
  preloadedFollowUps,
  preloadedId,
  onBack,
}: PtGptTopicViewProps) {
  const router = useRouter();

  // Lock all props permanently on mount
  const queryRef     = useRef(initialQuery);
  const preloadedRef = useRef({ answer: preloadedAnswer, intent: preloadedIntent, followUps: preloadedFollowUps });
  // If restoring from cache, we already have a saved ID — skip re-saving
  const savedTopicIdRef = useRef<string | null>(preloadedId ?? null);

  // Main answer
  const [mainRaw,     setMainRaw]     = useState("");
  const [mainLoading, setMainLoading] = useState(true);
  const [mainError,   setMainError]   = useState("");
  const [mainIntent,  setMainIntent]  = useState<GptIntent | null>(null);

  // Think buttons
  const [thinkButtons, setThinkButtons] = useState<string[]>([]);
  const [thinkLoading, setThinkLoading] = useState(false);
  const fetchedThink = useRef(false);

  // Follow-up Q&As（キャッシュから復元する場合は初期値を設定）
  const [followUps, setFollowUps] = useState<FollowUp[]>(() =>
    (preloadedFollowUps ?? []).map(f => ({ ...f, loading: false, error: false }))
  );
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Save modal
  const [showSave,   setShowSave]   = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Fetch main answer (once on mount) ─────────────────────────────────

  useEffect(() => {
    // Preloaded path: restore cached answer immediately, no AI call
    if (preloadedRef.current.answer) {
      setMainRaw(preloadedRef.current.answer);
      if (preloadedRef.current.intent) setMainIntent(preloadedRef.current.intent);
      setMainLoading(false);
      return;
    }

    const ctrl = new AbortController();
    streamGptResponse({
      query:    queryRef.current,
      history:  [],
      onChunk:  text => setMainRaw(prev => prev + text),
      onIntent: intent => setMainIntent(intent),
      onDone:   () => setMainLoading(false),
      onError:  err => { setMainError(err); setMainLoading(false); },
      signal:   ctrl.signal,
    }).catch(e => {
      if ((e as Error).name !== "AbortError") {
        setMainError("エラーが発生しました。");
        setMainLoading(false);
      }
    });
    return () => ctrl.abort();
  }, []);

  // ── 回答完了時にローカルストレージへ保存（新規のみ） ────────────────────

  useEffect(() => {
    if (mainLoading || !mainRaw || mainError) return;
    if (savedTopicIdRef.current) return; // 復元時はスキップ
    const id = `topic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    savedTopicIdRef.current = id;
    saveRecentTopic({
      id,
      title:     queryRef.current.slice(0, 20),
      query:     queryRef.current,
      answer:    mainRaw,
      intent:    mainIntent,
      followUps: [],
      memo:      "",
      savedAt:   new Date().toISOString(),
    });
  }, [mainLoading, mainRaw, mainError, mainIntent]);

  // ── フォローアップ完了時に保存データを更新 ──────────────────────────────

  useEffect(() => {
    if (!savedTopicIdRef.current) return;
    const completed: SavedFollowUp[] = followUps
      .filter(f => !f.loading && !f.error && f.answer)
      .map(({ id, question, answer }) => ({ id, question, answer }));
    if (completed.length === 0) return;
    updateRecentTopic(savedTopicIdRef.current, { followUps: completed });
  }, [followUps]);

  // ── Think buttons after answer completes ──────────────────────────────

  useEffect(() => {
    if (mainLoading || !mainRaw || fetchedThink.current) return;
    fetchedThink.current = true;
    setThinkLoading(true);
    void fetch("/api/gpt-think", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ content: stripSuggestions(mainRaw).slice(0, 1200) }),
    })
      .then(r => r.json() as Promise<{ buttons: string[] }>)
      .then(d  => setThinkButtons(d.buttons ?? []))
      .finally(() => setThinkLoading(false));
  }, [mainLoading, mainRaw]);

  // ── Auto-scroll during streaming ──────────────────────────────────────

  useEffect(() => {
    if (mainLoading) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mainRaw, mainLoading]);

  // ── Submit follow-up ──────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const q = inputValue.trim();
    if (!q || submitting) return;

    const newFu: FollowUp = {
      id: `fu-${Date.now()}`,
      question: q,
      answer: "",
      loading: true,
      error: false,
    };

    setFollowUps(prev => [...prev, newFu]);
    setInputValue("");
    setSubmitting(true);

    const displayAnswer = stripSuggestions(mainRaw);
    const history: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user",      content: queryRef.current },
      { role: "assistant", content: displayAnswer },
      ...followUps.filter(f => !f.loading && !f.error).flatMap(f => ([
        { role: "user"      as const, content: f.question },
        { role: "assistant" as const, content: f.answer },
      ])),
    ];

    try {
      await streamGptResponse({
        query: q,
        history,
        onChunk: chunk => setFollowUps(prev =>
          prev.map(f => f.id === newFu.id ? { ...f, answer: f.answer + chunk } : f)
        ),
        onIntent: _i => {},
        onDone: () => {
          setFollowUps(prev => prev.map(f => f.id === newFu.id ? { ...f, loading: false } : f));
          setSubmitting(false);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        },
        onError: err => {
          setFollowUps(prev => prev.map(f =>
            f.id === newFu.id ? { ...f, loading: false, error: true, answer: err } : f
          ));
          setSubmitting(false);
        },
      });
    } catch {
      setSubmitting(false);
    }
  }, [inputValue, submitting, mainRaw, followUps]);

  // ── Build note content for saving ─────────────────────────────────────

  const displayAnswer = stripSuggestions(mainRaw);
  const sections = displayAnswer ? parseMarkdownSections(displayAnswer) : [];

  const buildContent = () => {
    let out = `# ${queryRef.current}\n\n${displayAnswer}`;
    for (const fu of followUps.filter(f => !f.loading && !f.error)) {
      out += `\n\n---\n\n**Q: ${fu.question}**\n\n${fu.answer}`;
    }
    return out;
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={onBack ?? (() => router.back())}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div style={{ borderLeft: "4px solid #E85D04", paddingLeft: 12 }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: "#111", margin: 0, lineHeight: 1.2 }}>
                PT<span style={{ color: "#E85D04" }}>専用GPT</span>
              </p>
              <p style={{ fontSize: 11, color: "#6B7280", margin: "1px 0 0" }}>疾患・臨床・キャリアまで何でも</p>
            </div>
          </div>

          {/* Header save button */}
          {!mainLoading && !mainError && (
            <button
              onClick={() => setShowSave(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white transition hover:opacity-90 shrink-0"
              style={{ background: "#1B4332" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              保存
            </button>
          )}
        </div>
      </header>

      {/* Scrollable content — pb-24 leaves room for bottom input bar */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-4">

          {/* Question chip */}
          <div className="mb-4">
            <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#E85D04" }}>
                あなたの質問
              </p>
              <p className="text-sm font-semibold text-gray-900 leading-relaxed">{queryRef.current}</p>
            </div>
          </div>

          {/* Main answer card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">

            {mainIntent && mainIntent !== "service" && (
              <div className="px-4 pt-3 pb-2 border-b border-gray-100" style={{ background: "#FAFAFA" }}>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {INTENT_LABELS[mainIntent]}
                </span>
              </div>
            )}

            {/* Loading placeholder */}
            {mainLoading && !displayAnswer && (
              <div className="px-4 py-6 flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin inline-block" />
                <span className="text-sm text-gray-400">回答を生成中...</span>
              </div>
            )}

            {mainError && (
              <div className="px-4 py-4 text-sm text-red-500">{mainError}</div>
            )}

            {/* Sections */}
            {sections.length > 0 ? (
              <div>
                {sections.map((sec, i) => (
                  <div key={i} className="px-4 py-4 border-b border-gray-50 last:border-b-0">
                    {sec.title && (
                      <h2 className="text-sm font-black text-gray-900 mb-2 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full shrink-0" style={{ background: "#E85D04" }} />
                        {sec.title}
                      </h2>
                    )}
                    <MdBody text={sec.content} />
                  </div>
                ))}

                {/* Streaming cursor */}
                {mainLoading && (
                  <div className="px-4 pb-3">
                    <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse align-text-bottom" />
                  </div>
                )}
              </div>
            ) : mainLoading && displayAnswer ? (
              <div className="px-4 py-4">
                <MdBody text={displayAnswer} />
                <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse align-text-bottom" />
              </div>
            ) : null}

            {/* Evidence accordion */}
            {!mainLoading && !mainError && (
              <div className="px-4 pb-4">
                <EvidenceLevelAccordion />
              </div>
            )}
          </div>

          {/* Think buttons */}
          {!mainLoading && !mainError && (
            <div className="mb-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">思考を深める</p>
              {thinkLoading ? (
                <div className="flex items-center gap-2 py-1">
                  <span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-orange-400 rounded-full animate-spin inline-block" />
                  <span className="text-xs text-gray-400">思考質問を生成中...</span>
                </div>
              ) : thinkButtons.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {thinkButtons.map((btn, i) => (
                    <button key={i}
                      onClick={() => { setInputValue(btn); inputRef.current?.focus(); }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition hover:opacity-80 active:scale-95"
                      style={{ borderColor: "#E85D04", color: "#E85D04", background: "#fff" }}>
                      {btn}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Follow-up Q&As */}
          {followUps.map(fu => (
            <div key={fu.id} className="mb-4">
              {/* Question bubble */}
              <div className="flex justify-end mb-2">
                <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed"
                  style={{ background: "#E85D04" }}>
                  {fu.question}
                </div>
              </div>

              {/* Answer card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4">
                {fu.loading && !fu.answer ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin inline-block" />
                    <span className="text-sm text-gray-400">回答を生成中...</span>
                  </div>
                ) : fu.error ? (
                  <p className="text-sm text-red-500">{fu.answer || "エラーが発生しました。"}</p>
                ) : (
                  <>
                    <MdBody text={stripSuggestions(fu.answer)} />
                    {fu.loading && (
                      <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse ml-0.5 align-text-bottom" />
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* Fixed bottom input bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-30"
        style={{ boxShadow: "0 -2px 8px rgba(0,0,0,0.06)" }}>
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <div className="flex-1 rounded-2xl border border-gray-200 overflow-hidden transition-colors focus-within:border-orange-400">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSubmit(); }
              }}
              placeholder="疾患名・術式・症状・臨床の疑問を入力"
              rows={2}
              className="w-full px-4 py-3 text-sm bg-transparent outline-none resize-none placeholder-gray-400"
              style={{ color: "#1A1A1A", maxHeight: 120 }}
              disabled={mainLoading || submitting}
            />
          </div>
          <button
            onClick={() => void handleSubmit()}
            disabled={!inputValue.trim() || mainLoading || submitting}
            className="w-11 h-11 rounded-xl flex items-center justify-center transition hover:opacity-90 active:scale-95 disabled:opacity-40 shrink-0"
            style={{ background: "#E85D04" }}
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Save modal */}
      {showSave && (
        <SaveNoteModal
          type="gpt"
          defaultTitle={queryRef.current.slice(0, 40)}
          content={buildContent()}
          onSave={({ title, memo, tags }) => {
            saveNewNote({
              type:       "gpt",
              title,
              content:    buildContent(),
              memo,
              tags,
              literature: [],
            });
            setSavedToast(true);
            setShowSave(false);
            setTimeout(() => setSavedToast(false), 2500);
          }}
          onCancel={() => setShowSave(false)}
        />
      )}

      <NoteToast visible={savedToast} />
    </div>
  );
}
