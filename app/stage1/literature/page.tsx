"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFavorites } from "@/hooks/useFavorites";

// ── Types ─────────────────────────────────────────────────────────────────

type EvidenceLevel = "A" | "B" | "C" | "D";

interface Paper {
  id:             string;
  title:          string;     // 原題（英語）
  titleJa:        string;     // AI日本語訳タイトル
  authors:        string;
  journal:        string;
  year:           number;
  evidenceLevel:  EvidenceLevel;
  url:            string;
  summary:        string;     // AI日本語要約
  keywords:       string[];
  isOpenAccess:   boolean;    // 全文無料かどうか
}

interface SearchFilters {
  evidenceLevelA: boolean;
  recentOnly:     boolean;
}

// ── Dummy paper database ─────────────────────────────────────────────────

const DUMMY_PAPERS: Paper[] = [
  {
    id: "1",
    title: "Exercise therapy for knee osteoarthritis: a systematic review and meta-analysis of randomized controlled trials",
    titleJa: "変形性膝関節症に対する運動療法：無作為化比較試験のシステマティックレビューとメタ解析",
    authors: "Tanaka K, Yamamoto T, Suzuki M, et al.",
    journal: "Physical Therapy",
    year: 2023,
    evidenceLevel: "A",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "変形性膝関節症患者2,156例を対象とした24件のRCTを統合解析。運動療法（有酸素運動＋筋力強化）はVASスコアを平均2.4点改善し、WOMAC機能スコアを統計的有意に向上させた（p<0.001）。特に低負荷高反復の大腿四頭筋強化訓練との組み合わせが最も効果的であることが示された。",
    keywords: ["膝", "変形性膝関節症", "knee", "osteoarthritis", "運動療法", "RCT"],
    isOpenAccess: true,
  },
  {
    id: "2",
    title: "Task-oriented training versus traditional physiotherapy for stroke patients: effects on upper limb function and activities of daily living",
    titleJa: "脳卒中患者における課題指向型訓練対従来理学療法：上肢機能および日常生活活動への影響",
    authors: "Nakamura H, Ito S, Watanabe Y, et al.",
    journal: "Neurorehabilitation and Neural Repair",
    year: 2022,
    evidenceLevel: "A",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "脳卒中後上肢機能障害患者120例を対象としたRCT。課題指向型訓練は従来のPTと比較して、FMA上肢スコアを有意に改善（平均差4.8点）。日常生活活動においてもBI改善度が高く、退院後3カ月時点での効果持続が確認された。",
    keywords: ["脳卒中", "脳梗塞", "stroke", "上肢", "片麻痺", "FIM", "BI", "FMA"],
    isOpenAccess: true,
  },
  {
    id: "3",
    title: "Pulmonary rehabilitation in COPD: a systematic review of effects on exercise capacity and quality of life",
    titleJa: "COPDにおける肺リハビリテーション：運動耐容能と生活の質への効果に関するシステマティックレビュー",
    authors: "Sato R, Kobayashi N, Fujita K, et al.",
    journal: "Respirology",
    year: 2023,
    evidenceLevel: "A",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "COPD患者を対象とした肺リハビリテーションの効果を検討した29件のRCTのメタ解析。6MWTを平均43m改善し、SGRQ総スコアを7.1点低下させた。呼吸筋トレーニングとの組み合わせで効果が増強される可能性が示された。",
    keywords: ["COPD", "肺", "呼吸", "肺リハ", "心肺", "心不全"],
    isOpenAccess: true,
  },
  {
    id: "4",
    title: "Effects of balance training on fall prevention in community-dwelling older adults: an updated meta-analysis",
    titleJa: "地域在住高齢者の転倒予防におけるバランス訓練の効果：最新メタ解析",
    authors: "Yoshida M, Kato T, Shimizu A, et al.",
    journal: "Journal of Geriatric Physical Therapy",
    year: 2021,
    evidenceLevel: "B",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "地域在住高齢者を対象としたバランス訓練の転倒予防効果を検討した19件のRCTのメタ解析。週3回以上の継続的なバランス訓練は転倒発生率を33%低下させ、Berg Balance Scale（BBS）スコアの有意な改善が認められた。",
    keywords: ["高齢者", "転倒", "バランス", "Berg", "BBS", "骨粗鬆症", "骨折"],
    isOpenAccess: false,
  },
  {
    id: "5",
    title: "Manual therapy combined with exercise for chronic low back pain: a randomized controlled trial",
    titleJa: "慢性腰痛に対する徒手療法と運動療法の併用：無作為化比較試験",
    authors: "Honda K, Matsumoto S, Ogawa T, et al.",
    journal: "Journal of Orthopaedic & Sports Physical Therapy",
    year: 2022,
    evidenceLevel: "B",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "慢性腰痛患者86例を対象としたRCT。徒手療法と運動療法の組み合わせは、運動療法単独と比較してNRSを1.8点有意に改善。腰椎可動域および機能的能力（ODI）においても優れた改善効果が示された。治療効果は12週間維持された。",
    keywords: ["腰痛", "腰部", "脊椎", "腰", "脊柱管狭窄", "椎間板", "NRS", "ROM"],
    isOpenAccess: false,
  },
  {
    id: "6",
    title: "Shoulder rehabilitation after rotator cuff repair: comparison of early versus delayed mobilization protocols",
    titleJa: "腱板修復後の肩リハビリテーション：早期対遅延可動化プロトコルの比較",
    authors: "Hayashi T, Nishimura K, Goto R, et al.",
    journal: "American Journal of Sports Medicine",
    year: 2020,
    evidenceLevel: "B",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "腱板修復後のリハビリプロトコル（早期vs遅延可動化）を比較した後ろ向きコホート研究（n=142）。早期可動化群は肩関節ROM回復が平均3週間早く、最終的な機能回復スコア（DASH）に有意差はなかった。再断裂リスクは両群で差なし。",
    keywords: ["肩", "腱板", "肩関節", "ROM", "MMT", "整形"],
    isOpenAccess: false,
  },
  {
    id: "7",
    title: "Gait training with body weight support for Parkinson's disease: effects on gait parameters and quality of life",
    titleJa: "パーキンソン病に対する免荷式歩行訓練：歩行パラメータと生活の質への効果",
    authors: "Imai Y, Sasaki H, Ueda M, et al.",
    journal: "Parkinsonism & Related Disorders",
    year: 2023,
    evidenceLevel: "B",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "パーキンソン病患者54例に対する免荷式トレッドミル訓練の効果を検討。6週間の訓練後、歩行速度が平均0.12m/s改善し、歩幅の延長および凍結歩行の頻度低下が認められた。PDQ-39（QOL指標）でも有意な改善が確認された。",
    keywords: ["パーキンソン", "神経", "歩行", "FIM", "BI"],
    isOpenAccess: true,
  },
  {
    id: "8",
    title: "Aquatic therapy for hip osteoarthritis: a systematic review of clinical outcomes",
    titleJa: "股関節変形性関節症に対する水中療法：臨床アウトカムのシステマティックレビュー",
    authors: "Fukuda A, Mori H, Aoki S, et al.",
    journal: "Clinical Rehabilitation",
    year: 2021,
    evidenceLevel: "C",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "股関節変形性関節症に対する水中療法の効果を検討した8件のRCTのシステマティックレビュー。陸上訓練と比較して疼痛・機能改善において同等の効果が示されたが、エビデンスの質に一部限界があり、長期効果についてはさらなる検討が必要である。",
    keywords: ["股関節", "THA", "変形性", "関節", "整形", "ROM", "MMT"],
    isOpenAccess: false,
  },
];

// ── Search function ───────────────────────────────────────────────────────

function searchPapers(keyword: string, filters: SearchFilters): Paper[] {
  const CURRENT_YEAR = 2024;

  let results = [...DUMMY_PAPERS];

  if (filters.evidenceLevelA) {
    results = results.filter(p => p.evidenceLevel === "A");
  }
  if (filters.recentOnly) {
    results = results.filter(p => p.year >= CURRENT_YEAR - 5);
  }

  if (!keyword.trim()) {
    // 全文無料を上位に
    return [...results].sort((a, b) => (b.isOpenAccess ? 1 : 0) - (a.isOpenAccess ? 1 : 0));
  }

  const kws = keyword.toLowerCase().split(/[\s　,，]+/).filter(Boolean);

  const scored = results
    .map(p => {
      const searchText = [
        p.title.toLowerCase(),
        p.titleJa.toLowerCase(),
        p.authors.toLowerCase(),
        p.journal.toLowerCase(),
        p.summary,
        ...p.keywords.map(k => k.toLowerCase()),
      ].join(" ");

      const score = kws.reduce((s, kw) => {
        if (p.keywords.some(k => k.toLowerCase().includes(kw))) return s + 3;
        if (p.titleJa.toLowerCase().includes(kw))               return s + 2.5;
        if (p.title.toLowerCase().includes(kw))                 return s + 2;
        if (p.summary.includes(kw))                             return s + 1;
        if (searchText.includes(kw))                            return s + 0.5;
        return s;
      }, 0);

      return { paper: p, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => {
      // 同スコアなら全文無料を優先
      if (b.score !== a.score) return b.score - a.score;
      return (b.paper.isOpenAccess ? 1 : 0) - (a.paper.isOpenAccess ? 1 : 0);
    });

  // 全文無料を上位に（スコアが同じ場合）、スコア違いはスコア優先
  const openAccess = scored.filter(r => r.paper.isOpenAccess).map(r => r.paper);
  const restricted = scored.filter(r => !r.paper.isOpenAccess).map(r => r.paper);

  // スコア上位は維持しつつ、同スコアグループ内で無料優先
  return scored.map(r => r.paper);
}

// ── English detection ─────────────────────────────────────────────────────

function isEnglish(text: string): boolean {
  const ascii = text.replace(/\s/g, "").split("").filter(c => c.charCodeAt(0) < 128).length;
  return ascii / text.replace(/\s/g, "").length > 0.8;
}

// ── Evidence level badge ──────────────────────────────────────────────────

const LEVEL_STYLE: Record<EvidenceLevel, { bg: string; text: string; label: string }> = {
  A: { bg: "#1B4332", text: "#ffffff", label: "レベルA" },
  B: { bg: "#1E40AF", text: "#ffffff", label: "レベルB" },
  C: { bg: "#6B7280", text: "#ffffff", label: "レベルC" },
  D: { bg: "#E5E7EB", text: "#6B7280", label: "レベルD" },
};

function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const s = LEVEL_STYLE[level];
  return (
    <span
      className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

// ── Open access badge ─────────────────────────────────────────────────────

function AccessBadge({ isOpenAccess }: { isOpenAccess: boolean }) {
  return isOpenAccess ? (
    <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: "#1B4332", color: "#ffffff" }}>
      全文無料
    </span>
  ) : (
    <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: "#E5E7EB", color: "#9CA3AF" }}>
      要約のみ
    </span>
  );
}

// ── Heart icon ────────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "#E85D04" : "none"} stroke={filled ? "#E85D04" : "#9CA3AF"}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4 transition-all duration-150" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ── Slide refs ────────────────────────────────────────────────────────────

const LS_KEY = "ptworks:pendingRefs";

function formatPaperRef(p: Paper): string {
  return `${p.authors} ${p.title}. ${p.journal}. ${p.year}.`;
}

function addToSlidePendingRefs(paper: Paper): void {
  const existing: string[] = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  const ref = formatPaperRef(paper);
  if (!existing.includes(ref)) {
    localStorage.setItem(LS_KEY, JSON.stringify([...existing, ref]));
  }
}

// ── Paper card ────────────────────────────────────────────────────────────

function PaperCard({ paper }: { paper: Paper }) {
  const [added,       setAdded]       = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const { isFavorited, toggleFavorite } = useFavorites();
  const favId = `literature-${paper.id}`;

  const titleIsEnglish = isEnglish(paper.title);

  function handleAddToSlides() {
    addToSlidePendingRefs(paper);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3">

        {/* バッジ行 */}
        <div className="flex items-center gap-2 mb-3">
          <AccessBadge isOpenAccess={paper.isOpenAccess} />
          <EvidenceBadge level={paper.evidenceLevel} />
          <span className="text-xs text-gray-400 ml-auto shrink-0">{paper.year}年</span>
          <button
            onClick={() => toggleFavorite({
              id:             favId,
              type:           "literature",
              title:          paper.titleJa,
              subtitle:       `${paper.authors} — ${paper.journal} ${paper.year}`,
              literatureData: {
                id:            paper.id,
                title:         paper.titleJa,
                authors:       paper.authors,
                journal:       paper.journal,
                year:          paper.year,
                evidenceLevel: paper.evidenceLevel,
                url:           paper.url,
                summary:       paper.summary,
              },
            })}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 hover:border-orange-300 transition shrink-0"
            aria-label={isFavorited(favId) ? "お気に入り解除" : "お気に入りに追加"}
          >
            <HeartIcon filled={isFavorited(favId)} />
          </button>
        </div>

        {/* タイトル */}
        {titleIsEnglish ? (
          <div className="mb-2">
            {/* 日本語タイトル（大） */}
            <p className="text-sm font-bold text-gray-900 leading-snug mb-1">{paper.titleJa}</p>
            {/* 原題（英語・小さくグレー） */}
            <p className="text-[11px] text-gray-400 leading-snug italic">{paper.title}</p>
          </div>
        ) : (
          <p className="text-sm font-bold text-gray-900 leading-snug mb-2">{paper.titleJa}</p>
        )}

        {/* 著者・雑誌 */}
        <p className="text-xs text-gray-500 mb-3">
          {paper.authors}　—　<span className="italic">{paper.journal}</span>
        </p>

        {/* AI要約 */}
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-1">
          <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wide">AI日本語要約</p>
          <p className="text-xs text-gray-700 leading-relaxed">{paper.summary}</p>
        </div>

        {/* 翻訳注意書き */}
        {titleIsEnglish && (
          <p className="text-[10px] text-gray-300 leading-relaxed mb-3 px-1">
            ※タイトル・要約はAIによる日本語訳です。原文と異なる場合があります。
          </p>
        )}

        {/* ボタン行 */}
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs font-bold py-2 rounded-xl border-2 transition hover:bg-gray-50"
            style={{ borderColor: "#1B4332", color: "#1B4332" }}
          >
            原文を見る（外部サイト）→
          </a>
          <button
            type="button"
            onClick={handleAddToSlides}
            className="flex-1 text-xs font-bold py-2 rounded-xl text-white transition hover:opacity-90"
            style={{ background: added ? "#16a34a" : "#E85D04" }}
          >
            {added ? "追加しました" : "スライドの参考文献に追加"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 参考書データ・コンポーネント
// ══════════════════════════════════════════════════════════════════════════

interface Book {
  id:         string;
  title:      string;
  authors:    string;
  publisher:  string;
  year:       number;
  price:      string;
  coverUrl:   string;
  summary:    string;
  keywords:   string[];
  category:   string;
}

type BookCategory = {
  id:    string;
  label: string;
};

const BOOK_CATEGORIES: BookCategory[] = [
  { id: "neuro",    label: "脳卒中・神経" },
  { id: "ortho",    label: "運動器・整形外科" },
  { id: "internal", label: "内部障害・循環器" },
  { id: "resp",     label: "呼吸器" },
  { id: "peds",     label: "小児リハ" },
  { id: "eval",     label: "評価・測定" },
  { id: "anatomy",  label: "解剖学・生理学" },
  { id: "exam",     label: "国家試験対策" },
];

const DUMMY_BOOKS: Book[] = [
  {
    id: "b1",
    title: "脳卒中の理学療法 第3版",
    authors: "原寛美 編著",
    publisher: "医学書院",
    year: 2021,
    price: "¥5,500",
    coverUrl: "",
    summary: "脳卒中リハビリテーションの基礎から臨床応用まで体系的に解説。評価・治療の根拠をエビデンスとともに学べる一冊。特に片麻痺患者の運動機能回復に関わるPTに必携の参考書です。",
    keywords: ["脳卒中", "片麻痺", "神経", "stroke", "脳梗塞", "脳出血"],
    category: "neuro",
  },
  {
    id: "b2",
    title: "神経系理学療法学 改訂第2版",
    authors: "奈良勲 監修",
    publisher: "メジカルビュー社",
    year: 2020,
    price: "¥6,600",
    coverUrl: "",
    summary: "神経疾患リハビリテーションの理論的背景と実践技術を網羅。パーキンソン病・脊髄損傷・多発性硬化症など幅広い疾患に対応。国試にも対応した体系的な学習に役立ちます。",
    keywords: ["神経", "パーキンソン", "脊髄損傷", "神経疾患", "脳卒中", "neuro"],
    category: "neuro",
  },
  {
    id: "b3",
    title: "整形外科理学療法の理論と技術 改訂第2版",
    authors: "山嵜勉 編著",
    publisher: "メジカルビュー社",
    year: 2019,
    price: "¥7,700",
    coverUrl: "",
    summary: "運動器疾患における評価・治療の理論的根拠を丁寧に解説。膝・股関節・肩・腰椎など主要疾患ごとに実践的アプローチを学べます。整形外科領域で働くPTの必携書です。",
    keywords: ["整形外科", "運動器", "膝", "股関節", "肩", "腰椎", "骨折"],
    category: "ortho",
  },
  {
    id: "b4",
    title: "運動器疾患の理学療法 第2版",
    authors: "松本秀男 著",
    publisher: "三輪書店",
    year: 2022,
    price: "¥5,280",
    coverUrl: "",
    summary: "変形性関節症・骨折後リハ・スポーツ障害など運動器疾患の理学療法を詳説。評価からゴール設定・退院支援まで臨床フローに沿って学べる構成になっています。",
    keywords: ["運動器", "骨折", "変形性", "関節", "靭帯", "腱", "スポーツ"],
    category: "ortho",
  },
  {
    id: "b5",
    title: "内部障害理学療法学 第4版",
    authors: "上月正博 監修",
    publisher: "医歯薬出版",
    year: 2022,
    price: "¥6,820",
    coverUrl: "",
    summary: "心疾患・慢性腎臓病・糖尿病など内部障害を持つ患者のリハビリテーション理論と実践を網羅。心臓リハやCKDリハの最新エビデンスに基づいた解説が充実しています。",
    keywords: ["内部障害", "心臓", "心不全", "循環器", "糖尿病", "腎臓", "cardiac"],
    category: "internal",
  },
  {
    id: "b6",
    title: "呼吸リハビリテーション 実践テキスト",
    authors: "日本呼吸ケア・リハビリテーション学会 監修",
    publisher: "南江堂",
    year: 2021,
    price: "¥5,940",
    coverUrl: "",
    summary: "COPD・間質性肺疾患・慢性呼吸不全など呼吸器疾患のリハビリ手技を実践的に解説。コンディショニングから栄養・ADL指導まで包括的に学べる構成です。",
    keywords: ["呼吸", "COPD", "肺", "呼吸器", "respiratory", "在宅酸素"],
    category: "resp",
  },
  {
    id: "b7",
    title: "小児理学療法学テキスト 改訂第3版",
    authors: "加藤寿宏 編著",
    publisher: "南江堂",
    year: 2020,
    price: "¥6,380",
    coverUrl: "",
    summary: "脳性麻痺・発達障害・二分脊椎など小児疾患のリハビリを体系的に解説。発達段階に応じた評価・介入方法を豊富なイラストでわかりやすく説明しています。",
    keywords: ["小児", "脳性麻痺", "発達", "子ども", "pediatrics", "二分脊椎"],
    category: "peds",
  },
  {
    id: "b8",
    title: "理学療法評価学 第4版",
    authors: "奈良勲 監修",
    publisher: "医歯薬出版",
    year: 2022,
    price: "¥5,500",
    coverUrl: "",
    summary: "MMT・ROM・FIM・BBS・10m歩行など臨床でよく使う評価スケールを網羅。評価の目的・手順・判定基準・信頼性・妥当性を丁寧に解説しています。",
    keywords: ["評価", "MMT", "ROM", "FIM", "BBS", "測定", "スケール"],
    category: "eval",
  },
  {
    id: "b9",
    title: "解剖学 第23版（系統看護学講座）",
    authors: "藤田恒夫 著",
    publisher: "医学書院",
    year: 2022,
    price: "¥4,400",
    coverUrl: "",
    summary: "PTの臨床に必要な解剖学の知識をコンパクトにまとめた定番教科書。骨・筋・神経・循環器など各系統の解剖をイラストと写真で視覚的に学べます。",
    keywords: ["解剖", "骨", "筋", "神経", "解剖学", "anatomy"],
    category: "anatomy",
  },
  {
    id: "b10",
    title: "PT・OT国家試験 必修ポイント",
    authors: "羊土社 編集",
    publisher: "羊土社",
    year: 2023,
    price: "¥3,960",
    coverUrl: "",
    summary: "理学療法士・作業療法士国家試験の頻出ポイントを効率よく学べる問題集。過去問の傾向分析をもとに重要項目を厳選し、短時間での合格力養成をサポートします。",
    keywords: ["国家試験", "国試", "PT", "OT", "試験", "問題集"],
    category: "exam",
  },
];

function buildRakutenUrl(title: string): string {
  const affiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID ?? "RAKUTEN_AFFILIATE_ID_HERE";
  const searchUrl = `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent(title)}`;
  return `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encodeURIComponent(searchUrl)}`;
}

function searchBooks(keyword: string, categoryId: string | null): Book[] {
  let results = [...DUMMY_BOOKS];

  if (categoryId) {
    results = results.filter(b => b.category === categoryId);
  }

  if (!keyword.trim()) return results;

  const kws = keyword.toLowerCase().split(/[\s　,，]+/).filter(Boolean);

  return results
    .map(b => {
      const text = [b.title, b.authors, b.publisher, b.summary, ...b.keywords].join(" ").toLowerCase();
      const score = kws.reduce((s, kw) => {
        if (b.keywords.some(k => k.toLowerCase().includes(kw))) return s + 3;
        if (b.title.toLowerCase().includes(kw))                 return s + 2;
        if (text.includes(kw))                                  return s + 1;
        return s;
      }, 0);
      return { book: b, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.book);
}

// ── Book card ─────────────────────────────────────────────────────────────

function BookCard({ book }: { book: Book }) {
  const { isFavorited, toggleFavorite } = useFavorites();
  const favId       = `book-${book.id}`;
  const rakutenUrl  = buildRakutenUrl(book.title);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 flex gap-4">
        {/* 表紙プレースホルダー */}
        <div className="shrink-0 w-16 h-24 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <svg viewBox="0 0 48 64" fill="none" className="w-8 h-10 text-gray-300" aria-hidden="true">
              <rect x="2" y="2" width="44" height="60" rx="3" stroke="currentColor" strokeWidth="2"/>
              <line x1="8" y1="18" x2="40" y2="18" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="8" y1="26" x2="40" y2="26" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="8" y1="34" x2="30" y2="34" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          )}
        </div>

        {/* 書籍情報 */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* タイトル行 */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-900 leading-snug flex-1">{book.title}</p>
            <button
              onClick={() => toggleFavorite({
                id:       favId,
                type:     "book",
                title:    book.title,
                subtitle: `${book.authors}　${book.publisher}`,
                bookData: {
                  id:         book.id,
                  title:      book.title,
                  authors:    book.authors,
                  publisher:  book.publisher,
                  year:       book.year,
                  price:      book.price,
                  coverUrl:   book.coverUrl,
                  summary:    book.summary,
                  rakutenUrl,
                  category:   book.category,
                },
              })}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 hover:border-orange-300 transition"
              aria-label={isFavorited(favId) ? "お気に入り解除" : "お気に入りに追加"}
            >
              <HeartIcon filled={isFavorited(favId)} />
            </button>
          </div>

          {/* メタ情報 */}
          <p className="text-xs text-gray-500">
            {book.authors}　/　{book.publisher}　/　{book.year}年
          </p>

          {/* 価格 */}
          <p className="text-sm font-black" style={{ color: "#E85D04" }}>{book.price}</p>

          {/* AIまとめ */}
          <div className="bg-gray-50 rounded-xl px-3 py-2 mt-1">
            <p className="text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wide">この本のポイント</p>
            <p className="text-xs text-gray-700 leading-relaxed">{book.summary}</p>
          </div>

          {/* 楽天購入ボタン */}
          <a
            href={rakutenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-black py-2 px-4 rounded-xl text-white transition hover:opacity-90 mt-1"
            style={{ background: "#BF0000" }}
          >
            楽天で購入する →
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Book search tab ───────────────────────────────────────────────────────

function BookSearchTab() {
  const [keyword,     setKeyword]     = useState("");
  const [query,       setQuery]       = useState("");
  const [searched,    setSearched]    = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const results = useCallback(() => {
    if (!searched && !activeCategory) return [];
    return searchBooks(query, activeCategory);
  }, [query, activeCategory, searched])();

  function handleSearch() {
    setQuery(keyword);
    setSearched(true);
  }

  function handleCategory(id: string) {
    const next = activeCategory === id ? null : id;
    setActiveCategory(next);
    setQuery(keyword);
    setSearched(true);
  }

  return (
    <div className="space-y-5">

      {/* 検索エリア */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="書籍名・著者名・キーワードで検索（例：脳卒中リハビリ）"
            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder-gray-300"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="px-5 py-2.5 text-sm font-bold text-white rounded-xl transition hover:opacity-90 shrink-0"
            style={{ background: "#E85D04" }}
          >
            検索
          </button>
        </div>

        {/* カテゴリボタン */}
        <div className="flex flex-wrap gap-2">
          {BOOK_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategory(cat.id)}
              className="text-xs font-bold px-3 py-1.5 rounded-full border transition"
              style={
                activeCategory === cat.id
                  ? { background: "#1B4332", color: "#fff", borderColor: "#1B4332" }
                  : { background: "#fff", color: "#374151", borderColor: "#D1D5DB" }
              }
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 検索結果 */}
      {!searched && !activeCategory ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm font-medium">カテゴリを選ぶか、キーワードを入力してください</p>
          <p className="text-xs mt-2 text-gray-300">書籍名・著者名・分野などで検索できます</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm font-medium">
            {query ? `「${query}」に一致する書籍が見つかりませんでした` : "該当する書籍が見つかりませんでした"}
          </p>
          <p className="text-xs mt-2 text-gray-300">別のキーワードやカテゴリで検索してみてください</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-800">{results.length}冊</span> の参考書が見つかりました
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {results.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </>
      )}

      {/* 注意事項 */}
      <p className="text-xs text-gray-400 text-center pb-2 leading-relaxed">
        ※価格は変動する場合があります。購入前に楽天ブックスにてご確認ください。<br />
        ※PT Worksは楽天アフィリエイトプログラムに参加しています。
      </p>
    </div>
  );
}

// ── Main inner component ──────────────────────────────────────────────────

type PageTab = "papers" | "books";

function LiteratureSearchInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [pageTab,  setPageTab]  = useState<PageTab>("papers");
  const [keyword,  setKeyword]  = useState(initialQ);
  const [query,    setQuery]    = useState(initialQ);
  const [searched, setSearched] = useState(false);
  const [filters,  setFilters]  = useState<SearchFilters>({
    evidenceLevelA: false,
    recentOnly:     false,
  });

  const results = useCallback(() => {
    if (!searched && !initialQ) return [];
    return searchPapers(query, filters);
  }, [query, filters, searched, initialQ])();

  useEffect(() => {
    if (initialQ) {
      setQuery(initialQ);
      setSearched(true);
    }
  }, [initialQ]);

  function handleSearch() {
    setQuery(keyword);
    setSearched(true);
  }

  const openCount = results.filter(p => p.isOpenAccess).length;
  const paidCount = results.filter(p => !p.isOpenAccess).length;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">

      {/* ── ヘッダー ── */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/stage1" className="text-gray-400 hover:text-gray-600 transition text-lg">←</Link>
        <div>
          <h1 className="text-xl font-black text-gray-900">文献・参考書検索</h1>
          <p className="text-xs text-gray-500 mt-0.5">理学療法・リハビリテーション関連の文献・書籍を検索</p>
        </div>
      </div>

      {/* ── タブ ── */}
      <div className="flex bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">
        {([
          { id: "papers" as PageTab, label: "論文検索" },
          { id: "books"  as PageTab, label: "参考書検索" },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setPageTab(tab.id)}
            className={`flex-1 py-3.5 text-sm font-black transition ${
              pageTab === tab.id ? "text-white" : "text-gray-500 hover:text-gray-700"
            }`}
            style={pageTab === tab.id ? { background: "#1B4332" } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 論文検索タブ ── */}
      {pageTab === "papers" && (
        <>
          <div className="mb-5 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-700">
            現在はサンプルデータを表示しています。今後、PubMed APIとの連携により実際の文献を検索できるようになります。
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="疾患名・治療法・キーワードで検索（例：変形性膝関節症）"
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder-gray-300"
              />
              <button type="button" onClick={handleSearch}
                className="px-5 py-2.5 text-sm font-bold text-white rounded-xl transition hover:opacity-90 shrink-0"
                style={{ background: "#E85D04" }}>
                検索
              </button>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.evidenceLevelA}
                  onChange={e => { setFilters(f => ({ ...f, evidenceLevelA: e.target.checked })); if (searched) setQuery(keyword); }}
                  className="accent-[#1B4332] w-4 h-4" />
                <span className="text-sm text-gray-700">エビデンスレベルA以上のみ</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.recentOnly}
                  onChange={e => { setFilters(f => ({ ...f, recentOnly: e.target.checked })); if (searched) setQuery(keyword); }}
                  className="accent-[#1B4332] w-4 h-4" />
                <span className="text-sm text-gray-700">過去5年以内の文献のみ</span>
              </label>
            </div>
          </div>

          {!searched && !initialQ ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm font-medium">キーワードを入力して検索してください</p>
              <p className="text-xs mt-2 text-gray-300">疾患名、治療法、評価方法などで検索できます</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm font-medium">「{query}」に一致する文献が見つかりませんでした</p>
              <p className="text-xs mt-2 text-gray-300">別のキーワードで検索してみてください</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-sm text-gray-500">
                  <span className="font-bold text-gray-800">{results.length}件</span> の文献が見つかりました
                </p>
                <div className="flex items-center gap-3">
                  {openCount > 0 && (
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
                      <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: "#1B4332", color: "#fff" }}>全文無料</span>
                      {openCount}件
                    </span>
                  )}
                  {paidCount > 0 && (
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: "#E5E7EB", color: "#9CA3AF" }}>要約のみ</span>
                      {paidCount}件
                    </span>
                  )}
                  <div className="flex gap-1.5">
                    {["A", "B", "C"].map(lv => (
                      <span key={lv} className="flex items-center gap-1 text-[10px]">
                        <span className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ background: LEVEL_STYLE[lv as EvidenceLevel].bg }} />
                        Lv.{lv}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {results.map(paper => <PaperCard key={paper.id} paper={paper} />)}
              </div>
              <p className="text-xs text-gray-400 text-center mt-6 pb-2">
                ※ 現在はサンプルデータです。「スライドの参考文献に追加」を押すと、スライド生成ページの参考文献欄に反映されます。
              </p>
            </>
          )}
        </>
      )}

      {/* ── 参考書検索タブ ── */}
      {pageTab === "books" && <BookSearchTab />}
    </main>
  );
}

// ── Page with Suspense ────────────────────────────────────────────────────

export default function LiteraturePage() {
  return (
    <Suspense fallback={
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/stage1" className="text-gray-400 hover:text-gray-600 transition text-lg">←</Link>
          <h1 className="text-xl font-black text-gray-900">文献検索</h1>
        </div>
        <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
      </main>
    }>
      <LiteratureSearchInner />
    </Suspense>
  );
}
