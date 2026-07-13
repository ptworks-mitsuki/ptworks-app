import React from "react";
import Link from "next/link";
import { FaqItem } from "@/components/FaqItem";

export const dynamic = "force-static";

// ── Plan cards ────────────────────────────────────────────────────────────

const PLANS = [
  {
    id:          "free",
    label:       "無料プラン",
    price:       "¥0",
    period:      "ずっと無料",
    target:      "まずは試してみたい方",
    color:       "#6B7280",
    borderCls:   "border-gray-300",
    btnStyle:    { background: "#6B7280" },
    btnLabel:    "無料で始める",
    href:        "/register",
    recommended: false,
    badge:       null as string | null,
    features:    [
      { label: "PT専用GPT（月5回）",  ok: true  },
      { label: "文献検索（月5回）",   ok: true  },
    ],
  },
  {
    id:          "basic",
    label:       "臨床サポートパック",
    price:       "¥980",
    period:      "月",
    target:      "日々の臨床でPT専用GPTを活用したいPT",
    color:       "#1B4332",
    borderCls:   "border-green-600",
    btnStyle:    { background: "#1B4332" },
    btnLabel:    "このパックで始める",
    href:        "/register?plan=basic",
    recommended: true,
    badge:       "人気No.1" as string | null,
    features:    [
      { label: "PT専用GPT　無制限",  ok: true },
      { label: "文献検索　無制限",    ok: true },
    ],
  },
  {
    id:          "pro",
    label:       "臨床サポート・プロ",
    price:       "¥1,980",
    period:      "月",
    target:      "臨床の幅をさらに広げたいPT",
    color:       "#E85D04",
    borderCls:   "border-orange-400",
    btnStyle:    { background: "#E85D04" },
    btnLabel:    "このパックで始める",
    href:        "/register?plan=pro",
    recommended: false,
    badge:       null as string | null,
    features:    [
      { label: "臨床サポートパックの全機能", ok: true },
      { label: "AI治療考察",                ok: true },
      { label: "スライド自動生成",           ok: true },
      { label: "診療報酬・算定ガイド",       ok: true },
      { label: "自主トレ指導書作成",         ok: true },
      { label: "学習コンテンツ",             ok: true },
    ],
  },
] as const;

// ── Comparison table ───────────────────────────────────────────────────────

type ColId = "free" | "basic" | "pro";

const TABLE_ROWS: { label: string; free: boolean | string; basic: boolean | string; pro: boolean | string }[] = [
  { label: "PT専用GPT",         free: "月5回",  basic: true,    pro: true   },
  { label: "文献検索",           free: "月5回",  basic: true,    pro: true   },
  { label: "AI治療考察",         free: false,   basic: false,   pro: true   },
  { label: "スライド自動生成",   free: false,   basic: false,   pro: true   },
  { label: "診療報酬・算定ガイド", free: false, basic: false,   pro: true   },
  { label: "自主トレ指導書作成", free: false,   basic: false,   pro: true   },
  { label: "学習コンテンツ",     free: "一部",  basic: false,   pro: true   },
];

const TABLE_COLS: { id: ColId; label: string; price: string; color: string }[] = [
  { id: "free",  label: "無料",      price: "¥0",     color: "#6B7280" },
  { id: "basic", label: "臨床¥980",  price: "/月",    color: "#1B4332" },
  { id: "pro",   label: "プロ¥1,980", price: "/月",   color: "#E85D04" },
];

function Cell({ val }: { val: boolean | string }) {
  if (val === true)  return <span className="text-lg font-black leading-none" style={{ color: "#E85D04" }}>○</span>;
  if (val === false) return <span className="text-sm text-gray-300 font-bold">—</span>;
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
    a: "はい、臨床サポート・プロは臨床サポートパックの全機能を含みます。プロにアップグレードすると、PT専用GPT・文献検索の無制限利用に加え、AI治療考察・スライド自動生成・診療報酬ガイドなどの全機能が使えます。",
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

// ── Page ──────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <main className="bg-[#F8F9FA] min-h-screen">

      {/* Hero */}
      <div className="bg-white border-b border-gray-200 py-10 px-4 text-center">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">料金プラン</p>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
          あなたの使い方に合ったプランを
        </h1>
        <p className="text-gray-500 text-sm">無料で月5回まで利用可能。いつでもアップグレード・解約可能です</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* ── Plan cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14">
          {PLANS.map(plan => (
            <div key={plan.id}
              className={`relative bg-white rounded-2xl border-2 ${plan.borderCls} flex flex-col shadow-sm transition hover:shadow-md hover:-translate-y-0.5 ${
                plan.recommended ? "ring-2 ring-green-400 ring-offset-2" : ""
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="text-[10px] font-black px-3 py-1 rounded-full shadow-sm text-white"
                    style={{ background: plan.color }}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="p-5 flex-1">
                {/* Label & price */}
                <p className="font-black text-sm mb-1 leading-snug" style={{ color: plan.color }}>
                  {plan.label}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  {plan.period !== "ずっと無料" && (
                    <span className="text-xs text-gray-400">/{plan.period}</span>
                  )}
                </div>
                {plan.period === "ずっと無料" && (
                  <p className="text-[10px] text-gray-400 mb-0">ずっと無料</p>
                )}

                {/* Target */}
                <div className="rounded-xl px-3 py-2 mb-4 mt-3" style={{ background: "#F9FAFB" }}>
                  <p className="text-[10px] text-gray-400 font-semibold mb-0.5">こんな人に</p>
                  <p className="text-xs text-gray-700 font-medium leading-snug">{plan.target}</p>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f.label} className="flex items-start gap-2 text-xs">
                      {f.ok ? (
                        <span className="font-black shrink-0 leading-none text-lg mt-[-1px]" style={{ color: plan.color }}>○</span>
                      ) : (
                        <span className="text-gray-300 shrink-0 font-bold text-sm leading-none mt-0.5">—</span>
                      )}
                      <span className={f.ok ? "text-gray-700 leading-relaxed" : "text-gray-400"}>{f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 pt-0">
                <Link href={plan.href}
                  className="block w-full py-3 rounded-xl font-bold text-white text-sm text-center transition hover:opacity-90 shadow-sm"
                  style={plan.btnStyle}>
                  {plan.btnLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* ── Comparison table ── */}
        <div className="mb-14">
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-gray-900">機能比較</h2>
            <p className="text-sm text-gray-500 mt-1">各プランで使える機能を一目で確認できます</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[380px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 w-[40%]">機能</th>
                    {TABLE_COLS.map(col => (
                      <th key={col.id}
                        className="text-center px-4 py-3.5 text-xs font-black border-l border-gray-100"
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
                      className={`border-t border-gray-100 ${i % 2 === 1 ? "bg-gray-50/40" : "bg-white"}`}>
                      <td className="px-5 py-3 text-xs font-semibold text-gray-700">{row.label}</td>
                      {TABLE_COLS.map(col => (
                        <td key={col.id} className="text-center px-4 py-3 border-l border-gray-100">
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
        </div>

        {/* ── 準備中パックの案内 ── */}
        <div className="mb-14 rounded-2xl border border-gray-200 bg-white px-6 py-5">
          <p className="text-sm font-black text-gray-700 mb-2">近日公開予定のパック</p>
          <p className="text-sm text-gray-500 leading-relaxed mb-3">
            副業支援パック・開業/院運営パック・全部入りパックは現在開発中です。<br />
            リリース時にメールでお知らせします。
          </p>
          <div className="flex flex-wrap gap-2">
            {["副業支援パック", "開業・院運営パック", "全部入りパック"].map(label => (
              <span key={label}
                className="text-[11px] font-bold px-3 py-1 rounded-full"
                style={{ background: "#F3F4F6", color: "#9CA3AF" }}>
                {label}　準備中
              </span>
            ))}
          </div>
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
