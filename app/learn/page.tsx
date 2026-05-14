"use client";

import { useState } from "react";
import Link from "next/link";
import { useStudyProgress } from "@/hooks/useStudyProgress";

// ── Paper data ────────────────────────────────────────────────────────────

interface Paper {
  id:         string;
  title:      string;
  authors:    string;
  journal:    string;
  year:       number;
  doi?:       string;
  pubmedId?:  string;
  summary:    string;           // short preview
  fullSummary: string;          // expanded 3-5 sentences
  clinicalPoints: string[];     // 臨床応用ポイント
  tags:       string[];
  isNew:      boolean;
}

const FEATURED_PAPERS: Paper[] = [
  {
    id: "p1",
    title: "Exercise therapy for knee osteoarthritis: a systematic review and meta-analysis",
    authors: "Tanaka Y, Suzuki K, Yamamoto A, et al.",
    journal: "Physical Therapy Science",
    year: 2025,
    pubmedId: "12345678",
    doi: "10.1093/ptj/pxaf001",
    summary: "変形性膝関節症患者への有酸素運動と筋力強化訓練の組み合わせが疼痛と機能改善に最も効果的であることが示された。",
    fullSummary: "本メタアナリシスでは変形性膝関節症患者23試験・2,847名を対象に、運動療法の効果を検討した。有酸素運動単独、筋力強化単独、両者の組み合わせを比較した結果、組み合わせ群が疼痛スコア（VAS）の有意な改善を示した（SMD -0.72, 95%CI -0.91 to -0.53）。機能改善においても組み合わせ群が最も効果的であり（SMD -0.68）、週3回以上の頻度での実施が推奨された。副作用は軽微であり、運動療法の安全性も確認された。",
    clinicalPoints: [
      "有酸素運動＋筋力強化の組み合わせが最も効果的（週3回以上推奨）",
      "大腿四頭筋・ハムストリングスの筋力強化を優先的に実施",
      "疼痛が強い時期は水中運動など低負荷から開始する",
      "患者教育として「動かすことの重要性」を繰り返し説明することが継続率向上に有効",
    ],
    tags: ["膝関節", "運動療法", "メタアナリシス"],
    isNew: true,
  },
  {
    id: "p2",
    title: "Treadmill training with body weight support for stroke rehabilitation: an RCT",
    authors: "Sato H, Nakamura T, Fujita M, et al.",
    journal: "Stroke Rehabilitation",
    year: 2025,
    pubmedId: "23456789",
    doi: "10.1080/10749357.2025.001",
    summary: "BWSTTを用いたトレッドミル訓練が歩行速度・歩行距離の改善に有意な効果を示した。特に発症後3〜6ヶ月の症例で効果が高い。",
    fullSummary: "本RCTでは脳卒中後歩行障害患者86名（発症後1〜12ヶ月）を対象に、体重免荷トレッドミル訓練（BWSTT）群と通常歩行訓練群を比較した。BWSTT群では6分間歩行距離（+47.3m）と快適歩行速度（+0.19m/s）が有意に改善した（p<0.05）。サブグループ解析では発症後3〜6ヶ月の急性回復期患者で最も大きな効果が認められた。訓練強度は最大心拍数の60〜70%での実施が推奨される。",
    clinicalPoints: [
      "発症後3〜6ヶ月の患者に特に効果的（急性回復期での早期導入を推奨）",
      "体重免荷量は初期30〜40%から開始し、段階的に減少させる",
      "歩行速度0.4m/s以下の患者から優先的に適応を検討",
      "週4〜5回の高頻度実施が最大の効果をもたらす",
    ],
    tags: ["脳卒中", "歩行", "トレッドミル"],
    isNew: true,
  },
  {
    id: "p3",
    title: "Long-term effects of CBT-combined rehabilitation for chronic low back pain",
    authors: "Yamamoto S, Ito K, Kobayashi R, et al.",
    journal: "Journal of Orthopaedic & Sports Physical Therapy",
    year: 2024,
    pubmedId: "34567890",
    doi: "10.2519/jospt.2024.0001",
    summary: "通常の理学療法に認知行動療法を加えることで、慢性腰痛患者の再発率が有意に低下した。",
    fullSummary: "慢性腰痛患者124名を対象に、通常のリハビリテーションに認知行動療法（CBT）を併用した群と通常群の2年間追跡調査を実施した。CBT併用群では12ヶ月後の再発率が32%低下し（HR 0.68, 95%CI 0.51-0.89）、職場復帰率も有意に高かった。疼痛破局化スコアとキネシオフォビアスコアの改善が再発予防と関連していた。介入は週1回45分・全8セッションが標準的プロトコルとして用いられた。",
    clinicalPoints: [
      "疼痛恐怖回避行動の評価（TSK・PCS）を定期的に実施する",
      "「動いても大丈夫」というメッセージを反復的に伝えることが重要",
      "疼痛の有無に関わらず活動量を維持するよう指導する",
      "睡眠・ストレス・心理社会的因子も評価対象に含める",
    ],
    tags: ["腰痛", "認知行動療法", "慢性疼痛"],
    isNew: false,
  },
  {
    id: "p4",
    title: "Multifactorial fall prevention programs in older adults: meta-analysis of 42 RCTs",
    authors: "Matsuda K, Ogawa N, Hashimoto Y, et al.",
    journal: "Age and Ageing",
    year: 2024,
    pubmedId: "45678901",
    doi: "10.1093/ageing/afad001",
    summary: "バランス訓練・筋力強化・歩行訓練を含む多因子的プログラムが転倒率を35%低下させた。",
    fullSummary: "65歳以上の地域在住高齢者を対象としたRCT 42件・総計12,541名のメタアナリシス。バランス訓練・筋力強化・歩行訓練を含む多因子的プログラムが転倒率を35%低下させた（RR 0.65, 95%CI 0.58-0.73）。週2回以上・12週以上の継続実施が効果に必要な用量として示された。太極拳・ヨガ等の東洋的運動も有効性が確認された。環境改善との組み合わせがさらなる効果をもたらす。",
    clinicalPoints: [
      "週2回以上・12週以上の継続が必要最低限の用量",
      "バランス課題は漸進的に難易度を上げる（タンデム歩行→片脚立位→不安定面）",
      "筋力評価（5回立ち座りテスト・握力）を定期的に実施して進捗を可視化",
      "家庭での転倒リスク評価と環境改善指導を組み合わせる",
    ],
    tags: ["高齢者", "転倒予防", "バランス"],
    isNew: false,
  },
];

// ── Paper Modal ───────────────────────────────────────────────────────────

function PaperModal({ paper, onClose }: { paper: Paper; onClose: () => void }) {
  const [copied, setCopied] = useState<"title" | "url" | null>(null);

  const pubmedUrl = paper.pubmedId
    ? `https://pubmed.ncbi.nlm.nih.gov/${paper.pubmedId}/`
    : `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(paper.title)}`;

  const copyText = async (text: string, type: "title" | "url") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* fallback */ }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-modalIn">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">論文詳細</span>
            {paper.isNew && (
              <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: "#E85D04" }}>NEW</span>
            )}
          </div>
          <button onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition text-lg">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">

          {/* Title */}
          <h2 className="text-base font-black text-gray-900 leading-snug mb-3">{paper.title}</h2>

          {/* Meta */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 space-y-1">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <span className="text-gray-400 shrink-0 mt-0.5">👤</span>
              <span className="leading-snug">{paper.authors}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="text-gray-400 shrink-0">📖</span>
              <span>{paper.journal}</span>
              <span className="text-gray-400">·</span>
              <span>{paper.year}年</span>
            </div>
            {paper.doi && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="text-gray-400 shrink-0">🔗</span>
                <span className="font-mono text-[11px]">DOI: {paper.doi}</span>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
              <span>📄</span> 論文の要約
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              {paper.fullSummary}
            </p>
          </div>

          {/* Clinical points */}
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
              <span>💡</span> 臨床への応用ポイント
            </h3>
            <ul className="space-y-2">
              {paper.clinicalPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2.5 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5">
                  <span className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "#E85D04" }}>{i + 1}</span>
                  <span className="text-xs text-gray-700 leading-relaxed">{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {paper.tags.map(t => (
              <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                #{t}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => copyText(paper.title, "title")}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              {copied === "title" ? <><span className="text-green-500">✓</span> コピーしました</> : <><span>📋</span> タイトルをコピー</>}
            </button>
            <button
              onClick={() => copyText(pubmedUrl, "url")}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              {copied === "url" ? <><span className="text-green-500">✓</span> コピーしました</> : <><span>🔗</span> URLをコピー</>}
            </button>
            <a
              href={pubmedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
              style={{ background: "#2563EB" }}
            >
              <span>🔬</span> PubMedで開く
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Other mock data ───────────────────────────────────────────────────────

const COLUMNS = [
  { id: "c1", title: "臨床でよく使う疼痛評価スケールまとめ", category: "評価・測定", date: "2025-05-10", readTime: 5, preview: "VAS、NRS、FPS...疼痛スケールは多種多様。どの場面でどれを使うべきか、根拠とともに整理しました。", icon: "📊" },
  { id: "c2", title: "PT副業のはじめ方：最初の1歩を踏み出すために", category: "キャリア", date: "2025-05-07", readTime: 8, preview: "「副業したい」と思いつつ踏み出せていないPTのための実践ガイド。実際に副業を始めた先輩PTの話を交えて解説。", icon: "💼" },
  { id: "c3", title: "AIを使った患者説明書の作り方", category: "AI活用", date: "2025-05-03", readTime: 6, preview: "ChatGPT・Claude等のAIを使って、患者にわかりやすい自主トレ指導書や説明資料を素早く作成する方法を紹介。", icon: "🤖" },
  { id: "c4", title: "整体院開業で失敗しないための7つのチェックポイント", category: "開業・独立", date: "2025-04-28", readTime: 10, preview: "毎年多くの整体院が開業し、半数以上が3年以内に閉院します。失敗パターンを分析し、成功のポイントを整理しました。", icon: "🏢" },
];

const EVIDENCE_UPDATES = [
  { disease: "変形性膝関節症",      date: "2025-05-11", type: "ガイドライン更新", badge: "updated" },
  { disease: "肩関節周囲炎",        date: "2025-05-09", type: "新規エビデンス",   badge: "new"     },
  { disease: "腰椎椎間板ヘルニア",  date: "2025-05-06", type: "推奨度変更",       badge: "updated" },
  { disease: "脳卒中後リハビリ",    date: "2025-05-01", type: "新規エビデンス",   badge: "new"     },
  { disease: "大腿骨頸部骨折",      date: "2025-04-28", type: "ガイドライン更新", badge: "updated" },
];

// ── BulletinBoard ─────────────────────────────────────────────────────────

interface Post {
  id: string; author: string; content: string; tags: string[]; likes: number; date: string;
}

const INITIAL_POSTS: Post[] = [
  { id: "1", author: "田中 PT", content: "変形性膝関節症の患者で、大腿四頭筋のMMTが3でなかなか改善しない方がいます。皆さんはどんな工夫をしていますか？", tags: ["膝関節", "筋力強化"], likes: 7, date: "2025-05-12" },
  { id: "2", author: "佐藤 PT", content: "脳卒中の歩行訓練でCIセラピーを取り入れてみました。最初は嫌がっていた患者さんも慣れてきたら自発的に練習してくれるように。やっぱり動機付けが大事ですね。", tags: ["脳卒中", "歩行"], likes: 12, date: "2025-05-10" },
  { id: "3", author: "山本 PT", content: "PT WorksのAI検索で症例発表準備をしました。スライド生成も使ったら10分で下書きが完成！細かい修正はしましたが大幅に時短できました。", tags: ["PT Works", "効率化"], likes: 19, date: "2025-05-08" },
];

function BulletinBoard() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [content, setContent] = useState("");
  const [filter, setFilter] = useState("すべて");

  const TAGS = ["すべて", "膝関節", "脳卒中", "腰痛", "高齢者", "歩行", "筋力強化", "PT Works", "効率化"];
  const filtered = filter === "すべて" ? posts : posts.filter(p => p.tags.includes(filter));

  function addPost() {
    if (!content.trim()) return;
    const p: Post = { id: String(Date.now()), author: "あなた", content: content.trim(), tags: [], likes: 0, date: new Date().toISOString().slice(0, 10) };
    setPosts(prev => [p, ...prev]);
    setContent("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TAGS.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === t ? "text-white shadow-sm" : "text-gray-500 bg-gray-100 hover:bg-gray-200"
            }`}
            style={filter === t ? { background: "#E85D04" } : {}}>
            {t}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="臨床での気づき・質問・情報共有を投稿..." rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none placeholder-gray-300" />
        <div className="flex justify-end mt-2">
          <button onClick={addPost} className="px-4 py-1.5 rounded-lg text-white text-xs font-bold transition hover:opacity-90" style={{ background: "#E85D04" }}>
            投稿する
          </button>
        </div>
      </div>
      {filtered.map(post => (
        <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-[#E85D04]">{post.author.slice(0, 1)}</div>
            <span className="text-sm font-semibold text-gray-900">{post.author}</span>
            <span className="text-xs text-gray-400 ml-auto">{post.date}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mb-2">{post.content}</p>
          <div className="flex items-center gap-2">
            {post.tags.map(t => <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{t}</span>)}
            <button onClick={() => setPosts(prev => prev.map(p => p.id === post.id ? {...p, likes: p.likes + 1} : p))}
              className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-[#E85D04] transition">
              ♥ {post.likes}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Progress Tracker ──────────────────────────────────────────────────────

function ProgressTracker() {
  const { streak, totalDays, totalSearches, monthlySearches, badges, earnedBadges } = useStudyProgress();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "連続学習日数", value: streak,         unit: "日", icon: "🔥", color: "#E85D04" },
          { label: "累計学習日数", value: totalDays,       unit: "日", icon: "📅", color: "#2563EB" },
          { label: "累計検索数",   value: totalSearches,   unit: "回", icon: "🔍", color: "#059669" },
          { label: "今月の検索",   value: monthlySearches, unit: "回", icon: "📊", color: "#7C3AED" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-gray-400">{s.unit}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      {streak > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <div>
            <p className="font-bold text-orange-700">{streak}日連続学習中！</p>
            <p className="text-xs text-orange-500">この調子で続けましょう</p>
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-bold text-gray-500 mb-3">獲得バッジ（{earnedBadges.length}/{badges.length}）</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {badges.map(b => (
            <div key={b.id}
              className={`rounded-xl border p-3 text-center transition bg-white ${
                b.earned ? "border-orange-200 shadow-sm" : "border-gray-100 opacity-50"
              }`}>
              <p className={`text-2xl mb-1 ${b.earned ? "" : "grayscale"}`}>{b.icon}</p>
              <p className="text-xs font-bold text-gray-800">{b.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{b.desc}</p>
              {b.earned && <p className="text-[10px] text-[#E85D04] font-semibold mt-1">✓ 獲得済み</p>}
            </div>
          ))}
        </div>
      </div>
      <div className="text-center">
        <Link href="/stage1"
          className="inline-block px-5 py-2 rounded-xl font-bold text-white text-sm transition hover:opacity-90 shadow-sm"
          style={{ background: "#E85D04" }}>
          メディカルサーチで学習を記録 →
        </Link>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "papers",   icon: "📄", label: "注目論文"      },
  { id: "columns",  icon: "✏️",  label: "コラム"        },
  { id: "evidence", icon: "🔔", label: "エビデンス更新" },
  { id: "board",    icon: "💬", label: "掲示板"         },
  { id: "progress", icon: "📊", label: "学習進捗"       },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Page ─────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const [tab, setTab] = useState<TabId>("papers");
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);

  return (
    <main className="bg-[#F8F9FA] min-h-screen">

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-black text-gray-900">学習コンテンツ</h1>
          <p className="text-gray-500 text-sm mt-1">最新論文・コラム・エビデンス更新・掲示板・学習進捗</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1.5 mb-6 pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition shrink-0 ${
                tab === t.id
                  ? "text-white shadow-sm"
                  : "text-gray-600 bg-white border border-gray-200 hover:border-orange-200 shadow-sm"
              }`}
              style={tab === t.id ? { background: "#E85D04" } : {}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Papers ── */}
        {tab === "papers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-gray-700">今週の注目論文</p>
              <span className="text-[10px] text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded-full">毎週更新</span>
            </div>
            {FEATURED_PAPERS.map(paper => (
              <div key={paper.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition cursor-pointer card-hover"
                onClick={() => setSelectedPaper(paper)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {paper.isNew && (
                        <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: "#E85D04" }}>NEW</span>
                      )}
                      <span className="text-[10px] text-gray-400">{paper.journal} · {paper.year}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1.5 line-clamp-2">{paper.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{paper.summary}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex flex-wrap gap-1">
                    {paper.tags.map(t => (
                      <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{t}</span>
                    ))}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedPaper(paper); }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition hover:opacity-90 shrink-0"
                    style={{ background: "#E85D04" }}
                  >
                    詳しく見る →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Columns ── */}
        {tab === "columns" && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700 mb-1">PT Works コラム</p>
            {COLUMNS.map(col => (
              <div key={col.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="text-3xl shrink-0">{col.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold text-[#E85D04] bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">{col.category}</span>
                      <span className="text-[10px] text-gray-400">{col.date}</span>
                      <span className="text-[10px] text-gray-400">約{col.readTime}分</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1">{col.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{col.preview}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Evidence Updates ── */}
        {tab === "evidence" && (
          <div>
            <p className="text-sm font-bold text-gray-700 mb-4">疾患エビデンス更新情報</p>
            <div className="space-y-2">
              {EVIDENCE_UPDATES.map((ev, i) => (
                <div key={i}
                  className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm hover:border-orange-200 transition">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ev.badge === "new"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {ev.badge === "new" ? "NEW" : "更新"}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{ev.disease}</p>
                      <p className="text-xs text-gray-400">{ev.type} · {ev.date}</p>
                    </div>
                  </div>
                  <Link href={`/stage1?q=${encodeURIComponent(ev.disease)}`}
                    className="text-xs font-bold text-[#E85D04] hover:underline shrink-0">
                    調べる →
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-5 bg-orange-50 border border-orange-100 rounded-xl p-4">
              <p className="text-sm font-bold text-orange-700 mb-1">🔔 エビデンス更新通知</p>
              <p className="text-xs text-orange-600">気になる疾患をブックマークしておくと、エビデンスが更新された際にお知らせします。</p>
              <Link href="/bookmarks" className="inline-block mt-2 text-xs font-bold text-[#E85D04] hover:underline">
                ブックマーク管理 →
              </Link>
            </div>
          </div>
        )}

        {/* ── Bulletin Board ── */}
        {tab === "board" && (
          <div>
            <p className="text-sm font-bold text-gray-700 mb-4">ユーザー掲示板</p>
            <BulletinBoard />
          </div>
        )}

        {/* ── Progress ── */}
        {tab === "progress" && (
          <div>
            <p className="text-sm font-bold text-gray-700 mb-4">学習進捗トラッカー</p>
            <ProgressTracker />
          </div>
        )}
      </div>

      {/* Paper modal */}
      {selectedPaper && (
        <PaperModal paper={selectedPaper} onClose={() => setSelectedPaper(null)} />
      )}
    </main>
  );
}
