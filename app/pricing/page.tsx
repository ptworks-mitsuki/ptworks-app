import React from "react";
import Link from "next/link";
import { FaqItem } from "@/components/FaqItem";

export const dynamic = "force-static";

// ── Plan cards ────────────────────────────────────────────────────────────

const PLANS = [
  {
    id:           "free",
    label:        "無料プラン",
    price:        "¥0",
    firstPrice:   null,
    period:       "ずっと無料",
    tagline:      "まずは試してみたい方へ",
    color:        "#6B7280",
    border:       "border-gray-300",
    btnStyle:     { background: "#6B7280" },
    btnLabel:     "無料で始める",
    href:         "/register",
    recommended:  false,
    badge:        null,
    guarantee:    null,
    target:       "まずは試してみたい方",
    features:     [
      { label: "メディカルサーチ（月5回）",    ok: true  },
      { label: "副業診断 1回無料体験",         ok: true  },
      { label: "メディカルサーチ無制限",       ok: false },
      { label: "治療を考える・何でも相談する",        ok: false },
      { label: "スライド自動生成",             ok: false },
    ],
  },
  {
    id:           "stage1",
    label:        "臨床サポートパック",
    price:        "¥980",
    firstPrice:   null,
    period:       "月",
    tagline:      "臨床の準備を、もっと速く。毎日使う道具として",
    color:        "#1B4332",
    border:       "border-green-600",
    btnStyle:     { background: "#1B4332" },
    btnLabel:     "このパックで始める",
    href:         "/register?plan=stage1",
    recommended:  true,
    badge:        "人気No.1",
    guarantee:    null,
    target:       "臨床力を高めたい現役PT",
    features:     [
      { label: "メディカルサーチ無制限",        ok: true },
      { label: "疾患を調べる・治療を考える・何でも相談する", ok: true },
      { label: "患者説明文の自動生成",          ok: true },
      { label: "スライド自動生成",              ok: true },
      { label: "副業診断 1回無料体験付き",      ok: true },
    ],
  },
  {
    id:           "stage2",
    label:        "副業支援パック",
    price:        "¥3,980",
    firstPrice:   "¥980",
    period:       "月",
    tagline:      "知識を収入に変える仕組みを、まるごと提供",
    color:        "#2563EB",
    border:       "border-blue-500",
    btnStyle:     { background: "#2563EB" },
    btnLabel:     "このパックで始める",
    href:         "/register?plan=stage2",
    recommended:  false,
    badge:        "初月¥980",
    guarantee:    "3ヶ月返金保証",
    target:       "副業・収入アップを目指すPT",
    features:     [
      { label: "臨床サポートの全機能",             ok: true },
      { label: "セミナー動画・PDF 投稿・販売",      ok: true },
      { label: "収益 50% 還元",                    ok: true },
      { label: "AIコーチング・SNS記事生成",         ok: true },
      { label: "収益管理ダッシュボード",            ok: true },
      { label: "3ヶ月返金保証付き",                ok: true },
    ],
  },
  {
    id:           "stage3",
    label:        "開業・院運営パック",
    price:        "¥5,980",
    firstPrice:   "¥2,980",
    period:       "月",
    tagline:      "院の集客・運営をAIに任せて本業に集中",
    color:        "#7C3AED",
    border:       "border-purple-500",
    btnStyle:     { background: "#7C3AED" },
    btnLabel:     "このパックで始める",
    href:         "/register?plan=stage3",
    recommended:  false,
    badge:        "初月¥2,980",
    guarantee:    null,
    target:       "整体院・クリニック運営者",
    features:     [
      { label: "副業支援の全機能",                 ok: true },
      { label: "口コミ返信・SNS投稿生成",           ok: true },
      { label: "確定申告補助",                     ok: true },
      { label: "Googleビジネス最適化",             ok: true },
    ],
  },
  {
    id:           "stage4",
    label:        "全部入りパック",
    price:        "¥6,980",
    firstPrice:   "¥3,480",
    period:       "月",
    tagline:      "全機能使い放題＋優先サポート＋新機能先行アクセス",
    color:        "#E85D04",
    border:       "border-orange-500",
    btnStyle:     { background: "#E85D04" },
    btnLabel:     "このパックで始める",
    href:         "/register?plan=stage4",
    recommended:  false,
    badge:        "初月¥3,480",
    guarantee:    null,
    target:       "PTとしてキャリアを最大化したい方",
    features:     [
      { label: "全機能使い放題",               ok: true },
      { label: "優先サポート",                 ok: true },
      { label: "新機能先行アクセス",           ok: true },
    ],
  },
] as const;

// ── Simplified comparison table (12 rows) ─────────────────────────────────

type Col = "free" | "stage1" | "stage2" | "stage3" | "stage4";

interface FeatureRow {
  label:  string;
  free:   boolean | string;
  stage1: boolean | string;
  stage2: boolean | string;
  stage3: boolean | string;
  stage4: boolean | string;
}

const TABLE_ROWS: FeatureRow[] = [
  { label: "疾患AI検索",            free: "月5回", stage1: true,  stage2: true,  stage3: true,  stage4: true  },
  { label: "症例相談",              free: false,   stage1: true,  stage2: true,  stage3: true,  stage4: true  },
  { label: "スライド自動生成",      free: false,   stage1: true,  stage2: true,  stage3: true,  stage4: true  },
  { label: "学習コンテンツ",        free: "一部",  stage1: true,  stage2: true,  stage3: true,  stage4: true  },
  { label: "副業診断・ロードマップ", free: false,  stage1: false, stage2: true,  stage3: true,  stage4: true  },
  { label: "AIコーチング",          free: false,   stage1: false, stage2: true,  stage3: true,  stage4: true  },
  { label: "SNS・ブログ文章生成",   free: false,   stage1: false, stage2: true,  stage3: true,  stage4: true  },
  { label: "収益管理ダッシュボード", free: false,  stage1: false, stage2: true,  stage3: true,  stage4: true  },
  { label: "口コミ返信生成",        free: false,   stage1: false, stage2: false, stage3: true,  stage4: true  },
  { label: "Google集客最適化",      free: false,   stage1: false, stage2: false, stage3: true,  stage4: true  },
  { label: "確定申告補助",          free: false,   stage1: false, stage2: false, stage3: true,  stage4: true  },
  { label: "優先サポート",          free: false,   stage1: false, stage2: false, stage3: false, stage4: true  },
];

const PLAN_COLS: { id: Col; label: string; price: string; color: string }[] = [
  { id: "free",   label: "無料",    price: "¥0",     color: "#6B7280" },
  { id: "stage1", label: "臨床",    price: "¥980",   color: "#1B4332" },
  { id: "stage2", label: "副業",    price: "¥3,980", color: "#2563EB" },
  { id: "stage3", label: "開業",    price: "¥5,980", color: "#E85D04" },
  { id: "stage4", label: "全部入り", price: "¥6,980", color: "#B45309" },
];

function Cell({ val }: { val: boolean | string }) {
  if (val === true)  return <span className="text-lg font-black leading-none" style={{ color: "#E85D04" }}>○</span>;
  if (val === false) return <span className="text-sm text-gray-300 font-bold">—</span>;
  // string value
  return <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">{val}</span>;
}

// ── FAQ ───────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "いつでも解約できますか？",
    a: "はい、いつでも解約できます。解約後は次の請求日まで現在のパックをご利用いただけます。解約の手続きはマイページから数クリックで完了します。",
  },
  {
    q: "パックの変更はできますか？",
    a: "はい、いつでもパックのアップグレード・ダウングレードが可能です。アップグレードの場合は即座に新しい機能が使えます。ダウングレードは次の請求日から適用されます。",
  },
  {
    q: "上位パックに変更したら下位の機能も使えますか？",
    a: "はい、全てのパックは下位パックの全機能を含みます。例えば開業・院運営パックに加入すると臨床サポートパックと副業支援パックの全機能も利用できます。",
  },
  {
    q: "クレジットカード以外の支払い方法はありますか？",
    a: "現在はクレジットカード（VISA・Mastercard・JCB等）に対応しています。法人向けの請求書払いは近日対応予定です。",
  },
  {
    q: "無料プランから有料パックへのデータは引き継がれますか？",
    a: "はい、ブックマーク・検索履歴・学習進捗データは全て引き継がれます。アップグレードしてもデータが失われることはありません。",
  },
];

// ── Mockup screens ────────────────────────────────────────────────────────

function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md">
      <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-300" />
          <div className="w-3 h-3 rounded-full bg-yellow-300" />
          <div className="w-3 h-3 rounded-full bg-green-300" />
        </div>
        <div className="flex-1 bg-white rounded px-2 py-1 text-[10px] text-gray-400 text-center truncate">{url}</div>
      </div>
      {children}
    </div>
  );
}

function MockupSearch() {
  return (
    <BrowserFrame url="ptworks.app/stage1">
      <div className="bg-white p-4 space-y-2.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">疾患AI検索</p>
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
          <span className="text-xs text-gray-500 flex-1">変形性膝関節症</span>
          <span className="text-[10px] bg-[#1B4332] text-white px-2 py-0.5 rounded font-bold">検索</span>
        </div>
        <div className="space-y-1.5">
          {["定義・概要", "主な症状", "理学所見", "画像所見", "治療アプローチ", "リハ目標", "患者指導"].map((item, i) => (
            <div key={item} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
              <span className="w-4 h-4 rounded-full bg-green-100 text-[#1B4332] text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="text-xs text-gray-600 font-medium">{item}</span>
              <span className="ml-auto w-10 h-1.5 bg-green-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

function MockupFukugyou() {
  return (
    <BrowserFrame url="ptworks.app/stage2">
      <div className="bg-white p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">副業診断結果</p>
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <p className="text-[10px] text-blue-500 font-semibold mb-0.5">あなたに最適な副業</p>
          <p className="text-sm font-black text-blue-800">訪問リハビリ</p>
          <p className="text-[10px] text-blue-500 mt-0.5">適性スコア 92点</p>
        </div>
        {[
          { label: "訪問リハビリ", pct: 92 },
          { label: "オンライン相談", pct: 74 },
          { label: "セミナー講師", pct: 60 },
        ].map(({ label, pct }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-24 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { label: "今月の収入", value: "¥58,000", color: "#2563EB" },
            { label: "純利益",     value: "¥46,000", color: "#1B4332" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-[9px] text-gray-400">{label}</p>
              <p className="text-xs font-black" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

function MockupKuchikomi() {
  return (
    <BrowserFrame url="ptworks.app/stage3">
      <div className="bg-white p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">口コミ返信文生成</p>
        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
          <p className="text-[9px] text-gray-400 mb-1 font-semibold">受け取った口コミ</p>
          <p className="text-[10px] text-gray-700 leading-relaxed">「先生が丁寧で施術後は膝の痛みが楽になりました。また通いたいです。」</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-2.5 border border-orange-100">
          <p className="text-[9px] text-orange-500 mb-1 font-semibold">AI生成の返信文</p>
          <p className="text-[10px] text-gray-700 leading-relaxed">「温かいお言葉をいただきありがとうございます。お体の回復のお役に立てて光栄です。またのご来院を心よりお待ちしております。」</p>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 text-[10px] font-bold text-white bg-[#E85D04] rounded-lg py-1.5">コピーする</button>
          <button className="flex-1 text-[10px] font-bold text-gray-500 border border-gray-200 rounded-lg py-1.5">再生成</button>
        </div>
      </div>
    </BrowserFrame>
  );
}

function MockupDashboard() {
  return (
    <BrowserFrame url="ptworks.app/stage4">
      <div className="bg-white p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">ダッシュボード</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "今月の検索",    value: "127回",   color: "#1B4332" },
            { label: "副業収入",      value: "¥58,000", color: "#2563EB" },
            { label: "口コミ返信",    value: "12件",    color: "#E85D04" },
            { label: "スライド生成",  value: "3件",     color: "#B45309" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
              <p className="text-[9px] text-gray-400">{label}</p>
              <p className="text-sm font-black" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
          <p className="text-[9px] text-amber-700 font-semibold mb-1">今月のAIコーチング提案</p>
          <p className="text-[10px] text-gray-700">SNSで症例紹介を週2回投稿すると問い合わせが増加する見込みです。</p>
        </div>
        <div className="flex gap-1.5">
          <div className="flex-1 bg-green-50 rounded-lg p-1.5 text-center">
            <p className="text-[9px] text-green-600 font-bold">優先サポート</p>
            <p className="text-[9px] text-gray-500">返答 3分以内</p>
          </div>
          <div className="flex-1 bg-amber-50 rounded-lg p-1.5 text-center">
            <p className="text-[9px] text-amber-600 font-bold">AIキャリア相談</p>
            <p className="text-[9px] text-gray-500">今月 残り1回</p>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

// ── Pack detail data ──────────────────────────────────────────────────────

interface PackDetail {
  id: string;
  label: string;
  price: string;
  heading: string;
  color: string;
  bgLight: string;
  border: string;
  href: string;
  target: string;
  included?: string;
  features: readonly string[];
  mockup: React.ReactNode;
  flip: boolean;
}

const PACK_DETAILS: PackDetail[] = [
  {
    id:       "stage1",
    label:    "臨床サポートパック",
    price:    "¥980/月",
    heading:  "PTの辞書として毎日使える",
    color:    "#1B4332",
    bgLight:  "#F0FDF4",
    border:   "#BBF7D0",
    href:     "/register?plan=stage1",
    target:   "新人〜中堅PT・OT・ST・整体師・学生",
    features: [
      "疾患名・症状・部位から即座に臨床情報を検索",
      "病態・評価・治療アプローチを7項目で表示",
      "患者状態に合わせた治療アプローチを絞り込み",
      "症例をAIに相談できる",
      "自主トレ指導書を自動作成",
      "学会発表スライドを自動生成",
    ],
    mockup: <MockupSearch />,
    flip:   false,
  },
  {
    id:       "stage2",
    label:    "副業支援パック",
    price:    "¥3,980/月",
    heading:  "副業収入の第一歩をAIがサポート",
    color:    "#2563EB",
    bgLight:  "#EFF6FF",
    border:   "#BFDBFE",
    href:     "/register?plan=stage2",
    target:   "副業を始めたい・収入を上げたいPT",
    included: "臨床サポートパックの全機能に加えて",
    features: [
      "副業診断で自分に合った副業を見つける",
      "AIコーチングが今月やるべきことを提案",
      "SNS投稿文・ブログ記事・LP文章をAIが生成",
      "収益管理ダッシュボードで副業収入を管理",
      "先輩PTの成功事例を参考にできる",
    ],
    mockup: <MockupFukugyou />,
    flip:   true,
  },
  {
    id:       "stage3",
    label:    "開業・院運営パック",
    price:    "¥5,980/月",
    heading:  "院運営をAIに任せて施術に集中できる",
    color:    "#E85D04",
    bgLight:  "#FFF7ED",
    border:   "#FED7AA",
    href:     "/register?plan=stage3",
    target:   "独立準備中・開業済みの院オーナー",
    included: "副業支援パックの全機能に加えて",
    features: [
      "口コミ返信文をAIが自動生成",
      "SNS投稿文・症例ブログ記事を自動生成",
      "Googleビジネスプロフィールを最適化",
      "問い合わせ対応チャットボット",
      "確定申告・経費管理を補助",
    ],
    mockup: <MockupKuchikomi />,
    flip:   false,
  },
  {
    id:       "stage4",
    label:    "全部入りパック",
    price:    "¥6,980/月",
    heading:  "PTのキャリア全てをAIが支援",
    color:    "#B45309",
    bgLight:  "#FFFBEB",
    border:   "#FDE68A",
    href:     "/register?plan=stage4",
    target:   "全機能をコスパよく使いたいPT・院オーナー",
    included: "全パックの機能を使い放題に加えて",
    features: [
      "優先サポート（専用チャット）",
      "新機能の先行アクセス",
      "月1回 AIキャリア相談",
    ],
    mockup: <MockupDashboard />,
    flip:   true,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <main className="bg-[#F8F9FA] min-h-screen">

      {/* Hero */}
      <div className="bg-white border-b border-gray-200 py-10 px-4 text-center">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">料金プラン</p>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">あなたのキャリアに合ったパックを選ぼう</h1>
        <p className="text-gray-500 text-sm">全パックは下位パックの機能を含みます。いつでもアップグレード・解約可能</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* ── Plan cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-14">
          {PLANS.map(plan => (
            <div key={plan.id}
              className={`relative bg-white rounded-2xl border-2 ${plan.border} flex flex-col shadow-sm transition hover:shadow-md hover:-translate-y-0.5 ${
                plan.recommended ? "ring-2 ring-green-400 ring-offset-2" : ""
              }`}>

              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm">
                    {plan.badge}
                  </span>
                </div>
              )}
              {!plan.recommended && plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm"
                    style={{ background: plan.color, color: "#fff" }}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="p-4 flex-1">
                <p className="font-black text-sm mb-1.5 leading-snug" style={{ color: plan.color }}>{plan.label}</p>
                <div className="mb-3">
                  {"firstPrice" in plan && plan.firstPrice ? (
                    <>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black" style={{ color: plan.color }}>{plan.firstPrice}</span>
                        <span className="text-[10px] text-gray-400">初月</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-gray-400 line-through">{plan.price}</span>
                        <span className="text-[10px] text-gray-400">2ヶ月目〜/{plan.period}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-gray-900">{plan.price}</span>
                      {plan.period !== "ずっと無料" && (
                        <span className="text-xs text-gray-400 ml-1">/{plan.period}</span>
                      )}
                      {plan.period === "ずっと無料" && (
                        <p className="text-[10px] text-gray-400">{plan.period}</p>
                      )}
                    </>
                  )}
                </div>
                {"guarantee" in plan && plan.guarantee && (
                  <div className="mb-2 inline-flex items-center gap-1 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                    <span className="text-[10px] font-bold text-green-700">{plan.guarantee}</span>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg px-2.5 py-2 mb-3">
                  <p className="text-[10px] text-gray-400 font-semibold mb-0.5">こんな人に</p>
                  <p className="text-xs text-gray-700 font-medium">{plan.target}</p>
                </div>

                <ul className="space-y-1.5">
                  {plan.features.map(f => (
                    <li key={f.label} className="flex items-start gap-1.5 text-xs">
                      {f.ok ? (
                        <span className="font-black shrink-0 mt-0.5 leading-none text-base" style={{ color: plan.color }}>○</span>
                      ) : (
                        <span className="text-gray-300 shrink-0 mt-0.5 font-bold text-sm leading-none">—</span>
                      )}
                      <span className={f.ok ? "text-gray-700" : "text-gray-400"}>{f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 pt-0">
                <Link href={plan.href}
                  className="block w-full py-2.5 rounded-xl font-bold text-white text-xs text-center transition hover:opacity-90 shadow-sm"
                  style={plan.btnStyle}>
                  {plan.btnLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* ── 初月割引の説明 ── */}
        <div className="mb-10 bg-blue-50 border border-blue-200 rounded-2xl px-6 py-5">
          <p className="text-sm font-black text-blue-800 mb-2">初月割引についての説明</p>
          <p className="text-sm text-blue-700 leading-relaxed">
            副業支援パックは初月¥980で全機能を体験できます。<br />
            2ヶ月目から通常価格¥3,980になります。<br />
            まず試してみてください。
          </p>
          <p className="text-xs text-blue-500 mt-2">
            ※ 開業・院運営パック（初月¥2,980）、全部入りパック（初月¥3,480）も同様です。
          </p>
        </div>

        {/* ── Comparison table ── */}
        <div className="mb-14">
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-gray-900">全パック機能比較</h2>
            <p className="text-sm text-gray-500 mt-1">各パックで使える機能を一目で確認できます</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 w-[36%]">機能</th>
                    {PLAN_COLS.map(col => (
                      <th key={col.id}
                        className="text-center px-3 py-3.5 text-xs font-bold border-l border-gray-100"
                        style={{ color: col.color }}>
                        {col.label}
                        <span className="block text-[9px] font-normal text-gray-400">{col.price}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABLE_ROWS.map((row, i) => (
                    <tr key={row.label}
                      className={`border-t border-gray-100 hover:bg-orange-50/10 transition ${i % 2 === 1 ? "bg-gray-50/30" : "bg-white"}`}>
                      <td className="px-5 py-3 text-xs font-semibold text-gray-700">{row.label}</td>
                      {PLAN_COLS.map(col => (
                        <td key={col.id} className="text-center px-3 py-3 border-l border-gray-100">
                          <Cell val={row[col.id]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-5 mt-3 pr-1">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="font-black text-base leading-none" style={{ color: "#E85D04" }}>○</span> 利用可能
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="font-bold text-sm text-gray-300">—</span> 利用不可
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-2">
            ※ 副業支援パック・開業・院運営パック・全部入りパックは現在開発中です。リリース時にメールでお知らせします。
          </p>
        </div>

        {/* ── Pack detail sections ── */}
        <div className="mb-14 space-y-16">
          <div className="text-center mb-2">
            <h2 className="text-xl font-black text-gray-900">各パックの詳細</h2>
          </div>

          {PACK_DETAILS.map((pack) => (
            <div
              key={pack.id}
              className="rounded-3xl overflow-hidden border-2 shadow-sm"
              style={{ borderColor: pack.border, background: pack.bgLight }}
            >
              <div className={`flex flex-col ${pack.flip ? "lg:flex-row-reverse" : "lg:flex-row"} gap-0`}>

                {/* Text side */}
                <div className="flex-1 p-7 sm:p-10 flex flex-col justify-center">
                  <div className="mb-4">
                    <span className="inline-block text-xs font-bold px-3 py-1 rounded-full text-white mb-2"
                      style={{ background: pack.color }}>
                      {pack.label} · {pack.price}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black leading-tight" style={{ color: pack.color }}>
                      {pack.heading}
                    </h3>
                  </div>

                  {pack.included && (
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                      {pack.included}
                    </p>
                  )}

                  <ul className="space-y-2.5 mb-6">
                    {pack.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <span className="font-black text-base leading-snug shrink-0" style={{ color: pack.color }}>○</span>
                        <span className="leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Link
                      href={pack.href}
                      className="inline-block px-6 py-2.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90 shadow-sm"
                      style={{ background: pack.color }}
                    >
                      このパックで始める →
                    </Link>
                    <div className="text-xs text-gray-500">
                      <span className="font-semibold">対象：</span>{pack.target}
                    </div>
                  </div>
                </div>

                {/* Mockup side */}
                <div className="flex-1 p-6 sm:p-8 flex items-center justify-center bg-white/60">
                  <div className="w-full max-w-sm">
                    {pack.mockup}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-gray-900">よくある質問</h2>
          </div>
          <div className="space-y-2 mb-8">
            {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">他にご不明な点がございましたら</p>
            <a href="mailto:support@ptworks.jp"
              className="inline-block px-6 py-2.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90 shadow-sm"
              style={{ background: "#E85D04" }}>
              お問い合わせする
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
