"use client";

import Link from "next/link";

// ─────────────────────────────────────────────
// ダミーデータ（後で実データに差し替え）
// ─────────────────────────────────────────────

type ContentType = "動画" | "PDF";

interface MarketItem {
  id:       string;
  type:     ContentType;
  title:    string;
  author:   string;
  price:    string;
  duration: string;   // 動画は時間、PDFはページ数
  category: string;
  tags:     string[];
  color:    string;
}

const ITEMS: MarketItem[] = [
  {
    id: "1", type: "動画",
    title: "変形性膝関節症の評価と運動療法 完全ガイド",
    author: "田中 優子 PT",
    price: "¥1,980", duration: "42分",
    category: "整形外科", tags: ["膝関節", "運動療法", "評価"],
    color: "#1B4332",
  },
  {
    id: "2", type: "PDF",
    title: "脳卒中リハ 実践チェックシート集",
    author: "佐藤 健一 PT",
    price: "¥980", duration: "28ページ",
    category: "神経疾患", tags: ["脳卒中", "評価", "チェックシート"],
    color: "#2563EB",
  },
  {
    id: "3", type: "動画",
    title: "副業PT入門：セミナー講師になるまでの全ステップ",
    author: "山本 あかり PT",
    price: "¥2,480", duration: "65分",
    category: "キャリア", tags: ["副業", "セミナー", "収益化"],
    color: "#E85D04",
  },
  {
    id: "4", type: "PDF",
    title: "COPD患者への運動指導マニュアル",
    author: "中村 大輔 PT",
    price: "¥1,480", duration: "36ページ",
    category: "内部障害", tags: ["COPD", "呼吸器", "運動指導"],
    color: "#7C3AED",
  },
  {
    id: "5", type: "動画",
    title: "ACL術後リハ：段階的プロトコル完全解説",
    author: "鈴木 翔太 PT",
    price: "¥3,200", duration: "88分",
    category: "スポーツ", tags: ["ACL", "術後", "スポーツ復帰"],
    color: "#1B4332",
  },
  {
    id: "6", type: "PDF",
    title: "新人PTのための申し送りテンプレート集",
    author: "加藤 みのり PT",
    price: "無料", duration: "12ページ",
    category: "臨床スキル", tags: ["新人", "申し送り", "書類"],
    color: "#6B7280",
  },
];

const CATEGORIES = ["すべて", "整形外科", "神経疾患", "内部障害", "スポーツ", "キャリア", "臨床スキル"];
const TYPES: ("すべて" | "動画" | "PDF")[] = ["すべて", "動画", "PDF"];

// 現在のプラン（モック）
const CURRENT_PLAN = "free" as "free" | "stage2" | "stage3" | "stage4";
const canWatch = CURRENT_PLAN !== "free";

// ─────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────

function TypeBadge({ type }: { type: ContentType }) {
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={
        type === "動画"
          ? { background: "#FEF3C7", color: "#92400E" }
          : { background: "#EFF6FF", color: "#1E40AF" }
      }
    >
      {type === "動画" ? "動画" : "PDF"}
    </span>
  );
}

function LockOverlay({ href }: { href: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-b-2xl">
      <svg className="w-6 h-6 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
      </svg>
      <p className="text-xs font-bold text-gray-700 mb-1">冒頭30秒まで視聴可能</p>
      <Link
        href={href}
        className="text-xs font-bold text-white px-3 py-1.5 rounded-lg transition hover:opacity-90"
        style={{ background: "#2563EB" }}
      >
        副業支援パックで全編視聴 →
      </Link>
    </div>
  );
}

export default function MarketPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ── ヘッダー ── */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-2">
          <div>
            <h1 className="text-2xl font-black text-gray-900 mb-1">コンテンツマーケット</h1>
            <p className="text-sm text-gray-500">PTが作った動画・PDFを学ぶ。あなたの知識を販売することもできます。</p>
          </div>

          {/* 販売導線 */}
          <Link
            href="/stage2"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition hover:shadow-md"
            style={{ borderColor: "#2563EB", color: "#2563EB" }}
          >
            この動画を販売したいPTの方はこちら →
          </Link>
        </div>

        {/* 無料プランへの案内バナー */}
        {!canWatch && (
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl px-5 py-4 border"
            style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}
          >
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900 mb-0.5">一覧は無料で閲覧できます</p>
              <p className="text-xs text-blue-700">動画・PDFの冒頭30秒は無料でお試し可能。全編視聴・購入・販売は副業支援パック以上でご利用いただけます。</p>
            </div>
            <Link
              href="/stage2"
              className="shrink-0 text-xs font-bold text-white px-4 py-2 rounded-xl transition hover:opacity-90"
              style={{ background: "#2563EB" }}
            >
              副業支援パックを見る →
            </Link>
          </div>
        )}
      </div>

      {/* ── フィルター ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                t === "すべて"
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                c === "すべて"
                  ? "bg-[#1B4332] border-[#1B4332] text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── コンテンツ一覧 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ITEMS.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col"
          >
            {/* サムネイル（SVGイラスト） */}
            <div
              className="relative h-32 flex items-center justify-center"
              style={{ background: item.color + "18" }}
            >
              {item.type === "動画" ? (
                <svg viewBox="0 0 80 56" fill="none" className="w-16 h-12" aria-hidden="true">
                  <rect x="4" y="4" width="72" height="48" rx="6" fill={item.color} fillOpacity="0.15" stroke={item.color} strokeWidth="1.5"/>
                  <circle cx="40" cy="28" r="14" fill={item.color} fillOpacity="0.2" stroke={item.color} strokeWidth="1.5"/>
                  <polygon points="35,21 35,35 51,28" fill={item.color} fillOpacity="0.7"/>
                </svg>
              ) : (
                <svg viewBox="0 0 60 72" fill="none" className="w-12 h-16" aria-hidden="true">
                  <rect x="4" y="4" width="52" height="64" rx="5" fill={item.color} fillOpacity="0.12" stroke={item.color} strokeWidth="1.5"/>
                  <path d="M36 4 L36 18 L50 18" stroke={item.color} strokeWidth="1.5" fill="none"/>
                  <line x1="14" y1="28" x2="46" y2="28" stroke={item.color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
                  <line x1="14" y1="36" x2="40" y2="36" stroke={item.color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
                  <line x1="14" y1="44" x2="44" y2="44" stroke={item.color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.35"/>
                  <line x1="14" y1="52" x2="36" y2="52" stroke={item.color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3"/>
                </svg>
              )}

              {/* ロックオーバーレイ（無料プランのみ） */}
              {!canWatch && item.price !== "無料" && (
                <LockOverlay href="/stage2" />
              )}
            </div>

            {/* コンテンツ情報 */}
            <div className="p-4 flex flex-col flex-1 gap-2">
              <div className="flex items-center gap-2">
                <TypeBadge type={item.type} />
                <span className="text-[10px] text-gray-400">{item.category}</span>
              </div>

              <p className="text-sm font-bold text-gray-900 leading-snug flex-1">{item.title}</p>

              <p className="text-xs text-gray-500">{item.author}</p>

              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div>
                  <p className="text-base font-black" style={{ color: item.color }}>{item.price}</p>
                  <p className="text-[10px] text-gray-400">{item.duration}</p>
                </div>
                {item.price === "無料" || canWatch ? (
                  <button
                    className="text-xs font-bold text-white px-4 py-2 rounded-xl transition hover:opacity-90"
                    style={{ background: item.color }}
                  >
                    {item.price === "無料" ? "無料で見る" : "視聴する"}
                  </button>
                ) : (
                  <Link
                    href="/stage2"
                    className="text-xs font-bold text-white px-4 py-2 rounded-xl transition hover:opacity-90"
                    style={{ background: "#2563EB" }}
                  >
                    プランを見る
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 下部CTA：販売導線 ── */}
      <div
        className="mt-10 rounded-2xl px-6 py-6 flex flex-col sm:flex-row items-center gap-5"
        style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)" }}
      >
        <div className="flex-1 text-white">
          <p className="font-black text-lg mb-1">あなたの知識を収益に変える</p>
          <p className="text-sm text-white/70 leading-relaxed">
            セミナー動画・教材PDFを販売して、収益の50%があなたに還元されます。<br />
            副業支援パックに加入して、コンテンツ販売を始めましょう。
          </p>
        </div>
        <Link
          href="/stage2"
          className="shrink-0 px-6 py-3 rounded-xl font-bold text-[#1B4332] bg-white text-sm hover:bg-orange-50 transition shadow-md"
        >
          この動画を販売したいPTの方はこちら →
        </Link>
      </div>

    </div>
  );
}
