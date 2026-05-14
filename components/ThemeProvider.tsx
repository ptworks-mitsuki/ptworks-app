"use client";

// Dark mode removed — always light theme.
// Interface kept for import compatibility.

import { createContext, useContext, ReactNode } from "react";

interface ThemeCtxValue {
  theme:  "light";
  toggle: () => void;
}

const ThemeCtx = createContext<ThemeCtxValue>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeCtx.Provider value={{ theme: "light", toggle: () => {} }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
