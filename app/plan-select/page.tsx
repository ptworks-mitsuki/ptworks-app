import Link from "next/link";

export const dynamic = "force-static";

// ─────────────────────────────────────────────
// データ
// ─────────────────────────────────────────────

const PLANS = [
  {
    label:    "無料プラン",
    price:    "¥0",
    sub:      "ずっと無料",
    color:    "#6B7280",
    border:   "#D1D5DB",
    bg:       "#F9FAFB",
    target:   "まずは試してみたい方",
    features: [
      "メディカルサーチ（月5回）",
      "副業診断 1回無料体験",
      "PC・スマホ対応",
    ],
    badge:    null,
    href:     "/stage1",
    btnLabel: "無料で始める",
  },
  {
    label:    "臨床サポートパック",
    price:    "¥980",
    sub:      "月",
    color:    "#1B4332",
    border:   "#1B4332",
    bg:       "#F0FDF4",
    target:   "臨床力を高めたい現役PT",
    features: [
      "メディカルサーチ無制限",
      "治療アプローチAI生成",
      "スライド自動生成",
      "患者説明文の自動生成",
    ],
    badge:    "人気No.1",
    href:     "/stage1",
    btnLabel: "このプランを選ぶ",
  },
  {
    label:    "副業支援パック",
    price:    "¥3,980",
    sub:      "月",
    color:    "#2563EB",
    border:   "#2563EB",
    bg:       "#EFF6FF",
    target:   "副業・収益化に挑戦したいPT",
    features: [
      "AIコーチング（月次アクション）",
      "SNS・ブログ記事生成",
      "セミナー動画・PDF販売",
      "収益管理ダッシュボード",
    ],
    badge:    null,
    href:     "/stage2",
    btnLabel: "このプランを選ぶ",
  },
  {
    label:    "開業・院運営パック",
    price:    "¥5,980",
    sub:      "月",
    color:    "#7C3AED",
    border:   "#7C3AED",
    bg:       "#F5F3FF",
    target:   "独立・開業を目指すPT",
    features: [
      "口コミ返信文ジェネレーター",
      "SNS投稿文・症例ブログ生成",
      "問い合わせ対応AI",
      "確定申告・経費管理補助",
    ],
    badge:    null,
    href:     "/stage3",
    btnLabel: "このプランを選ぶ",
  },
  {
    label:    "全部入りパック",
    price:    "¥6,980",
    sub:      "月",
    color:    "#E85D04",
    border:   "#E85D04",
    bg:       "#FFF7ED",
    target:   "全機能を使い倒したいPT",
    features: [
      "全パックの機能すべて",
      "優先サポート対応",
      "新機能を最速で利用",
      "ライセンス 1アカウント",
    ],
    badge:    "BEST",
    href:     "/stage4",
    btnLabel: "このプランを選ぶ",
  },
];

// ─────────────────────────────────────────────
// ページ
// ─────────────────────────────────────────────

export default function PlanSelectPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">

        {/* ── ヘッダー ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md"
              style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}
            >
              P
            </div>
            <span className="text-2xl font-black text-gray-900">PT Works</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
            プランを選んでください
          </h1>
          <p className="text-gray-500 text-sm">
            カードをクリックすると各プランの詳細ページに移動します。いつでも変更・解約できます。
          </p>
        </div>

        {/* ── プランカード ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {PLANS.map((plan) => (
            <Link
              key={plan.label}
              href={plan.href}
              className="relative bg-white rounded-2xl border-2 flex flex-col overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 group"
              style={{ borderColor: plan.border }}
            >
              {/* バッジ */}
              {plan.badge && (
                <span
                  className="absolute top-3 right-3 text-[10px] font-black text-white px-2 py-0.5 rounded-full shadow-sm z-10"
                  style={{ background: plan.color }}
                >
                  {plan.badge}
                </span>
              )}

              {/* カラー帯 */}
              <div className="h-2" style={{ background: plan.color }} />

              {/* コンテンツ */}
              <div className="p-5 flex flex-col flex-1 gap-3">

                <div>
                  <p className="text-[11px] font-bold mb-1" style={{ color: plan.color }}>
                    {plan.label}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900">{plan.price}</span>
                    <span className="text-xs text-gray-400">/{plan.sub}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 pb-2 border-b border-gray-100">
                  {plan.target}
                </p>

                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-gray-700">
                      <span className="mt-0.5 shrink-0 font-bold" style={{ color: plan.color }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div
                  className="mt-2 text-center text-xs font-bold py-2.5 rounded-xl transition group-hover:opacity-90"
                  style={{ background: plan.color, color: "white" }}
                >
                  {plan.btnLabel}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── まずは無料で始める ── */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true">
              <path d="M13 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            まずは無料で始める
          </Link>
        </div>

      </div>
    </div>
  );
}
