"use client";

import { useWindowUsage } from "@/hooks/useWindowUsage";
import { CURRENT_PLAN, PLAN_LIMIT_YEN } from "@/lib/plan";

export function UsageIndicator() {
  const limit = PLAN_LIMIT_YEN[CURRENT_PLAN];
  const { percentUsed } = useWindowUsage();

  // Only show for paid plans with a limit
  if (!limit) return null;

  const barPct = Math.min(percentUsed, 100);
  const barColor =
    percentUsed >= 100 ? "#EF4444" :
    percentUsed >= 80  ? "#E85D04" :
    "#9CA3AF";

  const warn = percentUsed >= 100
    ? "利用制限に達しました"
    : percentUsed >= 80
    ? "まもなく利用制限に達します"
    : null;

  return (
    <div className="px-4 py-2.5 border-b border-gray-100 bg-white">
      <div className="flex items-center gap-2.5 max-w-xl mx-auto">
        <p className="text-[11px] font-semibold text-gray-400 shrink-0">利用状況</p>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${barPct}%`, background: barColor }}
          />
        </div>
        <p className="text-[11px] font-black shrink-0" style={{ color: barColor }}>
          {Math.round(percentUsed)}%
        </p>
      </div>
      {warn && (
        <p className="text-center text-[11px] font-semibold mt-1 max-w-xl mx-auto"
          style={{ color: barColor }}>
          {warn}
        </p>
      )}
    </div>
  );
}
