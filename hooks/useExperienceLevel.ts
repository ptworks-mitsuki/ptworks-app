"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "pt-experience-level";

export type ExperienceLevel =
  | "student"   // 学生
  | "junior"    // 1〜3年目
  | "mid"       // 4〜7年目
  | "senior"    // 8〜10年目
  | "veteran"   // 10年以上
  | "other"     // その他医療職
  | "";         // 未設定

export interface ExperienceMeta {
  label:     string;
  shortLabel: string;
  badgeTier: "basic" | "applied" | "expert";
  color:     string;
  bg:        string;
  border:    string;
  message:   string;
}

export const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: "student", label: "学生"     },
  { value: "junior",  label: "1〜3年目" },
  { value: "mid",     label: "4〜7年目" },
  { value: "senior",  label: "8〜10年目"},
  { value: "veteran", label: "10年以上" },
  { value: "other",   label: "その他医療職" },
];

export const EXPERIENCE_META: Record<Exclude<ExperienceLevel, "">, ExperienceMeta> = {
  student: {
    label: "学生",    shortLabel: "学生",
    badgeTier: "basic",
    color: "#15803d", bg: "#dcfce7", border: "#86efac",
    message: "基礎の項目を中心に確認しましょう。応用・専門は「次のステップ」として参考にしてください。",
  },
  junior: {
    label: "1〜3年目", shortLabel: "1〜3年目",
    badgeTier: "basic",
    color: "#15803d", bg: "#dcfce7", border: "#86efac",
    message: "あなた（1〜3年目）なら基礎項目まで知っていればOKです！応用はこれから伸ばしていくフェーズです。",
  },
  mid: {
    label: "4〜7年目", shortLabel: "4〜7年目",
    badgeTier: "applied",
    color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd",
    message: "あなた（4〜7年目）なら応用レベルまで理解できていれば十分です！専門項目は発展知識として活用を。",
  },
  senior: {
    label: "8〜10年目", shortLabel: "8〜10年目",
    badgeTier: "expert",
    color: "#c2410c", bg: "#fff7ed", border: "#fdba74",
    message: "あなた（8〜10年目）なら専門項目まで網羅できると強みになります。後輩への指導にも活用してください。",
  },
  veteran: {
    label: "10年以上", shortLabel: "10年以上",
    badgeTier: "expert",
    color: "#c2410c", bg: "#fff7ed", border: "#fdba74",
    message: "あなた（10年以上）のレベルなら全項目を深く理解できます。専門知識を後輩・患者に還元しましょう。",
  },
  other: {
    label: "その他医療職", shortLabel: "医療職",
    badgeTier: "applied",
    color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd",
    message: "各職種の視点から関連項目を確認してください。",
  },
};

/** section key → difficulty tier */
export const SECTION_LEVEL: Record<string, "basic" | "applied" | "expert"> = {
  pathophysiology:     "basic",
  anatomy:             "basic",
  assessment:          "basic",
  contraindications:   "basic",
  patient_explanation: "basic",
  staging:             "applied",
  prognosis:           "applied",
  treatment:           "applied",
  // treatment-evidence sections
  standard:  "applied",
  evidence:  "expert",
};

export const TIER_BADGE: Record<"basic" | "applied" | "expert", { label: string; color: string; bg: string }> = {
  basic:   { label: "基礎",  color: "#15803d", bg: "#dcfce7" },
  applied: { label: "応用",  color: "#1d4ed8", bg: "#dbeafe" },
  expert:  { label: "専門",  color: "#c2410c", bg: "#fff7ed" },
};

export function useExperienceLevel() {
  const [level, setLevelState] = useState<ExperienceLevel>("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ExperienceLevel | null;
      if (saved) setLevelState(saved);
    } catch { /* ignore */ }
  }, []);

  const setLevel = useCallback((v: ExperienceLevel) => {
    setLevelState(v);
    try { localStorage.setItem(STORAGE_KEY, v); } catch { /* ignore */ }
  }, []);

  const meta = level ? EXPERIENCE_META[level] : null;

  return { level, setLevel, meta };
}
