"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────

type EvidenceLevel = "A" | "B" | "C" | "D";

interface Paper {
  id:            string;
  title:         string;
  authors:       string;
  journal:       string;
  year:          number;
  evidenceLevel: EvidenceLevel;
  url:           string;
  summary:       string;
  keywords:      string[];
}

interface SearchFilters {
  evidenceLevelA: boolean;
  recentOnly:     boolean;
}

// ── Dummy paper database ─────────────────────────────────────────────────
// TODO: Replace with real PubMed API call in searchPapers()

const DUMMY_PAPERS: Paper[] = [
  {
    id: "1",
    title: "Exercise therapy for knee osteoarthritis: a systematic review and meta-analysis of randomized controlled trials",
    authors: "Tanaka K, Yamamoto T, Suzuki M, et al.",
    journal: "Physical Therapy",
    year: 2023,
    evidenceLevel: "A",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "変形性膝関節症患者2,156例を対象とした24件のRCTを統合解析。運動療法（有酸素運動＋筋力強化）はVASスコアを平均2.4点改善し、WOMAC機能スコアを統計的有意に向上させた（p<0.001）。特に低負荷高反復の大腿四頭筋強化訓練との組み合わせが最も効果的であることが示された。",
    keywords: ["膝", "変形性膝関節症", "knee", "osteoarthritis", "運動療法", "RCT"],
  },
  {
    id: "2",
    title: "Task-oriented training versus traditional physiotherapy for stroke patients: effects on upper limb function and activities of daily living",
    authors: "Nakamura H, Ito S, Watanabe Y, et al.",
    journal: "Neurorehabilitation and Neural Repair",
    year: 2022,
    evidenceLevel: "A",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "脳卒中後上肢機能障害患者120例を対象としたRCT。課題指向型訓練は従来のPTと比較して、FMA上肢スコアを有意に改善（平均差4.8点）。日常生活活動においてもBI改善度が高く、退院後3カ月時点での効果持続が確認された。",
    keywords: ["脳卒中", "脳梗塞", "stroke", "上肢", "片麻痺", "FIM", "BI", "FMA"],
  },
  {
    id: "3",
    title: "Pulmonary rehabilitation in COPD: a systematic review of effects on exercise capacity and quality of life",
    authors: "Sato R, Kobayashi N, Fujita K, et al.",
    journal: "Respirology",
    year: 2023,
    evidenceLevel: "A",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "COPD患者を対象とした肺リハビリテーションの効果を検討した29件のRCTのメタ解析。6MWTを平均43m改善し、SGRQ総スコアを7.1点低下させた。呼吸筋トレーニングとの組み合わせで効果が増強される可能性が示された。",
    keywords: ["COPD", "肺", "呼吸", "肺リハ", "心肺", "心不全"],
  },
  {
    id: "4",
    title: "Effects of balance training on fall prevention in community-dwelling older adults: an updated meta-analysis",
    authors: "Yoshida M, Kato T, Shimizu A, et al.",
    journal: "Journal of Geriatric Physical Therapy",
    year: 2021,
    evidenceLevel: "B",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "地域在住高齢者を対象としたバランス訓練の転倒予防効果を検討した19件のRCTのメタ解析。週3回以上の継続的なバランス訓練は転倒発生率を33%低下させ、Berg Balance Scale（BBS）スコアの有意な改善が認められた。",
    keywords: ["高齢者", "転倒", "バランス", "Berg", "BBS", "骨粗鬆症", "骨折"],
  },
  {
    id: "5",
    title: "Manual therapy combined with exercise for chronic low back pain: a randomized controlled trial",
    authors: "Honda K, Matsumoto S, Ogawa T, et al.",
    journal: "Journal of Orthopaedic & Sports Physical Therapy",
    year: 2022,
    evidenceLevel: "B",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "慢性腰痛患者86例を対象としたRCT。徒手療法と運動療法の組み合わせは、運動療法単独と比較してNRSを1.8点有意に改善。腰椎可動域および機能的能力（ODI）においても優れた改善効果が示された。治療効果は12週間維持された。",
    keywords: ["腰痛", "腰部", "脊椎", "腰", "脊柱管狭窄", "椎間板", "NRS", "ROM"],
  },
  {
    id: "6",
    title: "Shoulder rehabilitation after rotator cuff repair: comparison of early versus delayed mobilization protocols",
    authors: "Hayashi T, Nishimura K, Goto R, et al.",
    journal: "American Journal of Sports Medicine",
    year: 2020,
    evidenceLevel: "B",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "腱板修復後のリハビリプロトコル（早期vs遅延可動化）を比較した後ろ向きコホート研究（n=142）。早期可動化群は肩関節ROM回復が平均3週間早く、最終的な機能回復スコア（DASH）に有意差はなかった。再断裂リスクは両群で差なし。",
    keywords: ["肩", "腱板", "肩関節", "ROM", "MMT", "整形"],
  },
  {
    id: "7",
    title: "Gait training with body weight support for Parkinson's disease: effects on gait parameters and quality of life",
    authors: "Imai Y, Sasaki H, Ueda M, et al.",
    journal: "Parkinsonism & Related Disorders",
    year: 2023,
    evidenceLevel: "B",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "パーキンソン病患者54例に対する免荷式トレッドミル訓練の効果を検討。6週間の訓練後、歩行速度が平均0.12m/s改善し、歩幅の延長および凍結歩行の頻度低下が認められた。PDQ-39（QOL指標）でも有意な改善が確認された。",
    keywords: ["パーキンソン", "神経", "歩行", "FIM", "BI"],
  },
  {
    id: "8",
    title: "Aquatic therapy for hip osteoarthritis: a systematic review of clinical outcomes",
    authors: "Fukuda A, Mori H, Aoki S, et al.",
    journal: "Clinical Rehabilitation",
    year: 2021,
    evidenceLevel: "C",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary: "股関節変形性関節症に対する水中療法の効果を検討した8件のRCTのシステマティックレビュー。陸上訓練と比較して疼痛・機能改善において同等の効果が示されたが、エビデンスの質に一部限界があり、長期効果についてはさらなる検討が必要である。",
    keywords: ["股関節", "THA", "変形性", "関節", "整形", "ROM", "MMT"],
  },
];

// ── Search function（ここをAPI切り替えポイントにする） ────────────────────
// 将来的には: async function searchPapers(keyword, filters) → fetch("/api/pubmed?q=keyword")

function searchPapers(keyword: string, filters: SearchFilters): Paper[] {
  const CURRENT_YEAR = 2024;

  let results = [...DUMMY_PAPERS];

  // フィルター適用
  if (filters.evidenceLevelA) {
    results = results.filter(p => p.evidenceLevel === "A");
  }
  if (filters.recentOnly) {
    results = results.filter(p => p.year >= CURRENT_YEAR - 5);
  }

  // キーワード検索（空の場合は全件表示）
  if (!keyword.trim()) return results;

  const kws = keyword.toLowerCase().split(/[\s　,，]+/).filter(Boolean);

  return results
    .map(p => {
      const searchText = [
        p.title.toLowerCase(),
        p.authors.toLowerCase(),
        p.journal.toLowerCase(),
        p.summary,
        ...p.keywords.map(k => k.toLowerCase()),
      ].join(" ");

      const score = kws.reduce((s, kw) => {
        if (p.keywords.some(k => k.toLowerCase().includes(kw))) return s + 3;
        if (p.title.toLowerCase().includes(kw))  return s + 2;
        if (p.summary.includes(kw))              return s + 1;
        if (searchText.includes(kw))             return s + 0.5;
        return s;
      }, 0);

      return { paper: p, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.paper);
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

// ── Add to localStorage ───────────────────────────────────────────────────

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
  const [added, setAdded] = useState(false);

  function handleAddToSlides() {
    addToSlidePendingRefs(paper);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        {/* ヘッダー行 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <EvidenceBadge level={paper.evidenceLevel} />
          <span className="text-xs text-gray-400 shrink-0">{paper.year}年</span>
        </div>

        {/* タイトル */}
        <p className="text-sm font-bold text-gray-900 leading-snug mb-2">{paper.title}</p>

        {/* 著者・雑誌 */}
        <p className="text-xs text-gray-500 mb-3">
          {paper.authors} — <span className="italic">{paper.journal}</span>
        </p>

        {/* AI要約 */}
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
          <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wide">AI要約</p>
          <p className="text-xs text-gray-700 leading-relaxed">{paper.summary}</p>
        </div>

        {/* ボタン行 */}
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs font-bold py-2 rounded-xl border-2 transition hover:bg-gray-50"
            style={{ borderColor: "#1B4332", color: "#1B4332" }}
          >
            原文を見る →
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

// ── Main inner component (uses useSearchParams) ───────────────────────────

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

  // 初期キーワードがあれば自動検索
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-gray-800">{results.length}件</span> の文献が見つかりました
            </p>
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

// ── Page with Suspense (required for useSearchParams in Next.js App Router) ─

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
