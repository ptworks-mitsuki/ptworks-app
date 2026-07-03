"use client";

import { useCallback } from "react";

const CACHE_KEY = "pt-search-cache-v3";
const TTL_MS    = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  texts:     Record<string, string>;
  timestamp: number;
}

type CacheStore = Record<string, CacheEntry>;

function readStore(): CacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: CacheStore): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch { /* quota exceeded */ }
}

export function useSearchCache() {
  const get = useCallback(
    (disease: string): Record<string, string> | null => {
      const store = readStore();
      const entry = store[disease];
      if (!entry) return null;
      if (Date.now() - entry.timestamp > TTL_MS) {
        delete store[disease];
        writeStore(store);
        return null;
      }
      return entry.texts;
    },
    [],
  );

  const set = useCallback(
    (disease: string, texts: Record<string, string>) => {
      const store = readStore();
      const now   = Date.now();
      for (const key of Object.keys(store)) {
        if (now - store[key].timestamp > TTL_MS) delete store[key];
      }
      store[disease] = { texts, timestamp: now };
      writeStore(store);
    },
    [],
  );

  return { get, set };
}
