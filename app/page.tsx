import Link from "next/link";

// ────────────────────────────────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────────────────────────────────

const PAINS = [
  { text: "頑張っても給料が上がらない…" },
  { text: "副業したいけど何から始めればいいかわからない" },
  { text: "独立したいけど集客・経営が不安" },
  { text: "疾患の調べ物に時間がかかりすぎる" },
  { text: "患者への説明が難しくて毎回悩む" },
  { text: "学会発表の資料作りに追われている" },
  { text: "SNSで情報発信したいけど文章が書けない" },
  { text: "口コミ返信が苦手で放置してしまっている" },
];

const STAGES_FLOW = [
  {
    num: 1, color: "#1B4332", bg: "#DCFCE7",
    label: "臨床サポートパック",
    title: "メディカルサーチ",
    target: "学生・新人PT",
    price: "無料〜¥980",
    href: "/stage1",
  },
  {
    num: 2, color: "#2563EB", bg: "#DBEAFE",
    label: "副業支援パック",
    title: "副業支援",
    target: "中堅PT",
    price: "¥3,980",
    href: "/stage2",
  },
  {
    num: 3, color: "#7C3AED", bg: "#EDE9FE",
    label: "開業・院運営パック",
    title: "業務効率化",
    target: "独立準備中",
    price: "¥5,980",
    href: "/stage3",
  },
  {
    num: 4, color: "#E85D04", bg: "#FEF3C7",
    label: "全部入りパック",
    title: "全機能＋サポート",
    target: "安定経営",
    price: "¥6,980",
    href: "/stage4",
  },
];

const SOLUTIONS = [
  {
    pain: "疾患の調べ物が大変",
    fix:  "メディカルサーチで即解決",
    href: "/stage1",
  },
  {
    pain: "副業の始め方がわからない",
    fix:  "副業支援パックで一歩踏み出せる",
    href: "/stage2",
  },
  {
    pain: "集客・SNSが苦手",
    fix:  "開業・院運営パックでAIが代わりに書く",
    href: "/stage3",
  },
  {
    pain: "学会発表の資料作りが大変",
    fix:  "スライド自動生成で10分で完成",
    href: "/stage1/slides",
  },
  {
    pain: "患者説明が難しい",
    fix:  "AIが平易な言葉で説明文を生成",
    href: "/stage1",
  },
];

const REVIEWS = [
  {
    text:  "疾患の調べ物が半分の時間で終わるようになりました。症例発表の準備がこんなに楽になるとは思わなかったです。",
    name:  "田中 優子",
    role:  "30代・病院勤務 PT",
    initials: "田",
    color: "#1B4332",
    stars: 5,
  },
  {
    text:  "副業の始め方がわかって、月3万円の収入が増えました。何から始めればいいかを具体的に教えてくれるのが助かります。",
    name:  "佐藤 健一",
    role:  "40代・クリニック勤務 PT",
    initials: "佐",
    color: "#2563EB",
    stars: 5,
  },
  {
    text:  "学会発表の資料が1時間で完成して驚きました。内容の精度も高くて、ほとんど修正せずに使えました。",
    name:  "山本 あかり",
    role:  "20代・新人 PT",
    initials: "山",
    color: "#7C3AED",
    stars: 5,
  },
  {
    text:  "口コミ返信がずっと苦手だったのに、AIが文章を提案してくれるので毎回すぐ返せるようになりました。",
    name:  "中村 大輔",
    role:  "40代・整体院オーナー PT",
    initials: "中",
    color: "#E85D04",
    stars: 5,
  },
];

const PLAN_SUMMARY = [
  { label: "無料プラン",       price: "¥0",     sub: "ずっと無料", color: "#6B7280", desc: "月5回の疾患検索",         badge: null        },
  { label: "臨床サポートパック", price: "¥980",   sub: "月",        color: "#1B4332", desc: "検索無制限＋スライド生成", badge: "人気No.1"  },
  { label: "副業支援パック",     price: "¥3,980", sub: "月",        color: "#2563EB", desc: "副業AIサポート全部入り",   badge: null        },
  { label: "開業・院運営パック", price: "¥5,980", sub: "月",        color: "#7C3AED", desc: "院運営・集客を自動化",     badge: null        },
  { label: "全部入りパック",     price: "¥6,980", sub: "月",        color: "#E85D04", desc: "全機能＋優先サポート",     badge: "BEST"      },
];

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="w-full">

      {/* ① ══════════════════════════════════════════════════════════════════
          HERO — white/gray gradient + desk illustration
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="px-4 pt-12 pb-14 sm:pt-18 sm:pb-20"
        style={{ background: "linear-gradient(160deg, #ffffff 0%, #F0FDF4 40%, #f9fafb 100%)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

            {/* ── Left: text column ── */}
            <div className="flex-1 text-center lg:text-left">

              {/* Logo + wordmark */}
              <div className="flex items-center gap-3 mb-5 justify-center lg:justify-start">
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-md"
                  style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}
                >
                  P
                </div>
                <span className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: "#1A1A2E" }}>
                  PT<span style={{ color: "#E85D04" }}>Works</span>
                </span>
              </div>

              {/* Sub-head pill */}
              <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-6 shadow-sm">
                <span className="w-2 h-2 rounded-full" style={{ background: "#1B4332" }} />
                <span className="text-xs sm:text-sm font-bold tracking-wide" style={{ color: "#1B4332" }}>
                  現役PTが作る、理学療法士専用ツール
                </span>
              </div>

              {/* Main catchphrase */}
              <h1
                className="text-3xl sm:text-4xl md:text-[2.6rem] font-black leading-[1.22] mb-5 tracking-tight"
                style={{ color: "#1B4332" }}
              >
                臨床で必要なものが、<br />全部ここにある。
              </h1>

              {/* Sub copy */}
              <p className="text-gray-500 text-base sm:text-lg leading-[1.9] mb-3 max-w-md mx-auto lg:mx-0">
                教科書も、参考書も、相談できる先輩も。<br />
                <span className="font-bold text-gray-700">PTの臨床準備に必要なものが、<br className="hidden sm:block"/>このアプリひとつに。</span>
              </p>

              {/* Visual hint */}
              <p className="text-xs text-gray-400 mb-6 max-w-xs mx-auto lg:mx-0">
                ← 机の上にあるものが、全部このアプリに入っています
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-white text-lg transition hover:opacity-90 shadow-xl text-center"
                  style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}
                >
                  無料で始める →
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

            {/* ── Right: desk illustration ── */}
            <div className="shrink-0 w-full max-w-xs lg:max-w-sm">
              <svg viewBox="0 0 340 280" fill="none" className="w-full" aria-hidden="true">

                {/* Desk surface */}
                <rect x="10" y="212" width="320" height="16" rx="5" fill="#1B4332" fillOpacity="0.08" stroke="#1B4332" strokeWidth="1" strokeOpacity="0.15"/>

                {/* ── Books (left) ── */}
                <rect x="22"  y="132" width="18" height="80" rx="3" fill="#1B4332" fillOpacity="0.75"/>
                <rect x="42"  y="118" width="14" height="94" rx="3" fill="#E85D04" fillOpacity="0.65"/>
                <rect x="58"  y="140" width="16" height="72" rx="3" fill="#2563EB" fillOpacity="0.6"/>
                <rect x="76"  y="125" width="12" height="87" rx="3" fill="#7C3AED" fillOpacity="0.55"/>
                {/* Book title lines */}
                <line x1="26"  y1="148" x2="36"  y2="148" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>
                <line x1="26"  y1="155" x2="36"  y2="155" stroke="white" strokeWidth="1" strokeOpacity="0.4"/>
                <line x1="45"  y1="134" x2="53"  y2="134" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>

                {/* ── Laptop (center) ── */}
                <rect x="96" y="168" width="144" height="46" rx="5"   fill="#1F2937" stroke="#374151" strokeWidth="1.5"/>
                <rect x="100" y="171" width="136" height="40" rx="3"  fill="#E5E7EB"/>
                {/* Screen lines (content) */}
                <rect x="105" y="175" width="60"  height="4" rx="2"  fill="#1B4332" fillOpacity="0.6"/>
                <rect x="105" y="182" width="48"  height="3" rx="1.5" fill="#6B7280" fillOpacity="0.4"/>
                <rect x="105" y="188" width="55"  height="3" rx="1.5" fill="#6B7280" fillOpacity="0.35"/>
                <rect x="105" y="194" width="40"  height="3" rx="1.5" fill="#6B7280" fillOpacity="0.3"/>
                {/* Logo on screen */}
                <rect x="170" y="175" width="60" height="22" rx="3" fill="#1B4332" fillOpacity="0.08"/>
                <text x="177" y="186" fontSize="8" fill="#1B4332" fontWeight="bold" fontFamily="sans-serif">PT Works</text>
                <rect x="173" y="189" width="52" height="5" rx="2.5" fill="#E85D04" fillOpacity="0.7"/>
                {/* Laptop hinge + base */}
                <path d="M90 214 L110 212 L226 212 L246 214 L252 218 L84 218 Z" fill="#374151"/>

                {/* ── Coffee cup ── */}
                <ellipse cx="265" cy="178" rx="13" ry="5" fill="#7C3AED" fillOpacity="0.15"/>
                <rect x="252"  y="178" width="26" height="32" rx="4"  fill="#7C3AED" fillOpacity="0.12" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.35"/>
                <path d="M278 184 Q288 184 288 192 Q288 200 278 200" stroke="#7C3AED" strokeWidth="1.5" fill="none" strokeOpacity="0.45"/>
                {/* Steam */}
                <path d="M260 174 Q262 168 260 162" stroke="#7C3AED" strokeWidth="1" fill="none" strokeOpacity="0.3" strokeLinecap="round"/>
                <path d="M265 174 Q267 166 265 160" stroke="#7C3AED" strokeWidth="1" fill="none" strokeOpacity="0.25" strokeLinecap="round"/>

                {/* ── Phone (right) ── */}
                <rect x="290" y="140" width="40" height="72" rx="8"  fill="#1A1A2E" stroke="#374151" strokeWidth="1.5"/>
                <rect x="293" y="143" width="34" height="66" rx="6"  fill="#F8FAFC"/>
                {/* Phone status bar */}
                <rect x="293" y="143" width="34" height="8" rx="3"   fill="#1B4332"/>
                <text x="296" y="150" fontSize="4" fill="white" fontFamily="sans-serif" fontWeight="bold">PT Works</text>
                {/* Phone content */}
                <rect x="296" y="155" width="28" height="4"   rx="2"   fill="#1B4332" fillOpacity="0.7"/>
                <rect x="296" y="162" width="22" height="3"   rx="1.5" fill="#6B7280" fillOpacity="0.45"/>
                <rect x="296" y="168" width="25" height="3"   rx="1.5" fill="#6B7280" fillOpacity="0.4"/>
                <rect x="296" y="174" width="20" height="3"   rx="1.5" fill="#6B7280" fillOpacity="0.35"/>
                {/* Phone CTA button */}
                <rect x="296" y="195" width="28" height="10" rx="4"   fill="#E85D04"/>
                <rect x="301" y="198" width="18" height="3"   rx="1.5" fill="white" fillOpacity="0.85"/>

                {/* ── Pen / pencil ── */}
                <rect x="82"  y="208" width="6"  height="40" rx="3"  fill="#E85D04" fillOpacity="0.5" transform="rotate(-10, 85, 220)"/>

                {/* ── Decorative dots ── */}
                <circle cx="50"  cy="112" r="4"   fill="#E85D04" fillOpacity="0.25"/>
                <circle cx="248" cy="134" r="3"   fill="#1B4332" fillOpacity="0.2"/>
                <circle cx="20"  cy="200" r="2.5" fill="#2563EB" fillOpacity="0.2"/>

                {/* ── Arrow: books → phone (visual metaphor) ── */}
                <path d="M90 175 Q195 100 285 162" stroke="#1B4332" strokeWidth="1.5" strokeDasharray="5 4" fill="none" strokeOpacity="0.2" strokeLinecap="round"/>
                <path d="M282 158 L285 162 L280 163" stroke="#1B4332" strokeWidth="1.5" fill="none" strokeOpacity="0.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>

              {/* Caption */}
              <p className="text-center text-xs text-gray-400 mt-2">
                机の上にあるものが全部このアプリに
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ② ══════════════════════════════════════════════════════════════════
          EMPATHY — こんな悩みありませんか？
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F8F9FA] px-4 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">共感</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-snug">
              理学療法士なら一度は感じたこと、<br className="hidden sm:block" />ありませんか？
            </h2>
          </div>

          {/* Pain cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {PAINS.map((p) => (
              <div
                key={p.text}
                className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-orange-200 transition text-center"
              >
                <p className="text-xs sm:text-sm text-gray-700 leading-snug font-medium">
                  {p.text}
                </p>
              </div>
            ))}
          </div>

          {/* Resolution statement */}
          <div
            className="rounded-2xl px-6 py-5 text-center text-white"
            style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)" }}
          >
            <p className="text-base sm:text-xl font-black tracking-wide">
              そのすべての悩み、PT Works が解決します
            </p>
            <p className="text-white/70 text-sm mt-1">
              臨床準備・副業・開業・集客 — 現役PTが作ったツールでキャリア全フェーズをサポート
            </p>
          </div>
        </div>
      </section>

      {/* ③ ══════════════════════════════════════════════════════════════════
          SOLUTION — ステージフロー
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-12">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">解決策</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
              PT Works は、理学療法士専用の AI ツールです
            </h2>
            <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              臨床前の準備から副業・開業まで。<br className="hidden sm:block" />
              現役PTが現場目線で作ったツールで、キャリア全フェーズをサポートします。
            </p>
          </div>

          {/* Stage flow */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3 mb-10">
            {STAGES_FLOW.map((s, i) => (
              <div key={s.num} className="flex sm:flex-col items-center gap-3 sm:gap-0 flex-1">

                {/* Card */}
                <Link
                  href={s.href}
                  className="flex-1 w-full bg-white rounded-2xl border-2 p-4 sm:p-5 text-center hover:shadow-md transition group"
                  style={{ borderColor: s.color }}
                >
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-3"
                    style={{ background: s.color }}
                  />
                  <p className="text-[10px] font-bold leading-snug mb-0.5" style={{ color: s.color }}>
                    {s.label}
                  </p>
                  <p className="font-black text-gray-900 text-sm mb-1">{s.title}</p>
                  <p className="text-[11px] text-gray-400 mb-2">{s.target}</p>
                  <p className="text-xs font-bold" style={{ color: s.color }}>{s.price}/月</p>
                </Link>

                {/* Arrow */}
                {i < STAGES_FLOW.length - 1 && (
                  <div className="text-gray-300 font-bold text-xl sm:mt-2 shrink-0">
                    <span className="hidden sm:block text-center w-full">↓</span>
                    <span className="sm:hidden">→</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Diagnosis CTA */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">あなたは今どのフェーズですか？</p>
            <Link
              href="/stage1"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-white text-sm transition hover:opacity-90 shadow-sm"
              style={{ background: "#E85D04" }}
            >
              無料でメディカルサーチを試す
            </Link>
          </div>
        </div>
      </section>

      {/* ④ ══════════════════════════════════════════════════════════════════
          FOUNDER STORY
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F8F9FA] px-4 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">

          {/* Section header */}
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">創業者</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              PT Works をつくった人
            </h2>
          </div>

          {/* ── Main card ── */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Top accent bar */}
            <div className="h-1.5" style={{ background: "linear-gradient(90deg, #1B4332, #E85D04)" }} />

            <div className="p-6 sm:p-10">

              {/* ── Two-column layout ── */}
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mb-8">

                {/* Left: Photo + Profile + Career */}
                <div className="flex flex-col items-center lg:items-start gap-4 lg:w-60 shrink-0">

                  {/* ── Photo placeholder ──
                      写真を追加する場合：
                      1. public/images/founder.jpg に写真を配置
                      2. 下の <div> ブロックを以下の <img> タグに差し替える
                         <img src="/images/founder.jpg" alt="藤 充輝"
                              className="w-full h-full object-cover" />
                  ── */}
                  <div className="relative w-40 h-40 lg:w-52 lg:h-52 rounded-2xl overflow-hidden shrink-0 mx-auto lg:mx-0 shadow-md border-2 border-gray-100">
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                      style={{ background: "linear-gradient(145deg, #ECFDF5, #D1FAE5)" }}
                    >
                      <span className="text-7xl leading-none">🙋‍♂️</span>
                      <span className="text-[10px] text-green-700 font-semibold bg-white/80 px-2.5 py-0.5 rounded-full shadow-sm">
                        Photo
                      </span>
                    </div>
                  </div>

                  {/* Name block */}
                  <div className="text-center lg:text-left w-full">
                    <p className="font-black text-gray-900 text-xl leading-tight">藤 充輝</p>
                    <p className="text-xs text-gray-400 mt-0.5 tracking-wider">とう みつき</p>
                    <div className="flex flex-wrap justify-center lg:justify-start gap-1.5 mt-2">
                      <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full"
                        style={{ background: "#1B4332" }}>理学療法士</span>
                      <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full"
                        style={{ background: "#E85D04" }}>PT Works 創業者</span>
                    </div>
                  </div>

                  {/* Career list */}
                  <div className="w-full">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5
                                  text-center lg:text-left">資格 · 経歴</p>
                    <ul className="space-y-1.5">
                      {[
                        { icon: "🏥", text: "理学療法士 国家資格保有",          color: "#1B4332" },
                        { icon: "📅", text: "PT歴5年目",                        color: "#6B7280" },
                        { icon: "🏨", text: "整形外科病院勤務",                  color: "#6B7280" },
                        { icon: "🏢", text: "整体院 店長",                       color: "#6B7280" },
                        { icon: "💪", text: "筋膜マニピュレーション Level1",      color: "#2563EB" },
                        { icon: "🛶", text: "カヌーポロ日本代表コーチ",           color: "#7C3AED" },
                        { icon: "🌍", text: "世界大会出場",                       color: "#E85D04" },
                        { icon: "🌏", text: "アジア大会出場",                     color: "#E85D04" },
                      ].map((item) => (
                        <li key={item.text}
                          className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="text-base shrink-0">{item.icon}</span>
                          <span className="font-medium">{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href="/about"
                    className="text-xs font-bold text-[#E85D04] hover:underline hidden lg:block"
                  >
                    詳しいプロフィール →
                  </Link>
                </div>

                {/* Right: Story */}
                <div className="flex-1 min-w-0">
                  {/* "現役PTが作った" highlight */}
                  <div
                    className="inline-flex items-center rounded-full px-3 py-1.5 mb-5 text-xs font-bold text-white"
                    style={{ background: "#1B4332" }}
                  >
                    👨‍⚕️ 現役PTが作った、臨床の質を上げるための準備ツール
                  </div>

                  {/* Story text */}
                  <div className="space-y-4 text-gray-700 text-sm sm:text-[15px] leading-[1.95]">
                    <p>
                      PT歴5年目、整形外科で働き、<br />
                      整体院の店長も経験してきた私が<br />
                      PT Worksを作ろうと思ったきっかけは<br />
                      <span className="font-bold text-gray-900">周りの仲間たちの悩み</span>でした。
                    </p>
                    <p>
                      資格を持っているのに給料は上がらない。<br />
                      副業したいけど何から始めればいいかわからない。<br />
                      独立したいけど集客も経営もわからない。
                    </p>
                    <p>
                      同じ職場の仲間、学生時代の友人、<br />
                      みんな同じ壁にぶつかっていました。
                    </p>
                    <p>
                      私自身も整体院の店長として<br />
                      集客・SNS・書類作成に追われた経験があります。<br />
                      その時に思ったのは<br />
                      <span className="font-bold text-gray-900">「AIがあれば全部解決できるのに」</span>ということ。
                    </p>
                    <p>
                      PT Works は、<span className="font-bold text-gray-900">現場を知るPTが<br className="hidden sm:block" />
                      現場のために作ったAIツール</span>です。<br />
                      同じ悩みを持つ仲間の力になりたい。<br />
                      その思いだけで作りました。
                    </p>
                  </div>

                  <Link
                    href="/about"
                    className="text-xs font-bold text-[#E85D04] hover:underline mt-5 inline-block lg:hidden"
                  >
                    詳しいプロフィール →
                  </Link>
                </div>
              </div>

              {/* ── Bottom trust strip ── */}
              <div className="pt-5 border-t border-gray-100 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {[
                  { icon: "🏥", label: "理学療法士 国家資格",          color: "#1B4332", bg: "#DCFCE7" },
                  { icon: "💪", label: "筋膜マニピュレーション Level1",  color: "#2563EB", bg: "#DBEAFE" },
                  { icon: "🛶", label: "カヌーポロ日本代表コーチ",       color: "#7C3AED", bg: "#EDE9FE" },
                  { icon: "🌍", label: "世界大会出場",                   color: "#E85D04", bg: "#FEF3C7" },
                  { icon: "🌏", label: "アジア大会出場",                 color: "#E85D04", bg: "#FEF3C7" },
                ].map((b) => (
                  <div
                    key={b.label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border"
                    style={{ background: b.bg, color: b.color, borderColor: b.color + "33" }}
                  >
                    <span className="text-sm">{b.icon}</span>
                    {b.label}
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Bottom trust note */}
          <div className="mt-5 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-5 py-3 shadow-sm">
              <span className="text-lg">👨‍⚕️</span>
              <p className="text-sm font-bold text-green-800">
                現役PTが、現場を知っているから作れた — PT Works は現役理学療法士が開発・運営しています
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ⑤ ══════════════════════════════════════════════════════════════════
          FEATURES — 悩み → 解決策
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">

          <div className="text-center mb-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">できること</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">PT Works でできること</h2>
          </div>

          <div className="space-y-3">
            {SOLUTIONS.map((s) => (
              <Link
                key={s.pain}
                href={s.href}
                className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 px-5 py-4 shadow-sm hover:border-orange-300 hover:shadow-md transition group"
              >
                {/* Pain */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-semibold mb-0.5">悩み</p>
                  <p className="text-sm text-gray-600 font-medium leading-snug truncate">
                    {s.pain}
                  </p>
                </div>

                {/* Arrow */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                    style={{ background: "#E85D04" }}
                  >
                    →
                  </div>
                </div>

                {/* Fix */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "#1B4332" }}>解決策</p>
                  <p className="text-sm font-bold text-gray-900 leading-snug group-hover:text-[#E85D04] transition">
                    {s.fix}
                  </p>
                </div>

              </Link>
            ))}
          </div>

          {/* ── Screen mockups ── */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Mockup 1: Medical Search */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              {/* Browser bar */}
              <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-300" />
                  <div className="w-3 h-3 rounded-full bg-yellow-300" />
                  <div className="w-3 h-3 rounded-full bg-green-300" />
                </div>
                <div className="flex-1 bg-white rounded px-2 py-1 text-[10px] text-gray-400 text-center">
                  ptworks.app/stage1
                </div>
              </div>
              {/* Screen content */}
              <div className="bg-white p-4 space-y-2.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">疾患AI検索</p>
                {/* Search bar */}
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-400">変形性膝関節症</span>
                  <span className="ml-auto text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded">検索</span>
                </div>
                {/* Results preview */}
                <div className="space-y-1.5">
                  {["定義・概要", "主な症状", "理学所見", "画像所見", "治療アプローチ", "リハ目標", "患者指導"].map((item, i) => (
                    <div key={item} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-xs text-gray-600 font-medium">{item}</span>
                      <span className="ml-auto w-12 h-1.5 bg-green-200 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mockup 2: Slide generation */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              {/* Browser bar */}
              <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-300" />
                  <div className="w-3 h-3 rounded-full bg-yellow-300" />
                  <div className="w-3 h-3 rounded-full bg-green-300" />
                </div>
                <div className="flex-1 bg-white rounded px-2 py-1 text-[10px] text-gray-400 text-center">
                  ptworks.app/stage1/slides
                </div>
              </div>
              {/* Screen content */}
              <div className="bg-white p-4 space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">スライド自動生成</p>
                {/* Two slide thumbnails side by side */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Title slide */}
                  <div className="rounded-lg border border-gray-200 overflow-hidden aspect-[16/9] flex flex-col"
                    style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)" }}>
                    <div className="flex-1 flex flex-col items-center justify-center p-2 text-center">
                      <p className="text-white font-black text-[8px] leading-tight">変形性膝関節症の<br />リハビリテーション</p>
                      <p className="text-white/60 text-[7px] mt-1">症例報告</p>
                    </div>
                    <div className="bg-white/10 px-2 py-1">
                      <p className="text-white/60 text-[7px]">PT Works 自動生成</p>
                    </div>
                  </div>
                  {/* Content slide */}
                  <div className="rounded-lg border border-gray-200 overflow-hidden aspect-[16/9] flex flex-col bg-white">
                    <div className="bg-[#1B4332] px-2 py-1">
                      <p className="text-white text-[7px] font-bold">初期評価と問題点</p>
                    </div>
                    <div className="flex-1 p-1.5 space-y-1">
                      {["ROM: 膝屈曲 90°制限", "MMT: 大腿四頭筋 4-", "動作: 立ち上がり困難"].map(t => (
                        <div key={t} className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-[#E85D04] shrink-0" />
                          <span className="text-[7px] text-gray-600">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 text-[10px] font-bold text-white bg-[#1B4332] rounded-lg py-1.5">PDFで保存</button>
                  <button className="flex-1 text-[10px] font-bold text-gray-500 border border-gray-200 rounded-lg py-1.5">編集する</button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              href="/stage1"
              className="inline-block px-8 py-3 rounded-xl font-bold text-white text-sm transition hover:opacity-90 shadow-sm"
              style={{ background: "#E85D04" }}
            >
              まずメディカルサーチを試してみる →
            </Link>
          </div>
        </div>
      </section>

      {/* ⑥ ══════════════════════════════════════════════════════════════════
          REVIEWS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F8F9FA] px-4 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">ユーザーの声</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              PT Works を使った理学療法士の声
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {REVIEWS.map((r, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition"
              >
                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-3">
                  {[...Array(r.stars)].map((_, j) => (
                    <span key={j} className="text-[#E85D04] text-sm">★</span>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                  「{r.text}」
                </p>

                {/* Profile */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                    style={{ background: r.color }}
                  >
                    {r.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Credibility note */}
          <p className="text-center text-xs text-gray-400 mt-5">
            ※ 掲載されているレビューはモニターユーザーによるものです
          </p>
        </div>
      </section>

      {/* ⑦ ══════════════════════════════════════════════════════════════════
          COMPETITOR COMPARISON
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F8F9FA] px-4 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">比較</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              なぜ PT Works が選ばれるのか
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              既存サービスと比較してみてください
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border-2 border-orange-200 shadow-sm bg-white">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-4 text-xs font-bold text-gray-500 w-[32%]">比較項目</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400">セラピスト.com</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400">汎用AI<br /><span className="font-normal text-[10px]">ChatGPT等</span></th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400">院運営<br /><span className="font-normal text-[10px]">コンサル</span></th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-[#E85D04] bg-orange-50 border-l-2 border-orange-300">
                    PT Works
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { item: "PTに特化した疾患情報",  others: [false, false, false], ptworks: true  },
                  { item: "治療アプローチAI生成",   others: [false, false, false], ptworks: true  },
                  { item: "スライド自動生成",        others: [false, false, false], ptworks: true  },
                  { item: "副業診断・ロードマップ",  others: [false, false, false], ptworks: true  },
                  { item: "SNS・ブログ文章生成",     others: [false, true,  false], ptworks: true  },
                  { item: "口コミ返信文の自動生成",  others: [false, false, false], ptworks: true  },
                ].map((row, i) => (
                  <tr key={row.item} className={`border-t border-gray-100 ${i % 2 === 1 ? "bg-gray-50/40" : "bg-white"}`}>
                    <td className="px-5 py-3.5 text-xs font-semibold text-gray-700">{row.item}</td>
                    {row.others.map((ok, j) => (
                      <td key={j} className="px-4 py-3.5 text-center">
                        {ok ? (
                          <span className="text-lg font-black leading-none" style={{ color: "#9CA3AF" }}>○</span>
                        ) : (
                          <span className="text-base font-black leading-none" style={{ color: "#EF4444" }}>✕</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3.5 text-center bg-orange-50/50 border-l-2 border-orange-300">
                      <span className="text-lg font-black leading-none" style={{ color: "#E85D04" }}>○</span>
                    </td>
                  </tr>
                ))}
                {/* Cost row */}
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="px-5 py-3.5 text-xs font-semibold text-gray-700">費用</td>
                  {[
                    { text: "無料", sub: "" },
                    { text: "無料〜", sub: "¥3,000/月" },
                    { text: "¥30,000〜", sub: "¥100,000/月" },
                  ].map((v, j) => (
                    <td key={j} className="px-4 py-3.5 text-center">
                      <span className="text-xs font-bold text-gray-500 block">{v.text}</span>
                      {v.sub && <span className="text-[10px] text-gray-400">{v.sub}</span>}
                    </td>
                  ))}
                  <td className="px-4 py-3.5 text-center bg-orange-50/50 border-l-2 border-orange-300">
                    <span className="text-xs font-bold text-[#E85D04] block">¥0〜</span>
                    <span className="text-[10px] text-[#E85D04]/70">¥6,980/月</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-4 mt-3 pr-1">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="font-black text-base leading-none" style={{ color: "#E85D04" }}>○</span> PT Works
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="font-black text-base leading-none" style={{ color: "#9CA3AF" }}>○</span> 他社あり
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="font-black text-base leading-none" style={{ color: "#EF4444" }}>✕</span> 他社なし
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            ※ 各サービスの機能は調査時点のものです
          </p>
        </div>
      </section>

      {/* ⑧ ══════════════════════════════════════════════════════════════════
          PRICING (simplified)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">料金プラン</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              まず無料から始められます
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              全パックは下位パックの機能を含みます。いつでもアップグレード・解約可能
            </p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {PLAN_SUMMARY.map((p) => (
              <div
                key={p.label}
                className="relative bg-white rounded-2xl border-2 p-4 text-center hover:shadow-md transition"
                style={{ borderColor: p.color }}
              >
                {p.badge && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black text-white px-2.5 py-0.5 rounded-full shadow-sm"
                    style={{ background: p.color }}
                  >
                    {p.badge}
                  </span>
                )}
                <p className="text-xs font-bold mb-1" style={{ color: p.color }}>{p.label}</p>
                <p className="text-xl font-black text-gray-900">{p.price}</p>
                <p className="text-[10px] text-gray-400 mb-2">/{p.sub}</p>
                <p className="text-[11px] text-gray-500 leading-snug">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 text-sm hover:border-orange-300 hover:bg-orange-50 transition"
            >
              料金プランを詳しく見る →
            </Link>
          </div>
        </div>
      </section>

      {/* ⑨ ══════════════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="px-4 py-16 sm:py-24 text-white"
        style={{ background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #1B4332 100%)" }}
      >
        <div className="max-w-2xl mx-auto text-center">

          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5 text-xs font-bold text-white/80">
            👨‍⚕️ 現役理学療法士が開発・運営中
          </div>
          <h2 className="text-2xl sm:text-4xl font-black mb-4 leading-tight">
            臨床の質を上げる準備を、<br />今日から始めてみてください
          </h2>

          <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-2">
            クレジットカード不要・30秒で登録完了
          </p>
          <p className="text-white/60 text-sm mb-10">
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

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-5 mt-8">
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
