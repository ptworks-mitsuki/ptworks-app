"use client";

import { useState } from "react";
import { MedicalSection } from "@/types/medical";
import { TreatmentFilter } from "./TreatmentFilter";
import { SECTION_LEVEL, TIER_BADGE } from "@/hooks/useExperienceLevel";

interface SectionCardProps {
  section:     MedicalSection;
  icon:        string;
  colorClass:  string;
  disease:     string;
  sectionKey:  string;
  variant?:    "primary" | "secondary";
  /** optional: highlight tier based on user experience */
  userTier?:  "basic" | "applied" | "expert" | null;
}

// Left-border accent colors + term highlight color per section
const colorMap: Record<string, { accent: string; titleText: string; termBtn: string }> = {
  blue:   { accent: "border-l-blue-500",   titleText: "text-blue-700",   termBtn: "text-blue-600 bg-blue-50 hover:bg-blue-100" },
  purple: { accent: "border-l-purple-500", titleText: "text-purple-700", termBtn: "text-purple-600 bg-purple-50 hover:bg-purple-100" },
  orange: { accent: "border-l-orange-500", titleText: "text-orange-700", termBtn: "text-orange-600 bg-orange-50 hover:bg-orange-100" },
  green:  { accent: "border-l-green-500",  titleText: "text-green-700",  termBtn: "text-green-600 bg-green-50 hover:bg-green-100" },
  teal:   { accent: "border-l-teal-500",   titleText: "text-teal-700",   termBtn: "text-teal-600 bg-teal-50 hover:bg-teal-100" },
  red:    { accent: "border-l-red-500",    titleText: "text-red-700",    termBtn: "text-red-600 bg-red-50 hover:bg-red-100" },
  yellow: { accent: "border-l-yellow-500", titleText: "text-yellow-700", termBtn: "text-yellow-600 bg-yellow-50 hover:bg-yellow-100" },
  indigo: { accent: "border-l-indigo-500", titleText: "text-indigo-700", termBtn: "text-indigo-600 bg-indigo-50 hover:bg-indigo-100" },
  pink:   { accent: "border-l-pink-500",   titleText: "text-pink-700",   termBtn: "text-pink-600 bg-pink-50 hover:bg-pink-100" },
};

// ── Term parsing ─────────────────────────────────────────────────────────

type Segment = { type: "text"; value: string } | { type: "term"; value: string };

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: "text",  value: text.slice(last, m.index) });
    segments.push({ type: "term", value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ type: "text", value: text.slice(last) });
  return segments;
}

function stripMarkers(text: string) {
  return text.replace(/\[\[([^\]]+)\]\]/g, "$1");
}

function getSummaryLines(content: string, count: number): string[] {
  return stripMarkers(content).split("\n").map(l => l.trim()).filter(Boolean).slice(0, count);
}

// ── Content renderers ────────────────────────────────────────────────────

function TermButton({ term, termBtn, onClick }: { term: string; termBtn: string; onClick: (t: string) => void }) {
  return (
    <button
      onClick={() => onClick(term)}
      className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs font-medium underline decoration-dashed underline-offset-2 transition ${termBtn}`}
    >
      {term}
      <span className="text-[10px] opacity-60">?</span>
    </button>
  );
}

function ContentLine({
  line, termBtn, onTermClick,
}: {
  line: string; termBtn: string; onTermClick: (term: string) => void;
}) {
  const isBullet = /^[・•●\-]/.test(line) || /^\d+[.．]/.test(line);
  const segments = parseSegments(line);

  return (
    <p className={`leading-relaxed ${isBullet ? "pl-2" : ""}`}>
      {segments.map((seg, i) =>
        seg.type === "term" ? (
          <TermButton key={i} term={seg.value} termBtn={termBtn} onClick={onTermClick} />
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </p>
  );
}

function ContentBlock({
  content, termBtn, onTermClick,
}: {
  content: string; termBtn: string; onTermClick: (term: string) => void;
}) {
  return (
    <div className="text-sm text-gray-800 space-y-1">
      {content.split("\n").map((line, i) =>
        line.trim() === "" ? (
          <div key={i} className="h-2" />
        ) : (
          <ContentLine key={i} line={line.trimEnd()} termBtn={termBtn} onTermClick={onTermClick} />
        )
      )}
    </div>
  );
}

// ── Term popup state ─────────────────────────────────────────────────────

interface TermPopup {
  term: string;
  explanation: string | null;
  loading: boolean;
}

function TermPopupBox({ termPopup, onClose }: { termPopup: TermPopup; onClose: () => void }) {
  return (
    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900 text-sm">💡 {termPopup.term}</p>
          {termPopup.loading ? (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
              読み込み中…
            </p>
          ) : (
            <p className="text-sm text-amber-800 mt-1 leading-relaxed">{termPopup.explanation}</p>
          )}
        </div>
        <button onClick={onClose} className="text-amber-400 hover:text-amber-600 shrink-0 text-sm">✕</button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────

export function SectionCard({
  section, icon, colorClass, disease, sectionKey, variant = "primary", userTier,
}: SectionCardProps) {
  const isPrimary    = variant === "primary";
  const summaryCount = isPrimary ? 5 : 2;

  // Difficulty badge for this section
  const sectionTier  = SECTION_LEVEL[sectionKey] ?? "applied";
  const tierMeta     = TIER_BADGE[sectionTier];

  // Highlight: user's tier matches or exceeds this section's tier
  const tierOrder   = { basic: 0, applied: 1, expert: 2 };
  const isHighlight = userTier != null && tierOrder[userTier] >= tierOrder[sectionTier];
  const isNextStep  = userTier != null && tierOrder[userTier] === tierOrder[sectionTier] - 1;

  const [cardOpen,  setCardOpen]  = useState(true);
  const [expanded,  setExpanded]  = useState(false);
  const [copied,    setCopied]    = useState(false);

  // Diagram (primary only)
  const [diagramSvg,     setDiagramSvg]     = useState<string | null>(null);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramError,   setDiagramError]   = useState<string | null>(null);
  const [diagramOpen,    setDiagramOpen]    = useState(false);

  // Term popup
  const [termPopup, setTermPopup] = useState<TermPopup | null>(null);

  const c = colorMap[colorClass] ?? colorMap.blue;
  const summaryLines = getSummaryLines(section.content, summaryCount);
  const allLines     = stripMarkers(section.content).split("\n").filter(Boolean);
  const hasMore      = allLines.length > summaryCount || section.references.length > 0;

  // ── Handlers ──

  const handleCopy = () => {
    navigator.clipboard.writeText(stripMarkers(section.content));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleDiagram = async () => {
    if (diagramSvg) { setDiagramOpen(v => !v); return; }
    setDiagramOpen(true);
    setDiagramLoading(true);
    setDiagramError(null);
    try {
      const res  = await fetch("/api/diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease, sectionKey, sectionTitle: section.title }),
      });
      const data = await res.json() as { svg?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "生成に失敗しました");
      setDiagramSvg(data.svg ?? null);
    } catch (err) {
      setDiagramError(err instanceof Error ? err.message : "エラー");
      setDiagramOpen(false);
    } finally {
      setDiagramLoading(false);
    }
  };

  const handleTermClick = async (term: string) => {
    if (termPopup?.term === term) { setTermPopup(null); return; }
    setTermPopup({ term, explanation: null, loading: true });
    try {
      const res  = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, disease }),
      });
      const data = await res.json() as { explanation: string };
      setTermPopup({ term, explanation: data.explanation, loading: false });
    } catch {
      setTermPopup({ term, explanation: "説明を取得できませんでした", loading: false });
    }
  };

  // ── Render ──

  const borderWidth = isPrimary ? "border-l-[5px]" : "border-l-4";
  const titleSize   = isPrimary ? "text-base"       : "text-sm";
  const cardPad     = isPrimary ? "py-3.5"          : "py-2.5";

  return (
    <div
      className={`rounded-xl border ${borderWidth} ${c.accent} bg-white overflow-hidden shadow-sm print:shadow-none print:rounded-none print:mb-4 transition-all ${
        isHighlight ? "border-gray-200 ring-2 ring-offset-1 ring-blue-100" :
        isNextStep  ? "border-gray-200 opacity-90" :
        "border-gray-200"
      }`}
    >

      {/* Title bar */}
      <button
        onClick={() => setCardOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 ${cardPad} bg-white hover:bg-gray-50 transition print:cursor-default print:hover:bg-white`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className={isPrimary ? "text-lg" : "text-base"}>{icon}</span>
          <span className={`font-semibold ${titleSize} ${c.titleText} print:text-gray-900`}>
            {section.title}
          </span>
          {/* Difficulty badge */}
          <span
            className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: tierMeta.bg, color: tierMeta.color }}
          >
            {tierMeta.label}
          </span>
          {/* Next-step label */}
          {isNextStep && (
            <span className="shrink-0 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
              次のステップ
            </span>
          )}
        </div>
        <span className="text-gray-300 text-xs print:hidden ml-2">{cardOpen ? "▲" : "▼"}</span>
      </button>

      {/* Card body */}
      <div className={`${cardOpen ? "block" : "hidden"} print:block border-t border-gray-100`}>

        {/* Summary (screen only) */}
        <div className={`px-4 ${isPrimary ? "py-3.5" : "py-2.5"} bg-gray-50 print:hidden`}>
          <div className={`${isPrimary ? "text-sm" : "text-xs"} text-gray-800 space-y-1`}>
            {summaryLines.map((line, i) => (
              <p key={i} className="leading-relaxed">{line}</p>
            ))}
          </div>

          {/* Term popup in summary */}
          {termPopup && !expanded && (
            <TermPopupBox termPopup={termPopup} onClose={() => setTermPopup(null)} />
          )}

          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {hasMore && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 transition flex items-center gap-1"
              >
                {expanded ? <>▲ 閉じる</> : <>▼ 詳しく見る</>}
              </button>
            )}
            {/* Diagram button: primary sections only */}
            {isPrimary && (
              <button
                onClick={handleToggleDiagram}
                disabled={diagramLoading}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 transition flex items-center gap-1 disabled:opacity-40"
              >
                {diagramLoading ? (
                  <><span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />図を生成中…</>
                ) : diagramOpen && diagramSvg ? "🖼️ 図を隠す" : "🖼️ 図を見る"}
              </button>
            )}
          </div>
        </div>

        {/* Diagram (primary sections only) */}
        {isPrimary && diagramOpen && (
          <div className="px-4 pb-3 bg-gray-50 print:hidden">
            {diagramLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 bg-white rounded-xl border border-dashed border-gray-200">
                <div className="w-7 h-7 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-400">AIが図を描いています（3〜8秒）</p>
              </div>
            ) : diagramError ? (
              <div className="py-4 text-center text-sm text-red-500 bg-red-50 rounded-xl border border-red-100">
                ⚠ {diagramError}
                <button
                  onClick={() => { setDiagramSvg(null); handleToggleDiagram(); }}
                  className="block mx-auto mt-2 text-xs underline"
                >
                  再試行
                </button>
              </div>
            ) : diagramSvg ? (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="w-full" dangerouslySetInnerHTML={{ __html: diagramSvg }} />
                <p className="text-xs text-gray-400 px-3 py-2 border-t border-gray-100">
                  ※ AI生成の模式図です。正確な情報は一次文献を参照してください。
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Treatment filter — always visible when card is open (treatment section only) */}
        {sectionKey === "treatment" && (
          <div className="px-4 pt-4 pb-1 bg-white border-t border-gray-100 print:hidden">
            <TreatmentFilter disease={disease} />
          </div>
        )}

        {/* Full content (expanded on screen / always on print) */}
        <div className={`${expanded ? "block" : "hidden"} print:block bg-white border-t border-gray-100 px-4 py-4`}>
          <ContentBlock
            content={section.content}
            termBtn={c.termBtn}
            onTermClick={handleTermClick}
          />

          {/* Term popup inside expanded content */}
          {termPopup && expanded && (
            <TermPopupBox termPopup={termPopup} onClose={() => setTermPopup(null)} />
          )}

          {section.references.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 mb-2">参考文献</p>
              <ul className="space-y-1.5">
                {section.references.map((ref, i) => (
                  <li key={i} className="text-xs px-2.5 py-1.5 rounded border border-gray-200 bg-gray-50 text-gray-600 print:bg-transparent">
                    {i + 1}. {ref}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={handleCopy} className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition print:hidden">
            {copied ? "✓ コピーしました" : "📋 全文をコピー"}
          </button>
        </div>

        {/* Print: diagram */}
        {diagramSvg && (
          <div className="hidden print:block px-4 pb-4">
            <div dangerouslySetInnerHTML={{ __html: diagramSvg }} />
          </div>
        )}
      </div>
    </div>
  );
}
