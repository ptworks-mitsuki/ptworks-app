"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GptIntent, PtGptEvent } from "@/app/api/pt-gpt/route";
import { saveNewNote } from "@/lib/notes";
import { SaveNoteModal, NoteToast } from "@/components/SaveNoteModal";
import { withBadges, EvidenceLevelAccordion } from "@/components/EvidenceBadges";

// ── Addition type ──────────────────────────────────────────────────────────

interface Addition {
  id: string;
  type: "memo" | "ai";
  question: string;    // user's input
  content: string;     // memo text or streaming AI answer
  loading: boolean;
  error: boolean;
}

// ── Pattern: is the input a question? ─────────────────────────────────────

function isQuestion(text: string): boolean {
  return /[？?]|教えて|なぜ|どうして|���しく|どのよう|どう(すれ|なれ|した|して)|わから|違い|比較|理由|原因|説明|確認|意味/.test(text);
}

// ── Section parsing ───────────────────────────────────────���────────────────

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

// ── Input bar ──────────────────────────────────────────────────────────────

function AddInputBar({
  placeholder,
  onSubmit,
  disabled,
}: {
  placeholder?: string;
  onSubmit: (text: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const t = value.trim();
    if (!t || disabled) return;
    onSubmit(t);
    setValue("");
  };

  return (
    <div className="mt-3 flex items-end gap-2">
      <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden transition-colors focus-within:border-orange-300">
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={placeholder ?? "メモを追加・質問する（任意）"}
          rows={1}
          className="w-full px-3 py-2.5 text-sm bg-transparent outline-none resize-none placeholder-gray-300"
          style={{ maxHeight: 80, color: "#333" }}
          disabled={disabled}
        />
      </div>
      <button
        onClick={submit}
        disabled={!value.trim() || disabled}
        className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-40 shrink-0"
        style={{ background: "#E85D04" }}
      >
        追加
      </button>
    </div>
  );
}

// ── Addition item ──────────────────────────────────────────────────────────

function AdditionItem({
  addition,
  onDelete,
}: {
  addition: Addition;
  onDelete: (id: string) => void;
}) {
  if (addition.type === "memo") {
    return (
      <div className="mt-2 rounded-xl px-3 py-3"
        style={{ background: "#FFFDE7", borderLeft: "3px solid #E85D04" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-gray-400 tracking-wide">自分のメモ</span>
          <button
            onClick={() => onDelete(addition.id)}
            className="text-xs text-gray-300 hover:text-gray-500 transition font-bold w-5 h-5 flex items-center justify-center rounded"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{addition.content}</p>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl px-3 py-3"
      style={{ background: "#F0FFF4", borderLeft: "3px solid #1B4332" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-bold text-gray-400 tracking-wide">AIの追加回答</span>
        {addition.loading && (
          <span className="inline-block w-3 h-3 border-2 border-gray-200 border-t-green-600 rounded-full animate-spin" />
        )}
      </div>
      <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{addition.question}</p>
      {addition.loading && !addition.content ? (
        <p className="text-xs text-gray-400">回答を生成中...</p>
      ) : addition.error ? (
        <p className="text-xs text-red-500">エラーが発生しました。</p>
      ) : (
        <>
          <MdBody text={stripSuggestions(addition.content)} />
          {addition.loading && (
            <span className="inline-block w-0.5 h-3.5 bg-green-500 animate-pulse ml-0.5 align-text-bottom" />
          )}
        </>
      )}
    </div>
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
  onBack?: () => void;
}

export function PtGptTopicView({ initialQuery, onBack }: PtGptTopicViewProps) {
  const router = useRouter();

  // Lock query permanently on mount
  const queryRef = useRef(initialQuery);

  // Main answer
  const [mainRaw,     setMainRaw]     = useState("");
  const [mainLoading, setMainLoading] = useState(true);
  const [mainError,   setMainError]   = useState("");
  const [mainIntent,  setMainIntent]  = useState<GptIntent | null>(null);

  // Think buttons
  const [thinkButtons, setThinkButtons] = useState<string[]>([]);
  const [thinkLoading, setThinkLoading] = useState(false);
  const fetchedThink = useRef(false);

  // Additions: keyed by "section-{index}" or "global"
  const [additions,  setAdditions]  = useState<Record<string, Addition[]>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  // Save modal
  const [showSave,   setShowSave]   = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Fetch main answer (once on mount) ─────────────────────────────────

  useEffect(() => {
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
  }, []); // empty — runs once, query locked in ref

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

  // ── Submit addition ────────────────────────────────────────────────────

  const submitAddition = useCallback(async (
    sectionKey: string,
    sectionTitle: string | null,
    text: string,
  ) => {
    if (submitting[sectionKey]) return;

    const id = `add-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const type: Addition["type"] = isQuestion(text) ? "ai" : "memo";

    const newItem: Addition = {
      id, type,
      question: text,
      content:  type === "memo" ? text : "",
      loading:  type === "ai",
      error:    false,
    };

    setAdditions(prev => ({ ...prev, [sectionKey]: [...(prev[sectionKey] ?? []), newItem] }));

    if (type === "memo") return; // nothing more to do

    setSubmitting(prev => ({ ...prev, [sectionKey]: true }));

    const contextQ = sectionTitle
      ? `【${sectionTitle}のセクションについて】${text}`
      : text;

    const history: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user",      content: queryRef.current },
      { role: "assistant", content: stripSuggestions(mainRaw) },
    ];

    try {
      await streamGptResponse({
        query: contextQ,
        history,
        onChunk: chunk => setAdditions(prev => ({
          ...prev,
          [sectionKey]: (prev[sectionKey] ?? []).map(a =>
            a.id === id ? { ...a, content: a.content + chunk } : a
          ),
        })),
        onIntent: _i => {},
        onDone: () => {
          setAdditions(prev => ({
            ...prev,
            [sectionKey]: (prev[sectionKey] ?? []).map(a =>
              a.id === id ? { ...a, loading: false } : a
            ),
          }));
          setSubmitting(prev => ({ ...prev, [sectionKey]: false }));
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        },
        onError: err => {
          setAdditions(prev => ({
            ...prev,
            [sectionKey]: (prev[sectionKey] ?? []).map(a =>
              a.id === id ? { ...a, loading: false, error: true, content: err } : a
            ),
          }));
          setSubmitting(prev => ({ ...prev, [sectionKey]: false }));
        },
      });
    } catch {
      setSubmitting(prev => ({ ...prev, [sectionKey]: false }));
    }
  }, [submitting, mainRaw]);

  // ── Delete addition ────────────────────────────────────────────────────

  const deleteAddition = useCallback((sectionKey: string, id: string) => {
    setAdditions(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] ?? []).filter(a => a.id !== id),
    }));
  }, []);

  // ── Build note content for saving ─────────────────────────────────────

  const displayAnswer = stripSuggestions(mainRaw);
  const sections = displayAnswer ? parseMarkdownSections(displayAnswer) : [];

  const buildContent = () => {
    let out = `# ${queryRef.current}\n\n${displayAnswer}`;

    sections.forEach((sec, i) => {
      const adds = (additions[`section-${i}`] ?? []).filter(a => !a.loading && !a.error);
      if (adds.length === 0) return;
      out += `\n\n### ${sec.title || "補足"} への追記\n`;
      for (const a of adds) {
        out += a.type === "memo"
          ? `\n**[自分のメモ]** ${a.content}`
          : `\n\n**Q: ${a.question}**\n\n${a.content}`;
      }
    });

    const globalAdds = (additions["global"] ?? []).filter(a => !a.loading && !a.error);
    if (globalAdds.length > 0) {
      out += "\n\n---\n\n### 全体への追記\n";
      for (const a of globalAdds) {
        out += a.type === "memo"
          ? `\n**[自分のメモ]** ${a.content}`
          : `\n\n**Q: ${a.question}**\n\n${a.content}`;
      }
    }
    return out;
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center px-4 h-14 gap-3">
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
      </header>

      {/* Scrollable content — pb-20 leaves room for fixed save bar */}
      <div className="flex-1 overflow-y-auto pb-20">
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
            {sections.length > 0 && (
              <div>
                {sections.map((sec, i) => {
                  const sectionKey = `section-${i}`;
                  const secAdds    = additions[sectionKey] ?? [];
                  const isBusy     = submitting[sectionKey] ?? false;

                  return (
                    <div key={i} className="px-4 py-4 border-b border-gray-50 last:border-b-0">
                      {sec.title && (
                        <h2 className="text-sm font-black text-gray-900 mb-2 flex items-center gap-2">
                          <span className="w-1 h-4 rounded-full shrink-0" style={{ background: "#E85D04" }} />
                          {sec.title}
                        </h2>
                      )}

                      <MdBody text={sec.content} />

                      {/* Additions for this section */}
                      {secAdds.map(a => (
                        <AdditionItem key={a.id} addition={a}
                          onDelete={id => deleteAddition(sectionKey, id)} />
                      ))}

                      {/* Per-section input */}
                      {!mainLoading && (
                        <AddInputBar
                          onSubmit={text => void submitAddition(sectionKey, sec.title, text)}
                          disabled={isBusy}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Streaming cursor */}
                {mainLoading && (
                  <div className="px-4 pb-3">
                    <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse align-text-bottom" />
                  </div>
                )}
              </div>
            )}

            {/* Fallback: streaming but no sections parsed yet */}
            {mainLoading && displayAnswer && sections.length === 0 && (
              <div className="px-4 py-4">
                <MdBody text={displayAnswer} />
                <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse align-text-bottom" />
              </div>
            )}

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
                    <button key={i} onClick={() => void submitAddition("global", null, btn)}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition hover:opacity-80 active:scale-95"
                      style={{ borderColor: "#E85D04", color: "#E85D04", background: "#fff" }}>
                      {btn}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Global input section */}
          {!mainLoading && !mainError && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4 mb-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                全体へのメモ・質問を追加する
              </p>

              {(additions["global"] ?? []).map(a => (
                <AdditionItem key={a.id} addition={a}
                  onDelete={id => deleteAddition("global", id)} />
              ))}

              <AddInputBar
                placeholder="全体へのメモを追加・質問する（任意）"
                onSubmit={text => void submitAddition("global", null, text)}
                disabled={submitting["global"] ?? false}
              />
            </div>
          )}

          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* Fixed save button */}
      {!mainLoading && !mainError && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-30"
          style={{ boxShadow: "0 -2px 8px rgba(0,0,0,0.06)" }}>
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setShowSave(true)}
              className="w-full py-3.5 rounded-xl font-black text-white text-sm transition hover:opacity-90 active:scale-95"
              style={{ background: "#E85D04" }}
            >
              このトークを全て保存する
            </button>
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
