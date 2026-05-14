"use client";

import { useState, useEffect, useCallback } from "react";

const KEY = "pt-bookmarks";

export interface Bookmark {
  id:        string;
  disease:   string;
  note:      string;
  createdAt: string;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setBookmarks(JSON.parse(raw) as Bookmark[]);
    } catch { /* ignore */ }
  }, []);

  const save = useCallback((list: Bookmark[]) => {
    setBookmarks(list);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }, []);

  const addBookmark = useCallback((disease: string, note = "") => {
    setBookmarks(prev => {
      if (prev.some(b => b.disease === disease)) return prev;
      const next: Bookmark[] = [
        { id: Date.now().toString(), disease, note, createdAt: new Date().toISOString() },
        ...prev,
      ];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = prev.filter(b => b.id !== id);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const updateNote = useCallback((id: string, note: string) => {
    setBookmarks(prev => {
      const next = prev.map(b => b.id === id ? { ...b, note } : b);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [save]);

  const isBookmarked = useCallback((disease: string) =>
    bookmarks.some(b => b.disease === disease), [bookmarks]);

  return { bookmarks, addBookmark, removeBookmark, updateNote, isBookmarked };
}
