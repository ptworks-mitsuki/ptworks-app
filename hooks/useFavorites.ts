"use client";

import { useState, useEffect, useCallback } from "react";
import type { MedicalSection, SectionKey } from "@/types/medical";
import type { TreatmentEvidenceResult } from "@/app/api/treatment-evidence/route";
import type { PatientInfo } from "@/components/PatientInfoForm";

export type FavoriteType = "disease" | "treatment" | "literature" | "book";

export interface FavDisease {
  disease:  string;
  sections: Partial<Record<SectionKey, MedicalSection>>;
}

export interface FavTreatment {
  disease:     string;
  patientInfo: PatientInfo;
  result:      TreatmentEvidenceResult;
}

export interface FavLiterature {
  id:            string;
  title:         string;
  titleJa?:      string;
  authors:       string;
  journal:       string;
  year:          number;
  evidenceLevel: string;
  url:           string;
  summary:       string;
}

export interface FavBook {
  id:          string;
  title:       string;
  authors:     string;
  publisher:   string;
  year:        number;
  price:       string;
  coverUrl:    string;
  summary:     string;
  rakutenUrl:  string;
  category:    string;
}

export interface FavoriteItem {
  id:               string;
  type:             FavoriteType;
  title:            string;
  subtitle?:        string;
  savedAt:          number;
  // one of these is set based on type
  diseaseData?:     FavDisease;
  treatmentData?:   FavTreatment;
  literatureData?:  FavLiterature;
  bookData?:        FavBook;
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

  return { favorites, isFavorited, toggleFavorite, removeFavorite };
}
