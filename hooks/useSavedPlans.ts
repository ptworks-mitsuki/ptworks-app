"use client";

import { useState, useEffect, useCallback } from "react";
import type { TreatmentEvidenceResult } from "@/app/api/treatment-evidence/route";
import type { PatientInfo } from "@/components/PatientInfoForm";

export interface SavedPlan {
  id:          string;
  name:        string;
  disease:     string;
  patientInfo: PatientInfo;
  result:      TreatmentEvidenceResult;
  savedAt:     number;
}

const STORAGE_KEY = "pt-saved-plans";

export function useSavedPlans() {
  const [plans, setPlans] = useState<SavedPlan[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPlans(JSON.parse(raw) as SavedPlan[]);
    } catch { /* ignore */ }
  }, []);

  const persist = (items: SavedPlan[]) => {
    setPlans(items);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  };

  const savePlan = useCallback((
    name: string,
    disease: string,
    patientInfo: PatientInfo,
    result: TreatmentEvidenceResult,
  ) => {
    const item: SavedPlan = {
      id: `plan-${Date.now()}`,
      name,
      disease,
      patientInfo,
      result,
      savedAt: Date.now(),
    };
    setPlans(prev => {
      const updated = [item, ...prev];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
    return item.id;
  }, []);

  const removePlan = useCallback((id: string) => {
    setPlans(prev => {
      const updated = prev.filter(p => p.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  return { plans, savePlan, removePlan, persist };
}
