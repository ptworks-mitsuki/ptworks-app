import Link from "next/link";

export const dynamic = "force-static";

// ─────────────────────────────────────────────
// データ
// ─────────────────────────────────────────────

const SOLUTIONS = [
  { pain: "疾患の調べ物が大変",       fix: "メディカルサーチで即解決",           href: "/stage1"        },
  { pain: "副業の始め方がわからない",  fix: "副業支援パックで一歩踏み出せる",     href: "/stage2"        },
  { pain: "集客・SNSが苦手",           fix: "開業・院運営パックでAIが代わりに書く", href: "/stage3"       },
  { pain: "学会発表の資料作りが大変",  fix: "スライド自動生成で10分で完成",       href: "/stage1/slides" },
  { pain: "患者説明が難しい",          fix: "AIが平易な言葉で説明文を生成",       href: "/stage1"        },
];

const PLANS = [
  {
    label:      "無料プラン",
    price:      "¥0",
    sub:        "ずっと無料",
    firstPrice: null,
    color:      "#6B7280",
    border:     "#D1D5DB",
    bg:         "#F9FAFB",
    target:     "まずは試してみたい方",
    features:   ["メディカルサーチ（月5回）", "副業診断 1回無料体験", "PC・スマホ対応"],
    badge:      null,
    href:       "/register",
    note:       null,
  },
  {
    label:      "臨床サポートパック",
    price:      "¥980",
    sub:        "月",
    firstPrice: null,
    color:      "#1B4332",
    border:     "#1B4332",
    bg:         "#F0FDF4",
    target:     "臨床力を高めたい現役PT",
    features:   ["メディカルサーチ無制限", "治療アプローチAI生成", "スライド自動生成", "患者説明文の自動生成"],
    badge:      "人気No.1",
    href:       "/stage1",
    note:       null,
  },
  {
    label:      "副業支援パック",
    price:      "¥3,980",
    sub:        "月",
    firstPrice: "¥980",
    color:      "#2563EB",
    border:     "#2563EB",
    bg:         "#EFF6FF",
    target:     "副業・収益化に挑戦したいPT",
    features:   ["AIコーチング（月次アクション）", "SNS・ブログ記事生成", "セミナー動画・PDF販売", "収益管理ダッシュボード"],
    badge:      null,
    href:       "/stage2",
    note:       "セミナー動画・PDF販売で収益化。収益の50%がPTに還元されます。",
  },
  {
    label:      "開業・院運営パック",
    price:      "¥5,980",
    sub:        "月",
    firstPrice: "¥2,980",
    color:      "#7C3AED",
    border:     "#7C3AED",
    bg:         "#F5F3FF",
    target:     "独立・開業を目指すPT",
    features:   ["口コミ返信文ジェネレーター", "SNS投稿文・症例ブログ生成", "問い合わせ対応AI", "確定申告・経費管理補助"],
    badge:      null,
    href:       "/stage3",
    note:       null,
  },
  {
    label:      "全部入りパック",
    price:      "¥6,980",
    sub:        "月",
    firstPrice: "¥3,480",
    color:      "#E85D04",
    border:     "#E85D04",
    bg:         "#FFF7ED",
    target:     "全機能を使い倒したいPT",
    features:   ["全パックの機能すべて", "優先サポート対応", "新機能を最速で利用", "ライセンス 1アカウント"],
    badge:      "BEST",
    href:       "/stage4",
    note:       null,
  },
];

// プランごとのSVGイラスト（コンパクト）
function PlanIllustration({ color, index }: { color: string; index: number }) {
  if (index === 0) {
    // 無料：虫眼鏡
    return (
      <svg viewBox="0 0 64 48" fill="none" className="w-full h-auto" aria-hidden="true">
        <circle cx="26" cy="22" r="12" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.08"/>
        <line x1="34" y1="30" x2="44" y2="40" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="20" y1="22" x2="32" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
        <line x1="26" y1="16" x2="26" y2="28" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
      </svg>
    );
  }
  if (index === 1) {
    // 臨床：クリップボード＋ハート
    return (
      <svg viewBox="0 0 64 48" fill="none" className="w-full h-auto" aria-hidden="true">
        <rect x="12" y="10" width="32" height="30" rx="4" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="1.5"/>
        <rect x="20" y="6" width="16" height="8" rx="3" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5"/>
        <path d="M28 28 C28 25 22 22 22 26 C22 30 28 34 28 34 C28 34 34 30 34 26 C34 22 28 25 28 28Z" fill={color} fillOpacity="0.6"/>
      </svg>
    );
  }
  if (index === 2) {
    // 副業：グラフ
    return (
      <svg viewBox="0 0 64 48" fill="none" className="w-full h-auto" aria-hidden="true">
        <rect x="10" y="30" width="8" height="12" rx="2" fill={color} fillOpacity="0.4"/>
        <rect x="22" y="22" width="8" height="20" rx="2" fill={color} fillOpacity="0.6"/>
        <rect x="34" y="14" width="8" height="28" rx="2" fill={color} fillOpacity="0.8"/>
        <rect x="46" y="8"  width="8" height="34" rx="2" fill={color}/>
        <line x1="8" y1="42" x2="56" y2="42" stroke={color} strokeWidth="1.5" strokeOpacity="0.3"/>
        <path d="M14 30 L26 22 L38 14 L50 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2"/>
      </svg>
    );
  }
  if (index === 3) {
    // 開業：建物
    return (
      <svg viewBox="0 0 64 48" fill="none" className="w-full h-auto" aria-hidden="true">
        <rect x="14" y="18" width="36" height="24" rx="2" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="1.5"/>
        <polygon points="32,6 8,18 56,18" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="24" y="28" width="8" height="14" rx="2" fill={color} fillOpacity="0.4"/>
        <rect x="36" y="26" width="7" height="7" rx="1" fill={color} fillOpacity="0.3"/>
        <rect x="18" y="26" width="7" height="7" rx="1" fill={color} fillOpacity="0.3"/>
      </svg>
    );
  }
  // 全部入り：星
  return (
    <svg viewBox="0 0 64 48" fill="none" className="w-full h-auto" aria-hidden="true">
      <polygon
        points="32,6 36.4,18.8 50,18.8 39.2,26.4 43.6,39.2 32,31.6 20.4,39.2 24.8,26.4 14,18.8 27.6,18.8"
        fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.5" strokeLinejoin="round"
      />
      <circle cx="32" cy="24" r="5" fill={color} fillOpacity="0.5"/>
    </svg>
  );
}

// ─────────────────────────────────────────────
// ページ
// ─────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="w-full">

      {/* ①━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ヒーロー
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="px-4 pt-10 pb-10 sm:pt-14 sm:pb-12"
        style={{ background: "linear-gradient(160deg, #ffffff 0%, #F0FDF4 40%, #f9fafb 100%)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">

            {/* 左：テキスト */}
            <div className="flex-1 text-center lg:text-left">

              {/* ロゴ */}
              <div className="flex items-center gap-3 mb-4 justify-center lg:justify-start">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-md"
                  style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}
                >
                  P
                </div>
                <span className="text-4xl font-black tracking-tight" style={{ color: "#1A1A2E" }}>
                  PT<span style={{ color: "#E85D04" }}>Works</span>
                </span>
              </div>

              {/* バッジ */}
              <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-4 shadow-sm">
                <span className="w-2 h-2 rounded-full" style={{ background: "#1B4332" }} />
                <span className="text-xs font-bold" style={{ color: "#1B4332" }}>現役PTが作る、理学療法士専用ツール</span>
              </div>

              {/* キャッチコピー */}
              <h1 className="text-3xl sm:text-4xl font-black leading-[1.22] mb-3 tracking-tight" style={{ color: "#1B4332" }}>
                臨床で必要なものが、<br />全部ここにある。
              </h1>

              {/* サブコピー */}
              <p className="text-gray-500 text-base sm:text-lg leading-relaxed mb-5 max-w-md mx-auto lg:mx-0">
                教科書も、参考書も、相談できる先輩も。
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-9 py-3.5 rounded-2xl font-black text-white text-base transition hover:opacity-90 shadow-lg text-center"
                  style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}
                >
                  無料で始める
                </Link>
                <Link
                  href="/stage1"
                  className="text-sm font-semibold text-gray-500 hover:text-[#1B4332] transition underline underline-offset-4 decoration-dashed"
                >
                  登録なしで試してみる
                </Link>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center lg:text-left">クレジットカード不要 · 30秒で登録完了</p>
            </div>

            {/* 右：デスクイラスト */}
            <div className="shrink-0 w-full max-w-[260px] lg:max-w-sm">
              <svg viewBox="0 0 340 280" fill="none" className="w-full" aria-hidden="true">
                <rect x="10" y="212" width="320" height="16" rx="5" fill="#1B4332" fillOpacity="0.08" stroke="#1B4332" strokeWidth="1" strokeOpacity="0.15"/>
                <rect x="22"  y="132" width="18" height="80" rx="3" fill="#1B4332" fillOpacity="0.75"/>
                <rect x="42"  y="118" width="14" height="94" rx="3" fill="#E85D04" fillOpacity="0.65"/>
                <rect x="58"  y="140" width="16" height="72" rx="3" fill="#2563EB" fillOpacity="0.6"/>
                <rect x="76"  y="125" width="12" height="87" rx="3" fill="#7C3AED" fillOpacity="0.55"/>
                <line x1="26" y1="148" x2="36" y2="148" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>
                <line x1="26" y1="155" x2="36" y2="155" stroke="white" strokeWidth="1" strokeOpacity="0.4"/>
                <line x1="45" y1="134" x2="53" y2="134" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>
                <rect x="96" y="168" width="144" height="46" rx="5" fill="#1F2937" stroke="#374151" strokeWidth="1.5"/>
                <rect x="100" y="171" width="136" height="40" rx="3" fill="#E5E7EB"/>
                <rect x="105" y="175" width="60" height="4" rx="2" fill="#1B4332" fillOpacity="0.6"/>
                <rect x="105" y="182" width="48" height="3" rx="1.5" fill="#6B7280" fillOpacity="0.4"/>
                <rect x="105" y="188" width="55" height="3" rx="1.5" fill="#6B7280" fillOpacity="0.35"/>
                <rect x="105" y="194" width="40" height="3" rx="1.5" fill="#6B7280" fillOpacity="0.3"/>
                <rect x="170" y="175" width="60" height="22" rx="3" fill="#1B4332" fillOpacity="0.08"/>
                <text x="177" y="186" fontSize="8" fill="#1B4332" fontWeight="bold" fontFamily="sans-serif">PT Works</text>
                <rect x="173" y="189" width="52" height="5" rx="2.5" fill="#E85D04" fillOpacity="0.7"/>
                <path d="M90 214 L110 212 L226 212 L246 214 L252 218 L84 218 Z" fill="#374151"/>
                <ellipse cx="265" cy="178" rx="13" ry="5" fill="#7C3AED" fillOpacity="0.15"/>
                <rect x="252" y="178" width="26" height="32" rx="4" fill="#7C3AED" fillOpacity="0.12" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.35"/>
                <path d="M278 184 Q288 184 288 192 Q288 200 278 200" stroke="#7C3AED" strokeWidth="1.5" fill="none" strokeOpacity="0.45"/>
                <path d="M260 174 Q262 168 260 162" stroke="#7C3AED" strokeWidth="1" fill="none" strokeOpacity="0.3" strokeLinecap="round"/>
                <path d="M265 174 Q267 166 265 160" stroke="#7C3AED" strokeWidth="1" fill="none" strokeOpacity="0.25" strokeLinecap="round"/>
                <rect x="290" y="140" width="40" height="72" rx="8" fill="#1A1A2E" stroke="#374151" strokeWidth="1.5"/>
                <rect x="293" y="143" width="34" height="66" rx="6" fill="#F8FAFC"/>
                <rect x="293" y="143" width="34" height="8" rx="3" fill="#1B4332"/>
                <text x="296" y="150" fontSize="4" fill="white" fontFamily="sans-serif" fontWeight="bold">PT Works</text>
                <rect x="296" y="155" width="28" height="4" rx="2" fill="#1B4332" fillOpacity="0.7"/>
                <rect x="296" y="162" width="22" height="3" rx="1.5" fill="#6B7280" fillOpacity="0.45"/>
                <rect x="296" y="168" width="25" height="3" rx="1.5" fill="#6B7280" fillOpacity="0.4"/>
                <rect x="296" y="174" width="20" height="3" rx="1.5" fill="#6B7280" fillOpacity="0.35"/>
                <rect x="296" y="195" width="28" height="10" rx="4" fill="#E85D04"/>
                <rect x="301" y="198" width="18" height="3" rx="1.5" fill="white" fillOpacity="0.85"/>
                <rect x="82" y="208" width="6" height="40" rx="3" fill="#E85D04" fillOpacity="0.5" transform="rotate(-10, 85, 220)"/>
                <circle cx="50" cy="112" r="4" fill="#E85D04" fillOpacity="0.25"/>
                <circle cx="248" cy="134" r="3" fill="#1B4332" fillOpacity="0.2"/>
                <path d="M90 175 Q195 100 285 162" stroke="#1B4332" strokeWidth="1.5" strokeDasharray="5 4" fill="none" strokeOpacity="0.2" strokeLinecap="round"/>
                <path d="M282 158 L285 162 L280 163" stroke="#1B4332" strokeWidth="1.5" fill="none" strokeOpacity="0.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-center text-xs text-gray-400 mt-1">机の上にあるものが全部このアプリに</p>
            </div>

          </div>
        </div>
      </section>

      {/* ②━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PT Worksでできること（悩み→解決策）
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="bg-[#F8F9FA] px-4 py-10 sm:py-12">
        <div className="max-w-3xl mx-auto">

          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">PT Works でできること</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SOLUTIONS.map((s) => (
              <Link
                key={s.pain}
                href={s.href}
                className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3.5 shadow-sm hover:border-orange-300 hover:shadow-md transition group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400 font-semibold mb-0.5">悩み</p>
                  <p className="text-sm text-gray-600 font-medium leading-snug">{s.pain}</p>
                </div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0"
                  style={{ background: "#E85D04" }}
                >
                  →
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold mb-0.5" style={{ color: "#1B4332" }}>解決策</p>
                  <p className="text-sm font-bold text-gray-900 leading-snug group-hover:text-[#E85D04] transition">{s.fix}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ③━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          なぜPT Worksが選ばれるのか（比較テーブル）
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="bg-white px-4 py-10 sm:py-12">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">なぜ PT Works が選ばれるのか</h2>
            <p className="text-gray-500 text-sm mt-1">既存サービスと比較してみてください</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border-2 border-orange-200 shadow-sm bg-white">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 w-[32%]">比較項目</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">セラピスト.com</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">汎用AI<br /><span className="font-normal text-[10px]">ChatGPT等</span></th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">院運営<br /><span className="font-normal text-[10px]">コンサル</span></th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-[#E85D04] bg-orange-50 border-l-2 border-orange-300">PT Works</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { item: "PTに特化した疾患情報",  others: [false, false, false] },
                  { item: "治療アプローチAI生成",   others: [false, false, false] },
                  { item: "スライド自動生成",        others: [false, false, false] },
                  { item: "副業診断・ロードマップ",  others: [false, false, false] },
                  { item: "SNS・ブログ文章生成",     others: [false, true,  false] },
                  { item: "口コミ返信文の自動生成",  others: [false, false, false] },
                ].map((row, i) => (
                  <tr key={row.item} className={`border-t border-gray-100 ${i % 2 === 1 ? "bg-gray-50/40" : "bg-white"}`}>
                    <td className="px-5 py-3 text-xs font-semibold text-gray-700">{row.item}</td>
                    {row.others.map((ok, j) => (
                      <td key={j} className="px-4 py-3 text-center">
                        {ok
                          ? <span className="text-base font-black" style={{ color: "#9CA3AF" }}>○</span>
                          : <span className="text-base font-black" style={{ color: "#EF4444" }}>✕</span>
                        }
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center bg-orange-50/50 border-l-2 border-orange-300">
                      <span className="text-base font-black" style={{ color: "#E85D04" }}>○</span>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="px-5 py-3 text-xs font-semibold text-gray-700">費用</td>
                  {[
                    { text: "無料",     sub: "" },
                    { text: "無料〜",   sub: "¥3,000/月" },
                    { text: "¥30,000〜", sub: "¥100,000/月" },
                  ].map((v, j) => (
                    <td key={j} className="px-4 py-3 text-center">
                      <span className="text-xs font-bold text-gray-500 block">{v.text}</span>
                      {v.sub && <span className="text-[10px] text-gray-400">{v.sub}</span>}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center bg-orange-50/50 border-l-2 border-orange-300">
                    <span className="text-xs font-bold text-[#E85D04] block">¥0〜</span>
                    <span className="text-[10px] text-[#E85D04]/70">¥6,980/月</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-4 mt-2 pr-1">
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <span className="font-black text-sm" style={{ color: "#E85D04" }}>○</span> PT Works
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <span className="font-black text-sm" style={{ color: "#9CA3AF" }}>○</span> 他社あり
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <span className="font-black text-sm" style={{ color: "#EF4444" }}>✕</span> 他社なし
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">※ 各サービスの機能は調査時点のものです</p>
        </div>
      </section>

      {/* ④━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          プランを選ぶ
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="bg-[#F8F9FA] px-4 py-10 sm:py-12">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">あなたに合ったプランを選ぶ</h2>
            <p className="text-gray-500 text-sm mt-1">全パックは下位パックの機能を含みます。いつでも変更・解約可能</p>
          </div>

          {/* プランカード：スマホは縦並び、PCは5列横並び */}
          {/* items-stretch で全カード同じ高さに揃える */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-stretch">
            {PLANS.map((plan, i) => (
              <div
                key={plan.label}
                className="relative bg-white rounded-2xl border-2 flex flex-col overflow-hidden shadow-sm hover:shadow-md transition"
                style={{ borderColor: plan.border }}
              >
                {/* プランバッジ（人気No.1 / BEST） */}
                {plan.badge && (
                  <span
                    className="absolute top-3 right-3 z-10 text-[10px] font-black text-white px-2 py-0.5 rounded-full shadow-sm"
                    style={{ background: plan.color }}
                  >
                    {plan.badge}
                  </span>
                )}

                {/* ── イラスト（高さ120px・中央揃え・全カード統一） ── */}
                <div
                  className="flex items-center justify-center"
                  style={{ height: "120px", background: plan.bg }}
                >
                  <div className="w-20 h-16">
                    <PlanIllustration color={plan.color} index={i} />
                  </div>
                </div>

                {/* ── コンテンツ（flex-col で最下部にボタンを固定） ── */}
                <div className="p-4 flex flex-col flex-1 gap-2">

                  {/* プラン名 */}
                  <p className="text-[11px] font-bold leading-snug" style={{ color: plan.color }}>
                    {plan.label}
                  </p>

                  {/* 価格エリア */}
                  {plan.firstPrice ? (
                    /* 初月割引あり：通常価格に取り消し線 ＋ 初月価格を大きく */
                    <div className="space-y-1">
                      {/* 初月限定バッジ */}
                      <span
                        className="inline-block text-[9px] font-black text-white px-2 py-0.5 rounded-full"
                        style={{ background: "#E85D04" }}
                      >
                        初月限定
                      </span>
                      {/* 通常価格（取り消し線） */}
                      <p className="text-xs text-gray-400">
                        通常{" "}
                        <span className="line-through">{plan.price}</span>
                        /月
                      </p>
                      {/* 初月価格（大きく） */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black" style={{ color: plan.color }}>
                          {plan.firstPrice}
                        </span>
                        <span className="text-xs text-gray-400">/月</span>
                      </div>
                    </div>
                  ) : (
                    /* 割引なし（無料 or 臨床サポート） */
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-gray-900">{plan.price}</span>
                      <span className="text-xs text-gray-400">/{plan.sub}</span>
                    </div>
                  )}

                  {/* 対象ユーザー */}
                  <p className="text-xs text-gray-500 leading-snug border-t border-gray-100 pt-2">
                    {plan.target}
                  </p>

                  {/* 機能リスト（flex-1 で残スペースを埋めてボタンを最下部へ） */}
                  <ul className="space-y-1.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-gray-700 leading-snug">
                        <span className="mt-0.5 shrink-0 font-bold" style={{ color: plan.color }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* 副業支援パック追記 */}
                  {plan.note && (
                    <p className="text-[10px] text-blue-700 bg-blue-50 rounded-lg px-2.5 py-2 leading-snug border border-blue-100">
                      {plan.note}
                    </p>
                  )}

                  {/* ボタン（mt-auto で常に最下部に固定） */}
                  <Link
                    href={plan.href}
                    className="mt-auto block text-center text-xs font-bold py-2.5 rounded-lg transition hover:opacity-80"
                    style={{ background: plan.color, color: "white" }}
                  >
                    詳しく見る →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          CTA（最下部）
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="px-4 py-14 sm:py-20 text-white"
        style={{ background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #1B4332 100%)" }}
      >
        <div className="max-w-2xl mx-auto text-center">

          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5 text-xs font-bold text-white/80">
            現役理学療法士が開発・運営中
          </div>

          <h2 className="text-2xl sm:text-4xl font-black mb-4 leading-tight">
            臨床の質を上げる準備を、<br />今日から始めてみてください
          </h2>

          <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-2">
            クレジットカード不要・30秒で登録完了
          </p>
          <p className="text-white/60 text-sm mb-8">
            文献・論文をもとに整理された臨床情報で、準備の質を変えましょう。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-[#1B4332] bg-white text-base hover:bg-orange-50 transition shadow-md"
            >
              無料アカウントを作成
            </Link>
            <Link
              href="/stage1"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-white text-base border-2 border-white/30 hover:bg-white/10 transition"
            >
              登録なしで試す
            </Link>
          </div>

          <div className="flex items-center justify-center gap-5 mt-7">
            {["クレジットカード不要", "いつでも解約", "月5回まで無料"].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-white/60 text-xs">
                <span className="text-green-400">✓</span>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
