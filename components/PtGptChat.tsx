"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GptIntent, PtGptEvent } from "@/app/api/pt-gpt/route";
import type { LiteratureDetailResponse } from "@/app/api/literature-detail/route";
import { saveNewNote } from "@/lib/notes";
import { SaveNoteModal, NoteToast, SaveIconButton } from "@/components/SaveNoteModal";

// ─── Types ────────────────────────────────────────────────────────────────

interface ServiceSuggestion { name: string; url: string; desc: string; }

export interface Message {
  id:      string;
  role:    "user" | "assistant";
  content: string;
  intent?: GptIntent;
  service?: ServiceSuggestion;
  loading?: boolean;
  error?:   boolean;
}

export const GPT_STORAGE_KEY   = "pt-gpt-history";
export const GPT_SESSIONS_KEY  = "pt-gpt-sessions";
export const GPT_SESSIONS_MAX  = 20;

export interface GptSession {
  id:        string;
  title:     string;
  messages:  Message[];
  createdAt: string;
  updatedAt: string;
}

function loadSessions(): GptSession[] {
  try {
    const raw = localStorage.getItem(GPT_SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as GptSession[]) : [];
  } catch { return []; }
}

function saveSessions(sessions: GptSession[]): void {
  try {
    localStorage.setItem(GPT_SESSIONS_KEY, JSON.stringify(sessions.slice(0, GPT_SESSIONS_MAX)));
  } catch { /* ignore */ }
}

function upsertSession(session: GptSession): void {
  const all     = loadSessions();
  const idx     = all.findIndex(s => s.id === session.id);
  if (idx >= 0) { all[idx] = session; saveSessions(all); }
  else          { saveSessions([session, ...all]); }
}

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

// ─── Evidence level meta ──────────────────────────────────────────────────

const EVIDENCE_META: Record<string, { label: string; bg: string; text: string }> = {
  A: { label: "Lv.A  強い根拠",   bg: "#1B4332", text: "#fff" },
  B: { label: "Lv.B  根拠あり",   bg: "#1D4ED8", text: "#fff" },
  C: { label: "Lv.C  専門家意見", bg: "#6B7280", text: "#fff" },
  D: { label: "Lv.D  経験則",     bg: "#D1D5DB", text: "#374151" },
};

// ─── Split at 関連機能 suggestions section ────────────────────────────────

interface Suggestion { label: string; url: string; }

function parseSuggestionLine(line: string, userQuery: string): Suggestion | null {
  // 先頭の記号・括弧を除去
  const trimmed = line
    .replace(/^[\s　・\-\*\[\]（()\d.]+/, "")
    .replace(/[\]\s　）)]+$/, "")
    .trim();
  const sep = trimmed.indexOf(":::");
  if (sep === -1) return null;
  const label  = trimmed.slice(0, sep).trim();
  const rawUrl = trimmed.slice(sep + 3).trim();
  if (!label || !rawUrl.startsWith("/")) return null;
  const url = rawUrl.replace(/QUERY/g, encodeURIComponent(userQuery));
  return { label, url };
}

function splitAtSuggestions(text: string, userQuery: string): { body: string; suggestions: Suggestion[] } {
  const suggestions: Suggestion[] = [];

  // ① セクションマーカーを探す（パターンを広めに）
  const markerRe = /\n(?:---+|━{3,})\n?(?:💡\s*)?(?:PT\s*Works[^\n]*)?\n?/;
  const markerMatch = markerRe.exec(text);

  let body      = text;
  let afterPart = "";

  if (markerMatch) {
    body      = text.slice(0, markerMatch.index).trimEnd();
    afterPart = text.slice(markerMatch.index + markerMatch[0].length);

    // マーカー以降から提案を抽出
    for (const line of afterPart.split("\n")) {
      const s = parseSuggestionLine(line, userQuery);
      if (s) { suggestions.push(s); if (suggestions.length >= 3) break; }
    }
  }

  // ② body 中に残った `:::URL` 行をスキャンして除去・提案に追加
  const cleanLines: string[] = [];
  for (const line of body.split("\n")) {
    if (line.includes(":::")) {
      if (suggestions.length < 3) {
        const s = parseSuggestionLine(line, userQuery);
        if (s) { suggestions.push(s); continue; } // body から除去
      } else {
        continue; // body から除去（提案上限）
      }
    }
    cleanLines.push(line);
  }
  body = cleanLines.join("\n").trimEnd();

  return { body, suggestions };
}

// ─── SuggestionsBlock ─────────────────────────────────────────────────────

function SuggestionsBlock({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter();
  if (suggestions.length === 0) return null;
  return (
    <div style={{ borderTop: "1px solid #F3F4F6" }}>
      {/* セパレーターライン */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <div className="flex-1 h-px" style={{ background: "#E5E7EB" }} />
        <p className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: "#9CA3AF" }}>
          関連機能でさらに活用する
        </p>
        <div className="flex-1 h-px" style={{ background: "#E5E7EB" }} />
      </div>

      <div className="px-4 pb-4 flex flex-col gap-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => router.push(s.url)}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-bold text-left transition hover:opacity-90 active:scale-95"
            style={{ background: "#FFF5F0", color: "#E85D04", border: "1.5px solid #FECAA0" }}
          >
            <span>{s.label}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4 shrink-0 ml-2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Split markdown at 参考資料 section ──────────────────────────────────

function splitAtReferences(text: string): { before: string; refs: string[] } {
  // "## 参考資料" などのセクション見出しを探す
  const re = /\n#{1,3}\s*参考(?:資料|文献)[^\n]*\n/;
  const match = re.exec(text);
  if (!match) return { before: text, refs: [] };

  const before    = text.slice(0, match.index);
  const afterHead = text.slice(match.index + match[0].length);
  const refs: string[] = [];

  for (const line of afterHead.split("\n")) {
    // 次の見出しで停止
    if (/^#{1,3}\s/.test(line)) break;
    const clean = line.replace(/^[\s\-\*\d\.）)\]・]+/, "").trim();
    if (clean.length < 5) continue;
    refs.push(clean);
    if (refs.length >= 10) break;
  }

  return { before, refs };
}

// ─── LiteratureDetailCard ─────────────────────────────────────────────────

function LiteratureDetailCard({ citation }: { citation: string }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail,  setDetail]  = useState<LiteratureDetailResponse | null>(null);
  const [error,   setError]   = useState("");
  const [saved,   setSaved]   = useState(false);
  const [toast,   setToast]   = useState(false);

  const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(citation.slice(0, 80))}`;

  const handleToggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (detail || loading) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/literature-detail", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ citation }),
      });
      const data = await res.json() as LiteratureDetailResponse & { error?: string };
      if (data.error) throw new Error(data.error);
      setDetail(data);
    } catch (e) {
      setError((e instanceof Error ? e.message : null) ?? "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (saved || !detail) return;
    const content = [
      `文献：${citation}`,
      "",
      `エビデンスレベル：${detail.evidenceLevel}（${detail.evidenceLevelReason}）`,
      "",
      "AI日本語要約：",
      detail.summaryJa,
      "",
      "臨床ポイント：",
      ...detail.clinicalPoints.map(p => `・${p}`),
      "",
      `PubMed: ${pubmedUrl}`,
    ].join("\n");

    saveNewNote({
      type:    "literature",
      title:   citation.slice(0, 60),
      content,
      memo:    "",
      tags:    ["文献", `Lv.${detail.evidenceLevel}`],
      literature: [{ title: citation, author: "", year: "" }],
    });
    setSaved(true);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const evMeta = detail ? (EVIDENCE_META[detail.evidenceLevel] ?? EVIDENCE_META.C) : null;

  return (
    <div className="mt-1.5 rounded-xl border border-gray-200 overflow-hidden bg-white">
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-xs font-bold shadow-lg"
          style={{ background: "#1B4332" }}>
          ノートに保存しました
        </div>
      )}

      {/* 文献テキスト + トグルボタン */}
      <div className="px-3 py-2.5 flex items-start justify-between gap-2 bg-gray-50">
        <p className="text-xs text-gray-600 leading-relaxed flex-1">{citation}</p>
        <button
          onClick={handleToggle}
          className="shrink-0 flex items-center gap-1 text-xs font-bold transition whitespace-nowrap"
          style={{ color: "#E85D04" }}
        >
          {open ? "閉じる ▲" : "詳しく見る ▼"}
        </button>
      </div>

      {/* 展開部分 */}
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 py-3">
              <span className="w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin shrink-0" />
              <span className="text-xs text-gray-400">文献情報を読み込み中...</span>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 py-2">{error}</p>
          )}

          {detail && (
            <>
              {/* エビデンスレベル */}
              <div className="flex items-start gap-2 pt-1">
                <span className="text-xs font-black px-2 py-1 rounded-lg shrink-0"
                  style={{ background: evMeta!.bg, color: evMeta!.text }}>
                  {evMeta!.label}
                </span>
                <p className="text-xs text-gray-500 leading-snug pt-0.5">{detail.evidenceLevelReason}</p>
              </div>

              {/* AI日本語要約 */}
              <div className="rounded-xl px-3 py-3" style={{ background: "#F9FAFB" }}>
                <p className="text-xs font-bold text-gray-500 mb-1.5">AI日本語要約</p>
                <p className="text-xs text-gray-700 leading-relaxed">{detail.summaryJa}</p>
              </div>

              {/* 臨床ポイント */}
              <div className="border-l-4 pl-3 py-1" style={{ borderLeftColor: "#E85D04" }}>
                <p className="text-xs font-bold mb-1.5" style={{ color: "#E85D04" }}>臨床ポイント</p>
                <ul className="space-y-1">
                  {detail.clinicalPoints.map((pt, i) => (
                    <li key={i} className="text-xs text-gray-700 leading-relaxed">・{pt}</li>
                  ))}
                </ul>
              </div>

              {/* アクション */}
              <div className="flex items-center gap-2 pt-1">
                <a href={pubmedUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold transition hover:opacity-70"
                  style={{ color: "#E85D04" }}>
                  PubMedで確認
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition"
                  style={{
                    borderColor: saved ? "#E85D04" : "#E5E7EB",
                    color:       saved ? "#E85D04" : "#6B7280",
                    background:  saved ? "#FFF7ED" : "#fff",
                  }}>
                  {saved ? "保存済み" : "ノートに保存"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Markdown ─────────────────────────────────────────────────────────────

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/\*\*\s*[Ee]mpty\s*\*\*/g, "")
    .replace(/^\s*\*\*\s*$/gm, "");
}

// Evidence level badge inline rendering ④
const LV_COLORS: Record<string, { bg: string; color: string }> = {
  A: { bg: "#1B4332", color: "#fff" },
  B: { bg: "#1D4ED8", color: "#fff" },
  C: { bg: "#E85D04", color: "#fff" },
  D: { bg: "#9CA3AF", color: "#fff" },
};

function injectBadges(text: string): React.ReactNode[] {
  const parts   = text.split(/(\[Lv\.[ABCD]\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[Lv\.([ABCD])\]$/);
    if (m) {
      const c = LV_COLORS[m[1]] ?? { bg: "#9CA3AF", color: "#fff" };
      return (
        <span key={i} className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded align-middle ml-1"
          style={{ background: c.bg, color: c.color }}>
          Lv.{m[1]}
        </span>
      );
    }
    return part;
  });
}

function pWithBadges(children: React.ReactNode): React.ReactNode {
  const flat = Array.isArray(children) ? (children as React.ReactNode[]) : [children];
  const hasBadge = flat.some(c => typeof c === "string" && /\[Lv\.[ABCD]\]/.test(c));
  if (!hasBadge) return children;
  const result: React.ReactNode[] = [];
  flat.forEach((c, i) => {
    if (typeof c === "string") {
      injectBadges(c).forEach(node => result.push(node));
    } else {
      result.push(<span key={`n${i}`}>{c}</span>);
    }
  });
  return <>{result}</>;
}

function MdBody({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="text-sm text-gray-800 leading-relaxed mb-2 last:mb-0">
            {pWithBadges(children)}
          </p>
        ),
        strong:     ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
        em:         ({ children }) => <em className="italic text-gray-700">{children}</em>,
        h2:         ({ children }) => <h2 className="text-sm font-black text-gray-900 mt-4 mb-1.5 first:mt-0">{children}</h2>,
        h3:         ({ children }) => <h3 className="text-sm font-bold text-gray-800 mt-3 mb-1">{children}</h3>,
        hr:         () => <hr className="my-3 border-gray-200" />,
        ul:         ({ children }) => <ul className="space-y-1 my-2 pl-0">{children}</ul>,
        ol:         ({ children }) => <ol className="space-y-1 my-2 pl-4 list-decimal">{children}</ol>,
        li:         ({ children }) => (
          <li className="flex items-start gap-2 text-sm text-gray-800 leading-relaxed">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
            <span>{children}</span>
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-3 my-2 text-sm text-gray-600 italic">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-xl border border-gray-200">
            <table className="w-full text-sm border-collapse min-w-[360px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead style={{ background: "#1B4332" }}>{children}</thead>,
        th:    ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-bold text-white border-r border-white/20 last:border-r-0 whitespace-nowrap">{children}</th>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr:    ({ children }) => <tr className="even:bg-gray-50 odd:bg-white">{children}</tr>,
        td:    ({ children }) => (
          <td className="px-3 py-2 text-xs text-gray-700 border-t border-gray-200 border-r border-gray-100 last:border-r-0 leading-relaxed">{children}</td>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock
            ? <code className="block bg-gray-50 rounded-lg px-4 py-3 text-xs font-mono text-gray-800 overflow-x-auto my-2">{children}</code>
            : <code className="bg-gray-100 rounded px-1.5 py-0.5 text-xs font-mono text-gray-800">{children}</code>;
        },
      }}
    >
      {cleanMarkdown(text)}
    </ReactMarkdown>
  );
}

// ─── Thinking buttons ②  ─────────────────────────────────────────────────

function ThinkingButtons({ userQuery, onAsk }: { userQuery: string; onAsk: (q: string) => void }) {
  const router = useRouter();
  const BUTTONS = [
    { label: "この治療を選ぶ根拠は？",    q: `「${userQuery}」について、このアプローチを選ぶ臨床的根拠と理由をさらに深掘りして教えてください。` },
    { label: "デメリット・リスクは？",    q: `「${userQuery}」の治療アプローチに関して、デメリット・リスク・反対意見を詳しく教えてください。` },
    { label: "別のアプローチは？",        q: `「${userQuery}」について、先ほど紹介されたアプローチ以外の代替アプローチを追加で提示してください。` },
  ];
  return (
    <div className="border-t border-gray-100 px-4 pb-4 pt-3">
      <p className="text-[10px] font-bold text-gray-400 mb-2">思考を深める（任意）</p>
      <div className="flex flex-wrap gap-2">
        {BUTTONS.map(b => (
          <button key={b.label} onClick={() => onAsk(b.q)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition hover:opacity-80 active:scale-95"
            style={{ background: "#FFF5F0", color: "#E85D04", borderColor: "#FECAA0" }}>
            {b.label}
          </button>
        ))}
        <button onClick={() => router.push(`/stage1/literature?q=${encodeURIComponent(userQuery)}`)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition hover:opacity-80 active:scale-95"
          style={{ background: "#FFF5F0", color: "#E85D04", borderColor: "#FECAA0" }}>
          文献で根拠を確認
        </button>
      </div>
    </div>
  );
}

// ─── Bubbles ──────────────────────────────────────────────────────────────

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
  msg, onRetry, userQuery, onSaved, isLatest,
}: {
  msg: Message;
  onRetry: (q: string) => void;
  userQuery?: string;
  onSaved: () => void;
  isLatest?: boolean;
}) {
  const router  = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [saved,     setSaved]     = useState(false);

  if (msg.intent === "service" && msg.service) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[92%] w-full bg-white rounded-2xl rounded-tl-md border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100" style={{ background: "#FFF7ED" }}>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#E85D04" }}>
              専用サービスで解決できます
            </span>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm font-black text-gray-900 mb-1">「{msg.service.name}」が最適です</p>
            <p className="text-xs text-gray-500 mb-4">{msg.service.desc}</p>
            <button onClick={() => router.push(msg.service!.url)}
              className="w-full py-3 rounded-xl font-black text-white text-sm transition hover:opacity-90"
              style={{ background: "#E85D04" }}>
              {msg.service.name}を開く →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (msg.error) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[92%] bg-white rounded-2xl rounded-tl-md border border-gray-200 px-4 py-4 text-center">
          <button onClick={() => onRetry(msg.content)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: "#E85D04" }}>
            もう一度試す
          </button>
        </div>
      </div>
    );
  }

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

  const defaultTitle = (userQuery ?? msg.content).slice(0, 20);
  const query = userQuery ?? "";
  // ストリーミング中は参考資料・関連機能を分割しない
  const { body: bodyWithRefs, suggestions } = !msg.loading
    ? splitAtSuggestions(msg.content, query)
    : { body: msg.content, suggestions: [] };
  const { before, refs } = !msg.loading
    ? splitAtReferences(bodyWithRefs)
    : { before: bodyWithRefs, refs: [] };

  return (
    <>
      {showModal && (
        <SaveNoteModal
          type="gpt"
          defaultTitle={defaultTitle}
          content={msg.content}
          onSave={({ title, memo, tags }) => {
            saveNewNote({ type: "gpt", title, content: msg.content, memo, tags, literature: [] });
            setSaved(true);
            setShowModal(false);
            onSaved();
          }}
          onCancel={() => setShowModal(false)}
        />
      )}

      <div className="flex justify-start mb-4">
        <div className="max-w-[92%] w-full bg-white rounded-2xl rounded-tl-md border border-gray-200 shadow-sm overflow-hidden">
          {msg.intent && (
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between"
              style={{ background: `${INTENT_COLORS[msg.intent]}12` }}>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: INTENT_COLORS[msg.intent] }} />
                <span className="text-[10px] font-bold" style={{ color: INTENT_COLORS[msg.intent] }}>
                  {INTENT_LABELS[msg.intent]}
                </span>
              </div>
              {!msg.loading && <SaveIconButton saved={saved} onClick={() => setShowModal(true)} />}
            </div>
          )}

          {/* 本文（参考資料セクション前まで） */}
          <div className="px-4 py-4">
            <MdBody text={before} />
            {msg.loading && <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse ml-0.5 align-text-bottom" />}
            {!msg.loading && !msg.intent && (
              <div className="flex justify-end mt-3">
                <SaveIconButton saved={saved} onClick={() => setShowModal(true)} />
              </div>
            )}
          </div>

          {/* 参考資料セクション（文献カード） */}
          {refs.length > 0 && (
            <div className="border-t border-gray-100 px-4 pb-4 pt-3">
              <p className="text-sm font-black text-gray-900 mb-2">参考資料</p>
              <div className="space-y-2">
                {refs.map((ref, i) => (
                  <LiteratureDetailCard key={i} citation={ref} />
                ))}
              </div>
            </div>
          )}

          {/* 関連機能への誘導 */}
          {!msg.loading && suggestions.length > 0 && (
            <SuggestionsBlock suggestions={suggestions} />
          )}

          {/* 思考を深めるボタン ② */}
          {isLatest && !msg.loading && !msg.error && msg.intent && msg.intent !== "service" && userQuery && (
            <ThinkingButtons userQuery={userQuery} onAsk={onRetry} />
          )}
        </div>
      </div>
    </>
  );
}

// ─── PtGptChat ────────────────────────────────────────────────────────────

interface PtGptChatProps {
  initialQuery?: string;
  sessionId?:    string;   // load saved session without re-querying AI
  onClear?:      () => void;
}

export function PtGptChat({ initialQuery, sessionId, onClear }: PtGptChatProps) {
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [retryMsg,    setRetryMsg]    = useState<string | null>(null);
  const [savedToast,  setSavedToast]  = useState(false);

  const abortRef         = useRef<AbortController | null>(null);
  const scrollAreaRef    = useRef<HTMLDivElement>(null);
  const latestAnsRef     = useRef<HTMLDivElement>(null);
  const textaRef         = useRef<HTMLTextAreaElement>(null);
  const initialised      = useRef(false);
  const currentSessionId = useRef<string | null>(null);
  const sessionCreatedAt = useRef<string | null>(null);
  const [showTopBtn, setShowTopBtn] = useState(false);

  // セッション復元 or 通常の localStorage 復元
  useEffect(() => {
    if (sessionId) {
      // 指定されたセッションを読み込む（AI再生成なし）
      const session = loadSessions().find(s => s.id === sessionId);
      if (session) {
        setMessages(session.messages.map(m => ({ ...m, loading: false })));
        currentSessionId.current = session.id;
        sessionCreatedAt.current = session.createdAt;
      }
      return;
    }
    // 通常起動：前回の会話を復元
    try {
      const saved = localStorage.getItem(GPT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        setMessages(parsed.map(m => ({ ...m, loading: false })));
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // initialQuery を自動送信（1回のみ）
  useEffect(() => {
    if (initialised.current || !initialQuery || sessionId) return;
    initialised.current = true;
    void handleSend(initialQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // 手動スクロール検出
  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    setShowTopBtn(el.scrollTop > 80);
  }, []);

  // メッセージ変化時：現在セッション保存 + sessions リスト更新
  useEffect(() => {
    if (messages.length === 0) return;
    const completed = messages.filter(m => !m.loading);
    if (completed.length === 0) return;

    // GPT_STORAGE_KEY（現在の会話バックアップ）
    try {
      localStorage.setItem(GPT_STORAGE_KEY, JSON.stringify(completed.slice(-40)));
    } catch { /* ignore */ }

    // sessions リストへの upsert
    if (!currentSessionId.current) return;
    const firstUser = completed.find(m => m.role === "user");
    if (!firstUser) return;
    const session: GptSession = {
      id:        currentSessionId.current,
      title:     firstUser.content.slice(0, 20) + (firstUser.content.length > 20 ? "…" : ""),
      messages:  completed,
      createdAt: sessionCreatedAt.current ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertSession(session);
  }, [messages]);

  const handleSend = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || sending) return;

    // 初回メッセージ送信時にセッションIDを生成
    if (!currentSessionId.current) {
      const newId = `gpt-${Date.now()}`;
      currentSessionId.current = newId;
      sessionCreatedAt.current = new Date().toISOString();
    }

    setSending(true);
    setRetryMsg(null);
    setShowTopBtn(false);

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: q };
    const assistantId      = `a-${Date.now()}`;
    const placeholder: Message = { id: assistantId, role: "assistant", content: "", loading: true };

    setMessages(prev => [...prev, userMsg, placeholder]);
    setInput("");
    if (textaRef.current) { textaRef.current.style.height = "auto"; }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let signal: AbortSignal = ctrl.signal;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyFn = (AbortSignal as any).any as ((s: AbortSignal[]) => AbortSignal) | undefined;
      if (typeof anyFn === "function") {
        signal = anyFn([ctrl.signal, AbortSignal.timeout(60_000)]);
      }
    } catch { /* ignore */ }
    abortRef.current = ctrl;

    try {
      const history = messages
        .filter(m => !m.loading && !m.error && m.role !== "assistant" || (m.role === "assistant" && m.content))
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/pt-gpt", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: q, history }),
        signal,
      });

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";

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
            if (ev.type === "intent") {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, intent: ev.intent, service: ev.service } : m,
              ));
            } else if (ev.type === "chunk") {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + ev.text } : m,
              ));
            } else if (ev.type === "done") {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, loading: false } : m,
              ));
              setShowTopBtn(true);
            } else if (ev.type === "error") {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, loading: false, error: true, content: q } : m,
              ));
            }
          } catch { /* ignore parse error */ }
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
    setMessages(prev => prev.filter(m => !m.error));
    void handleSend(query);
  }, [handleSend]);

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    currentSessionId.current = null;
    sessionCreatedAt.current = null;
    try { localStorage.removeItem(GPT_STORAGE_KEY); } catch { /* ignore */ }
    onClear?.();
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    if (textaRef.current) {
      textaRef.current.style.height = "auto";
      textaRef.current.style.height = `${Math.min(textaRef.current.scrollHeight, 160)}px`;
    }
  };

  const canSend = input.trim().length > 0 && !sending;

  const hasMessages = messages.length > 0;

  // 検索欄（空状態・下部共通）
  const inputField = (
    <div className="flex items-end gap-2">
      <div
        className="flex-1 flex items-end rounded-2xl bg-white overflow-hidden transition"
        style={{
          border: "2px solid #E85D04",
          boxShadow: "0 0 0 0px rgba(232,93,4,0)",
          minHeight: 56,
        }}
        onFocus={() => {}}
        onBlur={() => {}}
      >
        <style>{`
          .ptgpt-focus-wrap:focus-within {
            box-shadow: 0 0 0 3px rgba(232,93,4,0.18) !important;
          }
        `}</style>
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
          placeholder="疾患名・術式・症状・臨床の疑問を入力"
          rows={1}
          disabled={sending}
          className="w-full px-4 py-4 text-sm bg-transparent resize-none outline-none placeholder-gray-400 max-h-40"
          style={{ color: "#1A1A1A" }}
        />
      </div>
      <button
        onClick={() => canSend && void handleSend(input)} disabled={!canSend}
        className="shrink-0 rounded-xl flex items-center justify-center transition hover:opacity-90 active:scale-95 disabled:opacity-30"
        style={{ background: "#E85D04", width: 56, height: 56 }}
        aria-label="送信"
      >
        {sending ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        )}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* 履歴クリアボタン（メッセージがある場合） */}
      {hasMessages && (
        <div className="shrink-0 flex justify-end px-4 py-1.5 bg-white border-b border-gray-100">
          <button onClick={handleClear}
            className="text-xs text-gray-400 hover:text-gray-600 transition px-2 py-1 rounded-lg hover:bg-gray-100">
            履歴をクリア
          </button>
        </div>
      )}

      {/* メッセージエリア */}
      <div ref={scrollAreaRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pb-4 max-w-2xl mx-auto w-full">

        {/* 空状態 */}
        {!hasMessages && (
          <div className="pt-8 pb-4">
            {/* 1. アイコン・タイトル */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
                style={{ background: "linear-gradient(135deg,#E85D04,#c44b00)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              {/* 2. タイトル・サブタイトル */}
              <h1 className="text-xl font-black text-gray-900 mb-1">PT専用GPT</h1>
              <p className="text-xs text-gray-500 leading-relaxed">
                PT Worksはあなたの考えを育てるAIです。
                <br />答えを出すだけでなく、一緒に考えていきましょう。
              </p>
            </div>

            {/* 3. 検索欄 */}
            <div className="mb-1">
              {inputField}
              <p className="text-[10px] text-gray-300 text-center mt-1.5">Enter で送信 / Shift+Enter で改行</p>
              {/* 注意書き */}
              <div className="mt-2 px-3 py-2 rounded-xl border-l-4"
                style={{ background: "#FFF5F0", borderLeftColor: "#E85D04" }}>
                <p className="text-xs text-gray-500 leading-relaxed">
                  現在プレビュー版のため、長い回答が途中で止まる場合があります。正式リリース後は全文が表示されるようになります。
                </p>
              </div>
            </div>

            {/* 4. よく使う質問タグ */}
            <div className="mb-5 mt-5">
              <p className="text-xs font-bold text-gray-400 mb-2 text-center">よく使う質問</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_TAGS.map(tag => (
                  <button key={tag} onClick={() => void handleSend(tag)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition hover:border-orange-400 hover:text-orange-600 active:scale-95"
                    style={{ background: "#F9FAFB", borderColor: "#E5E7EB", color: "#555" }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. カテゴリカード */}
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
        )}

        {/* 6. メッセージ一覧（過去の会話履歴） */}
        <div className="pt-4">
          {messages.map((msg, i) => {
            const isLatestAssistant = msg.role === "assistant" && i === messages.length - 1;
            if (msg.role === "user") return <UserBubble key={msg.id} content={msg.content} />;
            const prevUser = messages.slice(0, i).reverse().find(m => m.role === "user");
            return (
              <div key={msg.id} ref={isLatestAssistant ? latestAnsRef : undefined}>
                <AssistantBubble
                  msg={msg}
                  onRetry={handleRetry}
                  userQuery={prevUser?.content}
                  onSaved={() => { setSavedToast(true); setTimeout(() => setSavedToast(false), 2000); }}
                  isLatest={isLatestAssistant}
                />
              </div>
            );
          })}
        </div>
      </div>
      <NoteToast visible={savedToast} />

      {/* 先頭に戻るボタン */}
      {showTopBtn && (
        <button
          onClick={() => latestAnsRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="fixed bottom-28 right-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-white shadow-lg transition hover:opacity-90 active:scale-95"
          style={{ background: "#1B4332" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
          先頭に戻る
        </button>
      )}

      {/* 入力エリア（メッセージがある場合のみ下部に表示） */}
      {hasMessages && (
        <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3"
          style={{ boxShadow: "0 -2px 12px rgba(0,0,0,0.04)" }}>
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {QUICK_TAGS.map(tag => (
                <button key={tag} onClick={() => void handleSend(tag)} disabled={sending}
                  className="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition hover:border-orange-400 hover:text-orange-600 disabled:opacity-40"
                  style={{ background: "#F9FAFB", borderColor: "#E5E7EB", color: "#888" }}>
                  {tag}
                </button>
              ))}
            </div>
            {inputField}
            <p className="text-[10px] text-gray-300 text-center mt-1">Enter で送信 / Shift+Enter で改行</p>
          </div>
        </div>
      )}

    </div>
  );
}
