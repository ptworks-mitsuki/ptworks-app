"use client";

import { useState, useEffect, useCallback } from "react";

export type FavoriteType = "disease" | "treatment" | "literature";

export interface FavoriteItem {
  id:        string;
  type:      FavoriteType;
  title:     string;
  subtitle?: string;
  href:      string;
  savedAt:   number;
}

const STORAGE_KEY = "pt-favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavorites(JSON.parse(raw) as FavoriteItem[]);
    } catch { /* ignore */ }
  }, []);

  const persist = (items: FavoriteItem[]) => {
    setFavorites(items);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  };

  const isFavorited = useCallback((id: string) => {
    return favorites.some(f => f.id === id);
  }, [favorites]);

  const toggleFavorite = useCallback((item: Omit<FavoriteItem, "savedAt">) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.id === item.id);
      const updated = exists
        ? prev.filter(f => f.id !== item.id)
        : [{ ...item, savedAt: Date.now() }, ...prev];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const updated = prev.filter(f => f.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  return { favorites, isFavorited, toggleFavorite, removeFavorite, persist };
}
