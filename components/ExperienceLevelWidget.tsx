"use client";

import { useState } from "react";
import {
  useExperienceLevel,
  EXPERIENCE_OPTIONS,
  EXPERIENCE_META,
  TIER_BADGE,
  type ExperienceLevel,
} from "@/hooks/useExperienceLevel";

export function ExperienceLevelWidget() {
  const { level, setLevel, meta } = useExperienceLevel();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">

      {/* ── Toggle button ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition text-xs font-semibold"
        style={
          meta
            ? { background: meta.bg, borderColor: meta.border, color: meta.color }
            : { background: "#f3f4f6", borderColor: "#e5e7eb", color: "#6b7280" }
        }
      >
        👨‍⚕️ {meta ? `${meta.shortLabel}モード` : "経験年数を設定"}
        <span className="opacity-60">{open ? "▲" : "▼"}</span>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl p-4">
          <p className="text-xs font-bold text-gray-700 mb-3">あなたは何年目のPTですか？</p>
          <div className="space-y-1.5">
            {EXPERIENCE_OPTIONS.map(opt => {
              const m = EXPERIENCE_META[opt.value as Exclude<ExperienceLevel, "">];
              const isActive = level === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setLevel(opt.value); setOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition text-left text-sm"
                  style={
                    isActive
                      ? { background: m.bg, borderColor: m.border, color: m.color }
                      : { background: "#f9fafb", borderColor: "#e5e7eb", color: "#374151" }
                  }
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: TIER_BADGE[m.badgeTier].bg, color: TIER_BADGE[m.badgeTier].color }}
                  >
                    {TIER_BADGE[m.badgeTier].label}レベル
                  </span>
                </button>
              );
            })}
          </div>

          {meta && (
            <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
              {meta.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
