"use client";

import { useState } from "react";
import type { ComedicalResult } from "@/app/api/comedical/route";

interface ComedicalSectionProps {
  disease: string;
}

function BulletBlock({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").filter(Boolean).map((line, i) => (
        <p key={i} className="text-sm text-gray-700 leading-relaxed">{line}</p>
      ))}
    </div>
  );
}

function QuestionList({ questions, label, icon, color }: {
  questions: string[];
  label: string;
  icon:  string;
  color: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold mb-2" style={{ color }}>
        {icon} {label}への質問例
      </p>
      <ul className="space-y-1.5">
        {questions.map((q, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="shrink-0 text-xs font-bold text-gray-300 mt-0.5">Q{i + 1}</span>
            <p className="text-sm text-gray-700 leading-relaxed">{q}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PROFESSION_SECTIONS = [
  {
    key:   "nursing" as const,
    icon:  "🏥",
    label: "看護師の介入",
    color: "#0891b2",
    bg:    "#ecfeff",
    border:"#a5f3fc",
    desc:  "バイタル管理・体位変換・服薬管理など",
  },
  {
    key:   "ot" as const,
    icon:  "🖐️",
    label: "OT（作業療法士）の視点",
    color: "#7c3aed",
    bg:    "#f5f3ff",
    border:"#ddd6fe",
    desc:  "ADL・上肢機能・高次脳機能評価など",
  },
  {
    key:   "st" as const,
    icon:  "🗣️",
    label: "ST（言語聴覚士）の視点",
    color: "#be185d",
    bg:    "#fdf2f8",
    border:"#f9a8d4",
    desc:  "嚥下・言語・認知機能など",
  },
];

const CONFERENCE_ROLES = [
  { key: "nurse"  as const, label: "看護師", icon: "🏥", color: "#0891b2" },
  { key: "ot"     as const, label: "OT",    icon: "🖐️", color: "#7c3aed" },
  { key: "doctor" as const, label: "医師",   icon: "👨‍⚕️", color: "#dc2626" },
  { key: "family" as const, label: "家族",   icon: "👨‍👩‍👧", color: "#15803d" },
];

export function ComedicalSection({ disease }: ComedicalSectionProps) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [data,    setData]    = useState<ComedicalResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const fetchData = async () => {
    if (data) { setOpen(v => !v); return; }
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/comedical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease }),
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) throw new Error("non-json");
      const json = await res.json() as ComedicalResult | { error: string };
      if ("error" in json) throw new Error(json.error);
      setData(json);
    } catch (err) {
      const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (/[ぁ-ん]/.test(m)) {
        setError(err instanceof Error ? err.message : String(err));
      } else {
        setError("現在メンテナンス中です。しばらくお待ちください。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-teal-200 overflow-hidden shadow-sm print:hidden">

      {/* ── Accordion header (always visible) ── */}
      <button
        type="button"
        onClick={fetchData}
        className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition px-5 py-4 flex items-center justify-between text-left"
      >
        <div>
          <p className="text-white font-bold text-base">
            🤝 他職種の視点・カンファレンス活用
          </p>
          <p className="text-teal-200 text-xs mt-0.5">
            看護師・OT・ST の介入視点 + カンファレンスで使える質問例
          </p>
        </div>
        <span className="text-white/70 text-sm ml-4 shrink-0">
          {loading ? (
            <span className="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : open ? "▲" : "▼"}
        </span>
      </button>

      {/* ── Content ── */}
      {open && (
        <div className="bg-white">

          {loading && (
            <div className="flex items-center justify-center gap-3 py-10">
              <div className="w-6 h-6 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">文献・論文をもとに整理中…</p>
            </div>
          )}

          {error && (
            <div className="p-5 text-center">
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={() => { setData(null); setError(null); fetchData(); }}
                className="mt-2 text-xs text-red-400 underline"
              >
                再試行
              </button>
            </div>
          )}

          {data && (
            <div className="p-5 space-y-6">

              {/* ── Per-profession sections ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PROFESSION_SECTIONS.map(p => (
                  <div
                    key={p.key}
                    className="rounded-xl border p-4"
                    style={{ background: p.bg, borderColor: p.border }}
                  >
                    <p className="text-sm font-bold mb-3" style={{ color: p.color }}>
                      {p.icon} {p.label}
                    </p>
                    <p className="text-[10px] text-gray-400 mb-2">{p.desc}</p>
                    <BulletBlock text={data[p.key]} />
                  </div>
                ))}
              </div>

              {/* ── Conference questions ── */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-bold text-gray-800 mb-4">
                  💬 カンファレンスでPTが聞くべき質問例
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {CONFERENCE_ROLES.map(r => (
                    <QuestionList
                      key={r.key}
                      questions={data.questions[r.key] ?? []}
                      label={r.label}
                      icon={r.icon}
                      color={r.color}
                    />
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
