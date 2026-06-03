export interface MedicalSection {
  title:      string;
  /** 2〜3行の要点 — デフォルト表示 */
  summary:    string;
  /** 詳細解説 — 「詳しく見る」展開時のみ表示（summaryの繰り返しにならない内容） */
  detail:     string;
  references: string[];
}

export interface MedicalSearchResult {
  disease:         string;
  pathophysiology: MedicalSection;
  anatomy:         MedicalSection;
  staging:         MedicalSection;
  prognosis:       MedicalSection;
  assessment:      MedicalSection;
  treatment:       MedicalSection;
  contraindications: MedicalSection;
}

export type SectionKey = keyof Omit<MedicalSearchResult, "disease">;

export interface SectionMeta {
  key:   SectionKey;
  label: string;
  icon:  string;
  color: string;
  level: "basic" | "applied" | "expert";
}

export const SECTION_TITLES: Record<SectionKey, string> = {
  pathophysiology:  "病態",
  anatomy:          "解剖学的背景",
  staging:          "病期・重症度分類",
  prognosis:        "予後",
  assessment:       "評価（推奨スケール）",
  treatment:        "治療・アプローチ",
  contraindications: "禁忌・注意事項",
};

/** Primary sections: displayed prominently at the top */
export const PRIMARY_SECTION_KEYS = new Set<SectionKey>([
  "pathophysiology",
  "anatomy",
  "treatment",
]);

/** Display order: primary first, then secondary */
export const SECTIONS: SectionMeta[] = [
  { key: "pathophysiology",   label: "病態",                icon: "🧬", color: "blue",   level: "basic"   },
  { key: "anatomy",           label: "解剖学的背景",        icon: "🫀", color: "purple", level: "basic"   },
  { key: "treatment",         label: "治療・アプローチ",    icon: "💊", color: "red",    level: "applied" },
  { key: "staging",           label: "病期・重症度分類",    icon: "📊", color: "orange", level: "applied" },
  { key: "prognosis",         label: "予後",                icon: "📈", color: "green",  level: "applied" },
  { key: "assessment",        label: "評価（推奨スケール）", icon: "📋", color: "teal",   level: "basic"   },
  { key: "contraindications", label: "禁忌・注意事項",      icon: "⚠️", color: "yellow", level: "basic"   },
];

export interface Suggestion {
  name:        string;
  description: string;
}
