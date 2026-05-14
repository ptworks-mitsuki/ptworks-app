import Link from "next/link";
import { PlanGateBanner } from "@/components/PlanGateBanner";

const ALL_FEATURES = [
  { stage: 1, label: "疾患AI検索（無制限）" },
  { stage: 1, label: "7項目の臨床情報AI生成" },
  { stage: 1, label: "患者状態別 治療アプローチ" },
  { stage: 1, label: "発表スライド自動生成" },
  { stage: 1, label: "学習コンテンツ全閲覧" },
  { stage: 2, label: "副業診断・ロードマップ診断" },
  { stage: 2, label: "AIコーチング（月次アクション）" },
  { stage: 2, label: "SNS・ブログ・LP文章生成" },
  { stage: 2, label: "収益管理ダッシュボード" },
  { stage: 2, label: "先輩PT成功事例データベース" },
  { stage: 3, label: "口コミ返信文ジェネレーター" },
  { stage: 3, label: "Googleビジネスプロフィール最適化" },
  { stage: 3, label: "問い合わせ対応チャットボット" },
  { stage: 3, label: "確定申告・経費管理補助" },
];

const EXCLUSIVE_FEATURES = [
  { label: "全パックの機能使い放題",        desc: "全パックの機能を上限なく使用可能" },
  { label: "優先サポート（専用チャット）", desc: "担当者が専用チャットで迅速に対応" },
  { label: "新機能先行アクセス",           desc: "新機能のベータ版を一般公開前に利用可能" },
  { label: "月1回 AIキャリア相談",        desc: "PTキャリアの専門家によるAIコーチングセッション" },
];

const STAGE_COLORS: Record<number, string> = {
  1: "#1B4332",
  2: "#2563EB",
  3: "#7C3AED",
};

export default function Stage4Page() {
  return (
    <main className="bg-[#F8F9FA] min-h-screen">
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#E85D04] bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">全部入りパック</span>
            <span className="text-xs text-gray-400">¥6,980 / 月</span>
            <span className="text-[10px] font-bold text-[#E85D04] bg-orange-100 px-2 py-0.5 rounded-full ml-1">BEST VALUE</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">全部入りパック</h1>
          <p className="text-gray-500 mt-1 text-sm">全機能使い放題 ＋ 優先サポート。PTのキャリア全てをAIが支援します。</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        <PlanGateBanner
          requiredStage={4}
          planName="全部入りパック"
          price="¥6,980"
          color="#E85D04"
          description="全機能使い放題＋優先サポート。PTのキャリアを最大化するオールインワンプラン。"
        />

        {/* All included features */}
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">全パックの機能（含まれます）</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_FEATURES.map(f => (
              <div key={f.label} className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: STAGE_COLORS[f.stage] ?? "#999" }} />
                <span className="text-sm text-gray-700">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 4 exclusive */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">全部入りパック 限定特典</p>
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
                  <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5">
                    <span className="text-xs font-semibold text-[#E85D04]">全部入りパックで利用可能</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Link href="/pricing" className="text-sm text-gray-400 hover:text-gray-600 transition">← 全プラン比較を見る</Link>
          <Link href="/pricing"
            className="px-6 py-2.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90 shadow-sm"
            style={{ background: "#E85D04" }}>
            このプランで始める →
          </Link>
        </div>
      </div>
    </main>
  );
}
