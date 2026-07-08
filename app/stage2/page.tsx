import Link from "next/link";

// ── Data ──────────────────────────────────────────────────────────────────

const INCLUDED_FEATURES = [
  "メディカルサーチ無制限",
  "疾患を調べる・AI治療考察・何でも相談する",
  "患者説明文の自動生成",
  "スライド自動生成",
];

const EXCLUSIVE_FEATURES = [
  { label: "セミナー動画・PDF 投稿・販売",      desc: "あなたの専門知識をコンテンツにして販売できる" },
  { label: "収益 50% 還元",                    desc: "販売収益の50%があなたに直接入る仕組み" },
  { label: "AIコーチング（月次アクションプラン）", desc: "今月やるべきことをAIが具体的に提案" },
  { label: "SNS投稿文・ブログ記事・LP文章生成", desc: "集客につながるコンテンツをAIで自動作成" },
  { label: "収益管理ダッシュボード",             desc: "副業収入・経費を一元管理して可視化" },
];

const REVENUE_ROWS = [
  { count: 10,  revenue: 4900,  cost: 3980, profit: 920    },
  { count: 20,  revenue: 9800,  cost: 3980, profit: 5820   },
  { count: 30,  revenue: 14700, cost: 3980, profit: 10720  },
  { count: 50,  revenue: 24500, cost: 3980, profit: 20520  },
  { count: 100, revenue: 49000, cost: 3980, profit: 45020  },
];

const RANKINGS = [
  { rank: 1, title: "変形性膝関節症　術後リハビリの進め方",       sales: 87,  revenue: 42630 },
  { rank: 2, title: "新人PTが最初に覚えるべき評価10選",           sales: 124, revenue: 60760 },
  { rank: 3, title: "脳梗塞患者の歩行訓練　実践ガイド",           sales: 63,  revenue: 30870 },
  { rank: 4, title: "患者家族への説明が苦手なPTへ",               sales: 45,  revenue: 22050 },
];

const RANK_MEDAL = ["🥇", "🥈", "🥉", "4位"];

const FMT = (n: number) => `¥${n.toLocaleString()}`;

// ── Page ──────────────────────────────────────────────────────────────────

export default function Stage2Page() {
  return (
    <main className="bg-[#F8F9FA] min-h-screen">

      {/* Hero — 初月特別価格を大きく */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">副業支援パック</span>
                <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">3ヶ月返金保証</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">副業支援パック</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                知識を収入に変える仕組みを、まるごと提供します。
              </p>
            </div>

            {/* Price block */}
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-6 py-5 text-center sm:text-right shrink-0">
              <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">初月限定 特別価格</p>
              <div className="flex items-end gap-2 justify-center sm:justify-end">
                <span className="text-5xl font-black text-blue-700 leading-none">¥980</span>
                <span className="text-sm text-blue-500 mb-1">/ 初月</span>
              </div>
              <p className="text-xs text-blue-400 mt-1 line-through">通常 ¥3,980/月</p>
              <p className="text-[10px] text-blue-400 mt-0.5">2ヶ月目から¥3,980</p>
              <Link
                href="/register?plan=stage2"
                className="mt-4 block w-full py-3 rounded-xl font-black text-white text-sm text-center transition hover:opacity-90 shadow-md"
                style={{ background: "#2563EB" }}
              >
                今すぐ始める →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* ── 収益シミュレーション ── */}
        <section>
          <div className="mb-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">収益シミュレーション</p>
            <h2 className="text-2xl font-black text-gray-900">¥3,980で、いくら稼げるか</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="text-left px-5 py-3 text-xs font-bold">月の販売本数</th>
                    <th className="text-right px-4 py-3 text-xs font-bold">月間収益</th>
                    <th className="text-right px-4 py-3 text-xs font-bold">コスト</th>
                    <th className="text-right px-5 py-3 text-xs font-bold">手残り</th>
                  </tr>
                </thead>
                <tbody>
                  {REVENUE_ROWS.map((row, i) => (
                    <tr
                      key={row.count}
                      className={`border-t border-gray-100 ${i % 2 === 1 ? "bg-blue-50/30" : "bg-white"} ${row.count === 10 ? "ring-inset ring-1 ring-blue-200" : ""}`}
                    >
                      <td className="px-5 py-3.5 text-sm font-bold text-gray-800">
                        <span className="inline-flex items-center gap-1">
                          {row.count}本
                          {row.count === 10 && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 ml-1">元が取れる</span>
                          )}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-700 font-medium">{FMT(row.revenue)}</td>
                      <td className="text-right px-4 py-3.5 text-sm text-gray-500">{FMT(row.cost)}</td>
                      <td className="text-right px-5 py-3.5 text-sm font-black" style={{ color: row.profit > 0 ? "#16a34a" : "#dc2626" }}>
                        +{FMT(row.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">※ 動画1本¥980・収益50%還元で計算。手残り = 収益 — コスト</p>
            </div>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 space-y-1.5">
            <p className="text-sm font-bold text-blue-800">10本売れれば元が取れます。</p>
            <p className="text-sm text-blue-700">動画は一度作れば永続的に売れ続けます。</p>
            <p className="text-sm text-blue-700">2本目・3本目と増やすほど収益が積み上がります。</p>
          </div>
        </section>

        {/* ── あなたの知識は売れます ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div
            className="px-6 pt-8 pb-6"
            style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)" }}
          >
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">あなたの知識は売れます</p>
            <h2 className="text-white text-xl sm:text-2xl font-black leading-snug">
              あなたの「当たり前」が、<br />誰かの「知りたかった」になる
            </h2>
          </div>

          <div className="px-6 py-6 space-y-4">
            <p className="text-base text-gray-800 leading-[1.9]">
              5年目のPTが当たり前に知っていること。<br />
              新人PTには、どうしても聞けなかった知識があります。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                "変形性膝関節症の術後プロトコル",
                "脳梗塞患者の歩行訓練のコツ",
                "新人が最初につまずく評価のポイント",
                "患者家族への説明の仕方",
              ].map(item => (
                <div key={item} className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <span className="w-4 h-4 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-sm text-gray-700 font-medium">{item}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-200 px-5 py-4">
              <p className="text-sm text-blue-800 leading-relaxed font-medium">
                これを知りたい新人PTは全国に何万人もいます。<br />
                あなたの経験は、立派な商品になります。
              </p>
            </div>
          </div>
        </section>

        {/* ── 今売れている動画ランキング ── */}
        <section>
          <div className="mb-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">販売実績（サンプル）</p>
            <h2 className="text-2xl font-black text-gray-900">今PT Works内で売れている動画</h2>
          </div>

          <div className="space-y-3">
            {RANKINGS.map((item, i) => (
              <div
                key={item.rank}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4"
              >
                <div className="text-2xl font-black shrink-0 w-10 text-center">
                  {RANK_MEDAL[i]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 leading-snug">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">今月 {item.sales}本 売れています</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-black text-blue-600">{FMT(item.revenue)}</p>
                  <p className="text-[10px] text-gray-400">投稿者の収益</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-2 text-center">※ 現在はサンプルデータです</p>

          {/* CTA */}
          <div className="mt-6">
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-black text-base transition hover:opacity-90 shadow-md"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #2563EB)" }}
            >
              まず1本投稿してみる →
            </Link>
          </div>
        </section>

        {/* ── 3ヶ月返金保証 ── */}
        <section className="bg-green-50 border-2 border-green-300 rounded-2xl px-6 py-6 text-center">
          <p className="text-3xl mb-3">✓</p>
          <h3 className="text-xl font-black text-green-800 mb-2">3ヶ月返金保証</h3>
          <p className="text-sm text-green-700 leading-relaxed">
            3ヶ月間投稿して収益が1円も得られなければ<br />
            <span className="font-bold text-green-900">全額返金保証します。</span>
          </p>
          <p className="text-xs text-green-600 mt-3">※ 返金条件の詳細はご登録後にご確認いただけます</p>
        </section>

        {/* ── 臨床サポートパックの全機能含む ── */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">臨床サポートパックの全機能（含まれます）</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INCLUDED_FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
                <span className="text-green-500 text-sm shrink-0 font-bold">●</span>
                <span className="text-sm text-gray-700">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 副業支援パック限定機能 ── */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">副業支援パック 限定機能</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EXCLUSIVE_FEATURES.map(f => (
              <div key={f.label} className="relative bg-white border border-gray-200 rounded-xl px-4 py-4 overflow-hidden shadow-sm">
                <div className="blur-[2px] select-none pointer-events-none">
                  <p className="font-bold text-sm text-gray-800 mb-1">{f.label}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
                    <span className="text-xs font-semibold text-blue-600">副業支援パックで利用可能</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Link href="/pricing" className="text-sm text-gray-400 hover:text-gray-600 transition">
            ← 全プラン比較を見る
          </Link>
          <Link
            href="/pricing"
            className="px-6 py-2.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90 shadow-sm"
            style={{ background: "#2563EB" }}
          >
            このプランで始める →
          </Link>
        </div>
      </div>
    </main>
  );
}
