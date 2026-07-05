"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GptIntent, PtGptEvent } from "@/app/api/pt-gpt/route";

// ─── Types ────────────────────────────────────────────────────────────────

interface ServiceSuggestion {
  name: string;
  url:  string;
  desc: string;
}

interface Message {
  id:      string;
  role:    "user" | "assistant";
  content: string;
  intent?: GptIntent;
  service?: ServiceSuggestion;
  loading?: boolean;
  error?:   boolean;
}

const STORAGE_KEY = "pt-gpt-history";

const QUICK_TAGS = [
  "変形性膝関節症",
  "人工股関節の禁忌",
  "脳梗塞の評価",
  "算定日数を確認したい",
  "副業の始め方",
];

const INTENT_LABELS: Record<GptIntent, string> = {
  disease: "疾患・医療知識",
  consult: "臨床相談",
  service: "専用サービス",
  career:  "キャリア・副業",
};

const INTENT_COLORS: Record<GptIntent, string> = {
  disease: "#1B4332",
  consult: "#1D4ED8",
  service: "#E85D04",
  career:  "#7C3AED",
};

// ─── Markdown renderer ────────────────────────────────────────────────────

function MdBody({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="text-sm text-gray-800 leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-bold text-gray-900">{children}</strong>
        ),
        em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
        h2: ({ children }) => (
          <h2 className="text-sm font-black text-gray-900 mt-4 mb-1.5 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold text-gray-800 mt-3 mb-1">{children}</h3>
        ),
        hr: () => <hr className="my-3 border-gray-200" />,
        ul: ({ children }) => (
          <ul className="space-y-1 my-2 pl-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="space-y-1 my-2 pl-4 list-decimal">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-sm text-gray-800 leading-relaxed">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
            <span>{children}</span>
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-3 my-2 text-sm text-gray-600 italic">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-xl border border-gray-200">
            <table className="w-full text-sm border-collapse min-w-[360px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead style={{ background: "#1B4332" }}>{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-bold text-white border-r border-white/20 last:border-r-0 whitespace-nowrap">
            {children}
          </th>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className="even:bg-gray-50 odd:bg-white">{children}</tr>,
        td: ({ children }) => (
          <td className="px-3 py-2 text-xs text-gray-700 border-t border-gray-200 border-r border-gray-100 last:border-r-0 leading-relaxed">
            {children}
          </td>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <code className="block bg-gray-50 rounded-lg px-4 py-3 text-xs font-mono text-gray-800 overflow-x-auto my-2">
              {children}
            </code>
          ) : (
            <code className="bg-gray-100 rounded px-1.5 py-0.5 text-xs font-mono text-gray-800">
              {children}
            </code>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-md text-sm text-white leading-relaxed"
        style={{ background: "#E85D04" }}>
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({
  msg, onRetry,
}: {
  msg: Message;
  onRetry: (query: string) => void;
}) {
  const router = useRouter();

  // サービス誘導
  if (msg.intent === "service" && msg.service) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[92%] w-full bg-white rounded-2xl rounded-tl-md border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100"
            style={{ background: "#FFF7ED" }}>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: "#E85D04" }}>
              専用サービスで解決できます
            </span>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm font-black text-gray-900 mb-1">
              「{msg.service.name}」が最適です
            </p>
            <p className="text-xs text-gray-500 mb-4">{msg.service.desc}</p>
            <button
              onClick={() => router.push(msg.service!.url)}
              className="w-full py-3 rounded-xl font-black text-white text-sm transition hover:opacity-90"
              style={{ background: "#E85D04" }}
            >
              {msg.service.name}を開く →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // エラー
  if (msg.error) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[92%] bg-white rounded-2xl rounded-tl-md border border-gray-200 px-4 py-4 text-center">
          <button
            onClick={() => onRetry(msg.content)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: "#E85D04" }}
          >
            もう一度試す
          </button>
        </div>
      </div>
    );
  }

  // ローディング
  if (msg.loading && !msg.content) {
    return (
      <div className="flex justify-start mb-4">
        <div className="bg-white rounded-2xl rounded-tl-md border border-gray-200 shadow-sm px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin shrink-0" />
            <span className="text-xs text-gray-400">
              {msg.intent ? `${INTENT_LABELS[msg.intent]}として回答中...` : "回答を生成中..."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 通常の回答
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[92%] w-full bg-white rounded-2xl rounded-tl-md border border-gray-200 shadow-sm overflow-hidden">
        {/* インテントバッジ */}
        {msg.intent && (
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2"
            style={{ background: `${INTENT_COLORS[msg.intent]}12` }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: INTENT_COLORS[msg.intent] }} />
            <span className="text-[10px] font-bold"
              style={{ color: INTENT_COLORS[msg.intent] }}>
              {INTENT_LABELS[msg.intent]}
            </span>
          </div>
        )}

        <div className="px-4 py-4">
          <MdBody text={msg.content} />
          {msg.loading && (
            <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse ml-0.5 align-text-bottom" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page (inner, uses useSearchParams) ──────────────────────────────

function PtGptInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [retryMsg,  setRetryMsg]  = useState<string | null>(null);

  const abortRef    = useRef<AbortController | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textaRef    = useRef<HTMLTextAreaElement>(null);
  const initialised = useRef(false);

  // localStorage の履歴を復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        // loading/error 状態はリセット
        setMessages(parsed.map(m => ({ ...m, loading: false })));
      }
    } catch { /* ignore */ }
  }, []);

  // ホームの ?q= を引き継ぐ（初回のみ）
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    const q = searchParams.get("q");
    if (q) {
      void handleSend(q);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // メッセージ追加のたびスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 履歴をlocalStorageに保存
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      const toSave = messages.filter(m => !m.loading).slice(-40);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* ignore */ }
  }, [messages]);

  const handleSend = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || sending) return;

    setSending(true);
    setRetryMsg(null);

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: q };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId, role: "assistant", content: "", loading: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");

    // history を構築（直近10ターン、現在のやりとりを除く）
    const historySnap = messages
      .filter(m => !m.loading && !m.error && m.role !== "assistant" || (m.role === "assistant" && m.content))
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      let fetchSignal: AbortSignal = abort.signal;
      try {
        if (typeof AbortSignal.any === "function" && typeof AbortSignal.timeout === "function") {
          fetchSignal = AbortSignal.any([abort.signal, AbortSignal.timeout(90_000)]);
        }
      } catch { /* ignore */ }

      const res = await fetch("/api/pt-gpt", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: q, history: historySnap }),
        signal:  fetchSignal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let ev: PtGptEvent;
          try { ev = JSON.parse(raw) as PtGptEvent; } catch { continue; }

          if (ev.type === "error") {
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, loading: false, error: true, content: q } : m,
            ));
            return;
          }
          if (ev.type === "intent") {
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, intent: ev.intent, service: "service" in ev ? ev.service as ServiceSuggestion : undefined }
                : m,
            ));
          }
          if (ev.type === "chunk") {
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, content: m.content + ev.text } : m,
            ));
          }
          if (ev.type === "done") {
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, loading: false } : m,
            ));
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, loading: false, error: true, content: q } : m,
      ));
    } finally {
      setSending(false);
    }
  }, [sending, messages]);

  const handleRetry = useCallback((query: string) => {
    // エラーメッセージを除去してリトライ
    setMessages(prev => prev.filter(m => !m.error));
    void handleSend(query);
  }, [handleSend]);

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  // textarea 自動高さ調整
  const handleInputChange = (val: string) => {
    setInput(val);
    if (textaRef.current) {
      textaRef.current.style.height = "auto";
      textaRef.current.style.height = `${Math.min(textaRef.current.scrollHeight, 160)}px`;
    }
  };

  const canSend = input.trim().length > 0 && !sending;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50" style={{ color: "#1A1A1A" }}>

      {/* ── ヘッダー ────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div>
              <p className="text-base font-black leading-tight">
                PT<span style={{ color: "#E85D04" }}>専用GPT</span>
              </p>
              <p className="text-[10px] text-gray-400 leading-none">疾患・臨床・キャリアまで何でも</p>
            </div>
          </div>

          {messages.length > 0 && (
            <button onClick={handleClear}
              className="text-xs text-gray-400 hover:text-gray-600 transition px-2 py-1 rounded-lg hover:bg-gray-100">
              履歴をクリア
            </button>
          )}
        </div>
      </header>

      {/* ── メッセージエリア ──────────────────────────────────────────────── */}
      <main className="flex-1 pt-14 pb-40 px-4 max-w-2xl mx-auto w-full">

        {/* 空状態 */}
        {messages.length === 0 && (
          <div className="pt-8 pb-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{ background: "linear-gradient(135deg,#E85D04,#c44b00)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">PT専用GPT</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                疾患・術式・臨床の疑問・キャリアまで<br/>PTに関することなら何でも答えます
              </p>
            </div>

            {/* クイックタグ */}
            <div className="mb-6">
              <p className="text-xs font-bold text-gray-400 mb-3 text-center">よく使う質問</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_TAGS.map(tag => (
                  <button key={tag}
                    onClick={() => void handleSend(tag)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border transition hover:border-orange-400 hover:text-orange-600 active:scale-95"
                    style={{ background: "#F9FAFB", borderColor: "#E5E7EB", color: "#555" }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 機能説明 */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { icon: "📖", label: "疾患・医療知識",  desc: "教科書・ガイドラインベースで回答" },
                { icon: "💬", label: "臨床の相談",      desc: "先輩PTとして具体的にアドバイス" },
                { icon: "🎯", label: "専用サービス誘導", desc: "スライド・文献・指導書など" },
                { icon: "💼", label: "キャリア・副業",  desc: "PTの働き方・収入アップ" },
              ]).map(item => (
                <div key={item.label}
                  className="rounded-2xl p-4 border border-gray-100"
                  style={{ background: "#F9FAFB" }}>
                  <p className="text-lg mb-1">{item.icon}</p>
                  <p className="text-xs font-black text-gray-900 mb-0.5">{item.label}</p>
                  <p className="text-[10px] text-gray-400 leading-snug">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* メッセージ一覧 */}
        <div className="pt-4">
          {messages.map(msg =>
            msg.role === "user"
              ? <UserBubble key={msg.id} content={msg.content} />
              : <AssistantBubble key={msg.id} msg={msg} onRetry={handleRetry} />,
          )}
        </div>
        <div ref={bottomRef} />
      </main>

      {/* ── 入力エリア（固定） ────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40"
        style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3">

          {/* クイックタグ（入力欄の上）*/}
          {messages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {QUICK_TAGS.map(tag => (
                <button key={tag}
                  onClick={() => void handleSend(tag)}
                  disabled={sending}
                  className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition hover:border-orange-400 hover:text-orange-600 disabled:opacity-40"
                  style={{ background: "#F9FAFB", borderColor: "#E5E7EB", color: "#888" }}>
                  {tag}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 focus-within:border-orange-400 focus-within:bg-white transition overflow-hidden"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <textarea
                ref={textaRef}
                value={input}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && canSend) {
                    e.preventDefault();
                    void handleSend(input);
                  }
                }}
                placeholder={"疾患名・術式・症状・臨床の疑問を入力してください"}
                rows={1}
                disabled={sending}
                className="w-full px-4 py-3 text-sm bg-transparent resize-none outline-none placeholder-gray-400 max-h-40"
                style={{ color: "#1A1A1A" }}
              />
            </div>

            {/* 送信ボタン */}
            <button
              onClick={() => canSend && void handleSend(input)}
              disabled={!canSend}
              className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition hover:opacity-90 active:scale-95 disabled:opacity-30"
              style={{ background: "#E85D04" }}
              aria-label="送信">
              {sending ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>

          <p className="text-[10px] text-gray-300 text-center mt-1.5">
            Enter で送信 / Shift+Enter で改行
          </p>
        </div>
      </div>

    </div>
  );
}

// ─── Page wrapper (Suspense for useSearchParams) ──────────────────────────

export default function PtGptPage() {
  return (
    <Suspense>
      <PtGptInner />
    </Suspense>
  );
}
