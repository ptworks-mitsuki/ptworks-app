"use client";

import { useState, useEffect, useCallback } from "react";
import { IS_TEST_MODE } from "@/lib/plan";

const KEY   = "pt-free-quota";
const TOTAL = 5; // free searches per month

interface QuotaState {
  used:      number;
  monthKey:  string;   // "YYYY-MM"
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function useFreeQuota() {
  const [state, setState] = useState<QuotaState>({ used: 0, monthKey: currentMonthKey() });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as QuotaState;
        // Reset if new month
        if (parsed.monthKey !== currentMonthKey()) {
          const fresh = { used: 0, monthKey: currentMonthKey() };
          localStorage.setItem(KEY, JSON.stringify(fresh));
          setState(fresh);
        } else {
          setState(parsed);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const consume = useCallback(() => {
    setState(prev => {
      const next = { ...prev, used: Math.min(prev.used + 1, TOTAL) };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const remaining   = IS_TEST_MODE ? TOTAL : Math.max(TOTAL - state.used, 0);
  const isExhausted = IS_TEST_MODE ? false : remaining === 0;
  const percentage  = IS_TEST_MODE ? 0 : (state.used / TOTAL) * 100;

  return { used: state.used, total: TOTAL, remaining, isExhausted, percentage, consume };
}
