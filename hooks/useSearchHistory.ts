import { useState, useEffect, useCallback } from "react";

export interface HistoryItem {
  id: string;
  query: string;
  timestamp: number;
}

const STORAGE_KEY = "pt-search-history";
const MAX_ITEMS = 20;

export function useSearchHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw) as HistoryItem[]);
    } catch { /* ignore */ }
  }, []);

  const save = (items: HistoryItem[]) => {
    setHistory(items);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  };

  const addHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const deduped = prev.filter((h) => h.query !== query);
      const updated = [{ id: `${Date.now()}`, query, timestamp: Date.now() }, ...deduped].slice(0, MAX_ITEMS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const removeHistory = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      save(updated);
      return updated;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearHistory = useCallback(() => {
    save([]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { history, addHistory, removeHistory, clearHistory };
}
