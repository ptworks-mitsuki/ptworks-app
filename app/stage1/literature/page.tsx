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

// ── Main inner component ──────────────────────────────────────────────────

function LiteratureSearchInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

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

  // 全文無料と要約のみの件数
  const openCount  = results.filter(p => p.isOpenAccess).length;
  const paidCount  = results.filter(p => !p.isOpenAccess).length;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">

      {/* ── ヘッダー ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/stage1" className="text-gray-400 hover:text-gray-600 transition text-lg">←</Link>
        <div>
          <h1 className="text-xl font-black text-gray-900">文献検索</h1>
          <p className="text-xs text-gray-500 mt-0.5">理学療法・リハビリテーション関連の文献を検索</p>
        </div>
      </div>

      {/* 注記バナー */}
      <div className="mb-5 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-700">
        現在はサンプルデータを表示しています。今後、PubMed APIとの連携により実際の文献を検索できるようになります。
      </div>

      {/* ── 検索エリア ── */}
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
          <button
            type="button"
            onClick={handleSearch}
            className="px-5 py-2.5 text-sm font-bold text-white rounded-xl transition hover:opacity-90 shrink-0"
            style={{ background: "#E85D04" }}
          >
            検索
          </button>
        </div>

        {/* 絞り込み */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.evidenceLevelA}
              onChange={e => {
                setFilters(f => ({ ...f, evidenceLevelA: e.target.checked }));
                if (searched) setQuery(keyword);
              }}
              className="accent-[#1B4332] w-4 h-4"
            />
            <span className="text-sm text-gray-700">エビデンスレベルA以上のみ</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.recentOnly}
              onChange={e => {
                setFilters(f => ({ ...f, recentOnly: e.target.checked }));
                if (searched) setQuery(keyword);
              }}
              className="accent-[#1B4332] w-4 h-4"
            />
            <span className="text-sm text-gray-700">過去5年以内の文献のみ</span>
          </label>
        </div>
      </div>

      {/* ── 検索結果 ── */}
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
          {/* 件数・バッジ凡例 */}
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
            {results.map(paper => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center mt-6 pb-2">
            ※ 現在はサンプルデータです。「スライドの参考文献に追加」を押すと、スライド生成ページの参考文献欄に反映されます。
          </p>
        </>
      )}
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
