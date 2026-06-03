"use client";

import { useState } from "react";
import { MedicalSection } from "@/types/medical";
import { SECTION_LEVEL, TIER_BADGE } from "@/hooks/useExperienceLevel";

interface SectionCardProps {
  section:    MedicalSection;
  icon:       string;
  colorClass: string;
  disease:    string;
  sectionKey: string;
  variant?:   "primary" | "secondary";
  userTier?:  "basic" | "applied" | "expert" | null;
}

const colorMap: Record<string, { accent: string; titleText: string; termBtn: string }> = {
  blue:   { accent: "border-l-blue-500",   titleText: "text-blue-700",   termBtn: "text-blue-600 bg-blue-50 hover:bg-blue-100"     },
  purple: { accent: "border-l-purple-500", titleText: "text-purple-700", termBtn: "text-purple-600 bg-purple-50 hover:bg-purple-100" },
  orange: { accent: "border-l-orange-500", titleText: "text-orange-700", termBtn: "text-orange-600 bg-orange-50 hover:bg-orange-100" },
  green:  { accent: "border-l-green-500",  titleText: "text-green-700",  termBtn: "text-green-600 bg-green-50 hover:bg-green-100"   },
  teal:   { accent: "border-l-teal-500",   titleText: "text-teal-700",   termBtn: "text-teal-600 bg-teal-50 hover:bg-teal-100"     },
  red:    { accent: "border-l-red-500",    titleText: "text-red-700",    termBtn: "text-red-600 bg-red-50 hover:bg-red-100"         },
  yellow: { accent: "border-l-yellow-500", titleText: "text-yellow-700", termBtn: "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"},
};

// ── Term parsing ──────────────────────────────────────────────────────────

type Segment = { type: "text"; value: string } | { type: "term"; value: string };

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: "text", value: text.slice(last, m.index) });
    segments.push({ type: "term", value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ type: "text", value: text.slice(last) });
  return segments;
}

function stripMarkers(text: string) {
  return text.replace(/\[\[([^\]]+)\]\]/g, "$1");
}

// ── Sub-components ────────────────────────────────────────────────────────

function TermButton({ term, termBtn, onClick }: {
  term: string; termBtn: string; onClick: (t: string) => void;
}) {
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
}: { line: string; termBtn: string; onTermClick: (t: string) => void }) {
  const segments = parseSegments(line);
  const isBullet = /^[・•●\-]/.test(line) || /^\d+[.．]/.test(line);
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

function ContentBlock({ content, termBtn, onTermClick }: {
  content: string; termBtn: string; onTermClick: (t: string) => void;
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

// ── Term popup ────────────────────────────────────────────────────────────

interface TermPopup { term: string; explanation: string | null; loading: boolean }

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

// ── Main component ────────────────────────────────────────────────────────

export function SectionCard({
  section, icon, colorClass, disease, sectionKey, variant = "primary", userTier,
}: SectionCardProps) {
  const isPrimary = variant === "primary";

  const [cardOpen,  setCardOpen]  = useState(true);
  const [expanded,  setExpanded]  = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [termPopup, setTermPopup] = useState<TermPopup | null>(null);

  const c          = colorMap[colorClass] ?? colorMap.blue;
  const hasDetail  = section.detail?.trim().length > 0 || section.references.length > 0;
  const borderWidth = isPrimary ? "border-l-[5px]" : "border-l-4";
  const titleSize   = isPrimary ? "text-base"       : "text-sm";
  const cardPad     = isPrimary ? "py-3.5"          : "py-2.5";

  // Difficulty badge
  const sectionTier = SECTION_LEVEL[sectionKey] ?? "applied";
  const tierMeta    = TIER_BADGE[sectionTier];
  const tierOrder   = { basic: 0, applied: 1, expert: 2 };
  const isHighlight = userTier != null && tierOrder[userTier] >= tierOrder[sectionTier];
  const isNextStep  = userTier != null && tierOrder[userTier] === tierOrder[sectionTier] - 1;

  const handleCopy = () => {
    const text = [section.summary, section.detail].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(stripMarkers(text));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTermClick = async (term: string) => {
    if (termPopup?.term === term) { setTermPopup(null); return; }
    setTermPopup({ term, explanation: null, loading: true });
    try {
      const res  = await fetch("/api/explain", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ term, disease }),
      });
      const data = await res.json() as { explanation: string };
      setTermPopup({ term, explanation: data.explanation, loading: false });
    } catch {
      setTermPopup({ term, explanation: "説明を取得できませんでした", loading: false });
    }
  };

  return (
    <div
      className={`rounded-xl border ${borderWidth} ${c.accent} bg-white overflow-hidden shadow-sm print:shadow-none print:rounded-none print:mb-4 transition-all ${
        isHighlight ? "ring-2 ring-offset-1 ring-blue-100 border-gray-200" :
        isNextStep  ? "border-gray-200 opacity-90" : "border-gray-200"
      }`}
    >
      {/* ── Title bar ── */}
      <button
        onClick={() => setCardOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 ${cardPad} bg-white hover:bg-gray-50 transition print:cursor-default`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className={isPrimary ? "text-lg" : "text-base"}>{icon}</span>
          <span className={`font-semibold ${titleSize} ${c.titleText}`}>
            {section.title}
          </span>
          {/* Difficulty badge */}
          <span
            className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: tierMeta.bg, color: tierMeta.color }}
          >
            {tierMeta.label}
          </span>
          {isNextStep && (
            <span className="shrink-0 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
              次のステップ
            </span>
          )}
        </div>
        <span className="text-gray-300 text-xs print:hidden ml-2">{cardOpen ? "▲" : "▼"}</span>
      </button>

      {/* ── Card body ── */}
      {cardOpen && (
        <div className="border-t border-gray-100 print:block">

          {/* Summary (always visible) */}
          <div className={`px-4 ${isPrimary ? "py-3.5" : "py-2.5"} bg-gray-50 print:bg-white`}>
            <ContentBlock
              content={section.summary}
              termBtn={c.termBtn}
              onTermClick={handleTermClick}
            />

            {termPopup && !expanded && (
              <TermPopupBox termPopup={termPopup} onClose={() => setTermPopup(null)} />
            )}

            {/* "詳しく見る" toggle */}
            {hasDetail && (
              <button
                onClick={() => setExpanded(v => !v)}
                className={`mt-2.5 text-xs font-medium transition flex items-center gap-1 ${c.titleText} hover:opacity-70`}
              >
                {expanded ? (
                  <>▲ 閉じる</>
                ) : (
                  <>▼ 詳しく見る（根拠・エビデンス・臨床での使い方）</>
                )}
              </button>
            )}
          </div>

          {/* Detail (expanded) */}
          {expanded && (
            <div className="bg-white border-t border-gray-100 px-4 py-4 print:block">
              {section.detail?.trim() && (
                <>
                  {/* Visual separator */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[10px] font-semibold text-gray-400 tracking-wide">根拠・エビデンス・臨床での使い方</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  <ContentBlock
                    content={section.detail}
                    termBtn={c.termBtn}
                    onTermClick={handleTermClick}
                  />

                  {termPopup && expanded && (
                    <TermPopupBox termPopup={termPopup} onClose={() => setTermPopup(null)} />
                  )}
                </>
              )}

              {/* References */}
              {section.references.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 mb-2">📚 参考文献</p>
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
          )}
        </div>
      )}
    </div>
  );
}
