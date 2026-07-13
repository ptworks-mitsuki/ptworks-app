"use client";

import { useState, useEffect, useCallback } from "react";
import { getWindowUsage, msUntilReset } from "@/lib/usage-tracker";
import { CURRENT_PLAN, PLAN_LIMIT_YEN } from "@/lib/plan";

export interface WindowUsageState {
  percentUsed:   number;       // 0–100+ based on plan limit
  isBlocked:     boolean;      // over 100%
  msUntilReset:  number;       // ms until oldest entry expires
  refresh:       () => void;
}

export function useWindowUsage(): WindowUsageState {
  const limit = PLAN_LIMIT_YEN[CURRENT_PLAN];

  const compute = useCallback((): WindowUsageState => {
    if (!limit) {
      return { percentUsed: 0, isBlocked: false, msUntilReset: 0, refresh: () => {} };
    }
    const { costYen } = getWindowUsage();
    const pct = Math.min((costYen / limit) * 100, 200);
    return {
      percentUsed:  pct,
      isBlocked:    pct >= 100,
      msUntilReset: msUntilReset(),
      refresh:      () => {},
    };
  }, [limit]);

  const [state, setState] = useState<WindowUsageState>(() => compute());

  const refresh = useCallback(() => setState(compute()), [compute]);

  // Refresh every 30 seconds so the countdown stays accurate
  useEffect(() => {
    setState(compute());
    const id = setInterval(() => setState(compute()), 30_000);
    return () => clearInterval(id);
  }, [compute]);

  return { ...state, refresh };
}
