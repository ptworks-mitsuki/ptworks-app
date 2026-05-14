import Link from "next/link";
import { PlanGateBanner } from "@/components/PlanGateBanner";

const INCLUDED_FEATURES = [
  "疾患AI検索（無制限）",
  "7項目の臨床情報AI生成",
  "患者状態別 治療アプローチ提案",
  "発表スライド自動生成",
  "学習コンテンツ全閲覧",
];

const EXCLUSIVE_FEATURES = [
  { label: "副業診断・ロードマップ診断", desc: "あなたに合った副業の方向性をAIが診断" },
  { label: "AIコーチング（月次アクションプラン）", desc: "今月やるべきことをAIが具体的に提案" },
  { label: "SNS投稿文・ブログ記事・LP文章生成", desc: "集客につながるコンテンツをAIで自動作成" },
  { label: "収益管理ダッシュボード", desc: "副業収入・経費を一元管理して可視化" },
  { label: "先輩PT成功事例データベース", desc: "副業で成功したPTの事例を参考に" },
];

export default function Stage2Page() {
  return (
    <main className="bg-[#F8F9FA] min-h-screen">
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">副業支援パック</span>
            <span className="text-xs text-gray-400">¥3,980 / 月</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">副業支援パック</h1>
          <p className="text-gray-500 mt-1 text-sm">理学療法士の副業を、AIがフルサポート。収益化への最短ルートを提供します。</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Plan gate banner */}
        <PlanGateBanner
          requiredStage={2}
          planName="副業支援パック"
          price="¥3,980"
          color="#2563EB"
          description="副業収入の第一歩。AIコーチング・コンテンツ生成・収益管理で副業を加速させます。"
        />

        {/* Included from Stage 1 */}
        <div className="mb-6">
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

        {/* Stage 2 mockup */}
        <div className="mb-6 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
          <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-300" />
              <div className="w-3 h-3 rounded-full bg-yellow-300" />
              <div className="w-3 h-3 rounded-full bg-green-300" />
            </div>
            <div className="flex-1 bg-white rounded px-2 py-1 text-[10px] text-gray-400 text-center">
              ptworks.app/stage2
            </div>
          </div>
          <div className="bg-white p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 副業診断結果 */}
            <div className="border border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">副業診断結果</p>
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-xs font-black text-blue-800">あなたに最適な副業：訪問リハビリ</p>
                <p className="text-[10px] text-blue-600 mt-0.5">適性スコア: 92点</p>
              </div>
              {["訪問リハビリ", "オンライン相談", "セミナー講師"].map((item, i) => (
                <div key={item} className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full flex-1" style={{ background: `rgba(37,99,235,${0.8 - i * 0.25})` }} />
                  <span className="text-[10px] text-gray-500 w-20 text-right">{item}</span>
                </div>
              ))}
            </div>
            {/* 収益管理ダッシュボード */}
            <div className="border border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">収益管理</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "今月の収入", value: "¥58,000", color: "#2563EB" },
                  { label: "今月の経費", value: "¥12,000", color: "#6B7280" },
                  { label: "純利益",     value: "¥46,000", color: "#1B4332" },
                  { label: "先月比",     value: "+¥8,000", color: "#E85D04" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-1.5 text-center">
                    <p className="text-[9px] text-gray-400">{label}</p>
                    <p className="text-xs font-black" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stage 2 exclusive features */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">副業支援パック 限定機能</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EXCLUSIVE_FEATURES.map(f => (
              <div key={f.label} className="relative bg-white border border-gray-200 rounded-xl px-4 py-4 overflow-hidden shadow-sm">
                <div className="blur-[2px] select-none pointer-events-none">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-sm text-gray-800">{f.label}</p>
                  </div>
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

        <div className="mt-8 flex items-center justify-between">
          <Link href="/pricing" className="text-sm text-gray-400 hover:text-gray-600 transition">
            ← 全プラン比較を見る
          </Link>
          <Link href="/pricing"
            className="px-6 py-2.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90 shadow-sm"
            style={{ background: "#2563EB" }}>
            このプランで始める →
          </Link>
        </div>
      </div>
    </main>
  );
}
