"use client";

import React, { useState } from "react";

// ── Colors ────────────────────────────────────────────────────────────────

export const LV_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: "#1B4332", text: "#fff" },
  B: { bg: "#2563EB", text: "#fff" },
  C: { bg: "#E85D04", text: "#fff" },
  D: { bg: "#9CA3AF", text: "#fff" },
};

// ── Inline badge ──────────────────────────────────────────────────────────

export function EvidenceBadge({ level, refName }: { level: string; refName?: string }) {
  const c           = LV_COLORS[level] ?? { bg: "#9CA3AF", text: "#fff" };
  const displayRef  = refName
    ? (refName.length > 20 ? refName.slice(0, 20) + "…" : refName)
    : undefined;

  return (
    <span style={{ display: "inline", verticalAlign: "middle", margin: "0 2px" }}>
      <span
        style={{
          display: "inline-block",
          background: c.bg,
          color: c.text,
          borderRadius: 4,
          padding: "2px 6px",
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1.4,
        }}
      >
        Lv.{level}
      </span>
      {displayRef && (
        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 4 }}>
          {displayRef}
        </span>
      )}
    </span>
  );
}

// ── Text → React nodes (replaces [Lv.X] or [Lv.X 文献名] with badges) ────

export function injectBadges(str: string): React.ReactNode[] {
  // Match [Lv.X] or [Lv.X text] — text can include spaces but not ]
  const parts = str.split(/(\[Lv\.[ABCD](?:\s+[^\]]+)?\])/g);
  return parts.map((p, i) => {
    const m = p.match(/^\[Lv\.([ABCD])(?:\s+([^\]]+))?\]$/);
    return m ? <EvidenceBadge key={i} level={m[1]} refName={m[2]} /> : p;
  });
}

// Applies badge injection to arbitrary ReactNode children
export function withBadges(children: React.ReactNode): React.ReactNode {
  const flat = Array.isArray(children) ? (children as React.ReactNode[]) : [children];
  const hasBadge = flat.some(c => typeof c === "string" && /\[Lv\.[ABCD]/.test(c));
  if (!hasBadge) return children;
  const result: React.ReactNode[] = [];
  flat.forEach((c, idx) => {
    if (typeof c === "string") {
      injectBadges(c).forEach(node => result.push(node));
    } else {
      result.push(<span key={`n${idx}`}>{c}</span>);
    }
  });
  return <>{result}</>;
}

// ── Accordion ─────────────────────────────────────────────────────────────

const LEVELS = [
  {
    level: "A",
    title: "複数のRCT・メタ解析による強いエビデンス",
    desc:  "無作為化比較試験（RCT）の系統的レビューやメタ解析によって支持された最高水準のエビデンス。",
  },
  {
    level: "B",
    title: "単一のRCT・コホート研究による根拠",
    desc:  "単一の無作為化比較試験、または質の高いコホート研究・症例対照研究によるエビデンス。",
  },
  {
    level: "C",
    title: "専門家委員会の意見・症例報告による根拠",
    desc:  "記述的研究・症例報告、または専門家委員会の合意に基づくエビデンス。",
  },
  {
    level: "D",
    title: "経験則・専門家個人の意見",
    desc:  "専門家個人の意見や臨床経験に基づく推奨。エビデンスが限定的な領域で使用。",
  },
];

export function EvidenceLevelAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition"
      >
        エビデンスレベルとは？
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="mt-2 rounded-xl px-4 py-4 space-y-3.5" style={{ background: "#F9FAFB" }}>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            エビデンスレベルについて
          </p>

          {LEVELS.map(l => (
            <div key={l.level} className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <EvidenceBadge level={l.level} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800 leading-snug">{l.title}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{l.desc}</p>
              </div>
            </div>
          ))}

          <div className="pt-3 border-t border-gray-200">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              ※ エビデンスレベルが低い場合でも、臨床的に重要な情報を含む場合があります。
              最終的な臨床判断は担当PTが行ってください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
