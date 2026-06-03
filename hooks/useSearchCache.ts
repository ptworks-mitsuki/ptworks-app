"use client";

import { useCallback } from "react";
import type { SectionKey, MedicalSection } from "@/types/medical";

const CACHE_KEY = "pt-search-cache-v2";
const TTL_MS    = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  sections:  Partial<Record<SectionKey, MedicalSection>>;
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
  } catch { /* storage quota exceeded — fail silently */ }
}

export function useSearchCache() {
  const get = useCallback(
    (disease: string): Partial<Record<SectionKey, MedicalSection>> | null => {
      const store = readStore();
      const entry = store[disease];
      if (!entry) return null;
      if (Date.now() - entry.timestamp > TTL_MS) {
        delete store[disease];
        writeStore(store);
        return null;
      }
      return entry.sections;
    },
    [],
  );

  const set = useCallback(
    (disease: string, sections: Partial<Record<SectionKey, MedicalSection>>) => {
      const store = readStore();
      // Evict stale entries to keep storage lean
      const now = Date.now();
      for (const key of Object.keys(store)) {
        if (now - store[key].timestamp > TTL_MS) delete store[key];
      }
      store[disease] = { sections, timestamp: now };
      writeStore(store);
    },
    [],
  );

  return { get, set };
}
