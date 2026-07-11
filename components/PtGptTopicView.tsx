"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GptIntent, PtGptEvent } from "@/app/api/pt-gpt/route";
import { saveNewNote } from "@/lib/notes";
import { SaveNoteModal, NoteToast } from "@/components/SaveNoteModal";
import { withBadges, EvidenceLevelAccordion } from "@/components/EvidenceBadges";

// ── Types ──────────────────────────────────────────────────────────────────

interface FollowUp {
  id: string;
  question: string;
  sectionContext: string;
  answer: string;
  loading: boolean;
  error: boolean;
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

  if (!res.ok || !res.body) {
    onError("通信エラーが発生しました。");
    return;
  }

  const reader  = res.body.getReader();
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

// ── Dynamic thinking buttons ───────────────────────────────────────────────

function ThinkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition hover:opacity-80 active:scale-95"
      style={{ borderColor: "#E85D04", color: "#E85D04", background: "#fff" }}
    >
      {label}
    </button>
  );
}

// ── Intent label ───────────────────────────────────────────────────────────

const INTENT_LABELS: Record<GptIntent, string> = {
  disease: "疾患・医療知識",
  consult: "臨床相談",
  career:  "キャリア",
  service: "PT Worksのサービス",
};

// ── Main component ─────────────────────────────────────────────────────────

interface PtGptTopicViewProps {
  initialQuery: string;
  onBack?: () => void;
}

export function PtGptTopicView({ initialQuery, onBack }: PtGptTopicViewProps) {
  const router = useRouter();

  // Lock the query on mount — never changes even if parent re-renders with different props
  const queryRef = useRef(initialQuery);

  // Main answer state
  const [mainRaw,     setMainRaw]     = useState("");        // raw text including suggestions
  const [mainLoading, setMainLoading] = useState(true);
  const [mainError,   setMainError]   = useState("");
  const [mainIntent,  setMainIntent]  = useState<GptIntent | null>(null);

  // Think buttons
  const [thinkButtons,  setThinkButtons]  = useState<string[]>([]);
  const [thinkLoading,  setThinkLoading]  = useState(false);
  const fetchedThink = useRef(false);

  // Follow-ups
  const [followUps,  setFollowUps]  = useState<FollowUp[]>([]);

  // Input
  const [inputValue, setInputValue] = useState("");
  const [sectionCtx, setSectionCtx] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Save modal
  const [showSave,  setShowSave]  = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Fetch main answer on mount ──────────────────────────────────────────

  useEffect(() => {
    const ctrl = new AbortController();
    setMainLoading(true);
    setMainRaw("");
    setMainError("");
    setMainIntent(null);
    fetchedThink.current = false;

    streamGptResponse({
      query: queryRef.current,
      history: [],
      onChunk: text => setMainRaw(prev => prev + text),
      onIntent: intent => setMainIntent(intent),
      onDone: () => setMainLoading(false),
      onError: err => { setMainError(err); setMainLoading(false); },
      signal: ctrl.signal,
    }).catch(e => {
      if ((e as Error).name !== "AbortError") {
        setMainError("エラーが発生しました。");
        setMainLoading(false);
      }
    });

    return () => ctrl.abort();
  }, []); // empty deps — runs once on mount, query is locked in ref

  // ── Fetch think buttons after main answer completes ─────────────────────

  useEffect(() => {
    if (mainLoading || !mainRaw || fetchedThink.current) return;
    fetchedThink.current = true;
    setThinkLoading(true);

    void fetch("/api/gpt-think", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: stripSuggestions(mainRaw).slice(0, 1200) }),
    })
      .then(r => r.json() as Promise<{ buttons: string[] }>)
      .then(data => setThinkButtons(data.buttons ?? []))
      .finally(() => setThinkLoading(false));
  }, [mainLoading, mainRaw]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (mainLoading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [mainRaw, mainLoading]);

  // ── Submit follow-up ────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const q = inputValue.trim();
    if (!q || submitting) return;

    const displayQ = sectionCtx ? q : q;
    const apiQ     = sectionCtx ? `【${sectionCtx}について】${q}` : q;

    const newFu: FollowUp = {
      id: `fu-${Date.now()}`,
      question: displayQ,
      sectionContext: sectionCtx,
      answer: "",
      loading: true,
      error: false,
    };

    setFollowUps(prev => [...prev, newFu]);
    setInputValue("");
    setSectionCtx("");
    setSubmitting(true);

    const history: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user",      content: queryRef.current },
      { role: "assistant", content: stripSuggestions(mainRaw) },
      ...followUps.filter(f => !f.loading && !f.error).flatMap(f => ([
        { role: "user" as const,      content: f.sectionContext ? `【${f.sectionContext}について】${f.question}` : f.question },
        { role: "assistant" as const, content: f.answer },
      ])),
    ];

    try {
      await streamGptResponse({
        query: apiQ,
        history,
        onChunk: text => setFollowUps(prev =>
          prev.map(f => f.id === newFu.id ? { ...f, answer: f.answer + text } : f)
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
  }, [inputValue, sectionCtx, submitting, initialQuery, mainRaw, followUps]);

  // ── Section question button ─────────────────────────────────────────────

  const handleSectionQuestion = (sectionTitle: string) => {
    setSectionCtx(sectionTitle);
    inputRef.current?.focus();
    setTimeout(() => inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  // ── Build note content ──────────────────────────────────────────────────

  const buildContent = () => {
    let out = `# ${queryRef.current}\n\n${stripSuggestions(mainRaw)}`;
    for (const fu of followUps.filter(f => !f.loading && !f.error)) {
      const prefix = fu.sectionContext ? `【${fu.sectionContext}について】` : "";
      out += `\n\n---\n\n**Q: ${prefix}${fu.question}**\n\n${fu.answer}`;
    }
    return out;
  };

  // ── Render ──────────────────────────────────────────────────────────────

  const displayAnswer = stripSuggestions(mainRaw);
  const sections      = displayAnswer ? parseMarkdownSections(displayAnswer) : [];

  return (
    <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={onBack ?? (() => router.back())}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500">
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

          {/* Save button (header) */}
          {!mainLoading && !mainError && (
            <button
              onClick={() => setShowSave(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition hover:opacity-90"
              style={{ background: "#1B4332" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              保存する
            </button>
          )}
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-4">

          {/* Original question chip */}
          <div className="mb-4">
            <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#E85D04" }}>あなたの質問</p>
              <p className="text-sm font-semibold text-gray-900 leading-relaxed">{queryRef.current}</p>
            </div>
          </div>

          {/* Main answer card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">

            {/* Intent label */}
            {mainIntent && mainIntent !== "service" && (
              <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center gap-2"
                style={{ background: "#FAFAFA" }}>
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

            {/* Error */}
            {mainError && (
              <div className="px-4 py-4 text-sm text-red-500">{mainError}</div>
            )}

            {/* Sections */}
            {sections.length > 0 && (
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

                    {/* Section question button */}
                    {!mainLoading && sec.title && (
                      <button
                        onClick={() => handleSectionQuestion(sec.title)}
                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-70"
                        style={{ color: "#E85D04" }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                          <path d="M12 17h.01"/>
                        </svg>
                        このセクションについて質問する
                      </button>
                    )}
                  </div>
                ))}

                {/* Streaming cursor */}
                {mainLoading && (
                  <div className="px-4 pb-3">
                    <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse align-text-bottom" />
                  </div>
                )}
              </div>
            )}

            {/* Fallback: no sections yet but streaming */}
            {mainLoading && displayAnswer && sections.length === 0 && (
              <div className="px-4 py-4">
                <MdBody text={displayAnswer} />
                <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse align-text-bottom" />
              </div>
            )}
          </div>

          {/* Evidence level accordion */}
          {!mainLoading && !mainError && (
            <div className="px-4 pb-4">
              <EvidenceLevelAccordion />
            </div>
          )}

          {/* Think buttons (after main answer) */}
          {!mainLoading && !mainError && (
            <div className="mb-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">思考を深める</p>
              {thinkLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-orange-400 rounded-full animate-spin inline-block" />
                  <span className="text-xs text-gray-400">思考質問を生成中...</span>
                </div>
              ) : thinkButtons.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {thinkButtons.map((btn, i) => (
                    <ThinkButton
                      key={i}
                      label={btn}
                      onClick={() => {
                        setInputValue(btn);
                        setSectionCtx("");
                        inputRef.current?.focus();
                        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Follow-ups */}
          {followUps.map(fu => (
            <div key={fu.id} className="mb-4">
              {/* Question */}
              <div className="flex justify-end mb-2">
                <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed"
                  style={{ background: "#E85D04" }}>
                  {fu.sectionContext && (
                    <p className="text-[10px] text-white/70 font-bold mb-1 uppercase tracking-wide">
                      {fu.sectionContext}について
                    </p>
                  )}
                  <span>{fu.question}</span>
                </div>
              </div>

              {/* Answer */}
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

          {/* Bottom spacer */}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* Bottom input */}
      {!mainError && (
        <div className="shrink-0 bg-white border-t border-gray-100 px-4 pt-3 pb-4"
          style={{ boxShadow: "0 -2px 8px rgba(0,0,0,0.05)" }}>
          <div className="max-w-2xl mx-auto">

            {/* Section context chip */}
            {sectionCtx && (
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "#FFF5F0", color: "#E85D04" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <path d="M12 17h.01"/>
                  </svg>
                  {sectionCtx}について
                </span>
                <button onClick={() => setSectionCtx("")}
                  className="text-xs text-gray-400 hover:text-gray-600 font-bold leading-none">
                  ×
                </button>
              </div>
            )}

            {/* Text input row */}
            <div className="flex items-end gap-2 mb-2.5">
              <div className="flex-1 rounded-2xl border border-gray-200 overflow-hidden transition focus-within:border-orange-400">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSubmit(); }
                  }}
                  placeholder={sectionCtx
                    ? `${sectionCtx}について質問する...`
                    : "さらに気になることを質問する..."}
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

            {/* Save all button */}
            {!mainLoading && (
              <button
                onClick={() => setShowSave(true)}
                className="w-full py-3 rounded-xl text-sm font-black text-white transition hover:opacity-90 active:scale-95"
                style={{ background: "#1B4332" }}
              >
                このトークを全て保存する
              </button>
            )}
          </div>
        </div>
      )}

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
