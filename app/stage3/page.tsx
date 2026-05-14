import Link from "next/link";
import { PlanGateBanner } from "@/components/PlanGateBanner";

const INCLUDED_FEATURES = [
  "臨床サポートパック：疾患AI検索（無制限）・治療アプローチ・スライド生成",
  "副業支援パック：副業診断・AIコーチング・コンテンツ生成・収益管理",
];

const EXCLUSIVE_FEATURES = [
  { label: "口コミ返信文ジェネレーター",      desc: "GoogleマップなどのレビューにAIが返信文を自動生成" },
  { label: "SNS投稿文・症例ブログ記事生成",   desc: "SEOに強い症例紹介記事・SNS投稿文をAIで作成" },
  { label: "Googleビジネスプロフィール最適化", desc: "検索に強いGoogleビジネスページの最適化をサポート" },
  { label: "問い合わせ対応チャットボット",    desc: "ホームページの問い合わせをAIが24時間対応" },
  { label: "確定申告・経費管理補助",          desc: "整体院・個人事業主向けの経費管理・確定申告サポート" },
];

export default function Stage3Page() {
  return (
    <main className="bg-[#F8F9FA] min-h-screen">
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full">開業・院運営パック</span>
            <span className="text-xs text-gray-400">¥5,980 / 月</span>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full ml-1">おすすめ</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">開業・院運営パック</h1>
          <p className="text-gray-500 mt-1 text-sm">院運営の煩雑な業務をAIに任せて、本業のリハビリに集中できる環境を作ります。</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        <PlanGateBanner
          requiredStage={3}
          planName="開業・院運営パック"
          price="¥5,980"
          color="#7C3AED"
          description="院運営をAIに任せて本業に集中。口コミ返信・集客コンテンツ・経費管理をすべて自動化。"
        />

        <div className="mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">臨床・副業パックの全機能（含まれます）</p>
          <div className="space-y-2">
            {INCLUDED_FEATURES.map(f => (
              <div key={f} className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                <span className="text-green-500 text-sm shrink-0 mt-0.5 font-bold">●</span>
                <span className="text-sm text-gray-700">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 3 mockup */}
        <div className="mb-6 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
          <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-300" />
              <div className="w-3 h-3 rounded-full bg-yellow-300" />
              <div className="w-3 h-3 rounded-full bg-green-300" />
            </div>
            <div className="flex-1 bg-white rounded px-2 py-1 text-[10px] text-gray-400 text-center">
              ptworks.app/stage3
            </div>
          </div>
          <div className="bg-white p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 口コミ返信生成 */}
            <div className="border border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">口コミ返信文生成</p>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[9px] text-gray-400 mb-1">受け取った口コミ</p>
                <p className="text-[10px] text-gray-700">「先生が親切で、症状が改善されました。通ってよかったです。」</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-2 border border-purple-100">
                <p className="text-[9px] text-purple-500 mb-1">AI生成の返信文</p>
                <p className="text-[10px] text-gray-700">「温かいお言葉をいただき、誠にありがとうございます。お体の回復のお役に立てて光栄です…」</p>
              </div>
            </div>
            {/* SNS投稿文生成 */}
            <div className="border border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">SNS投稿文生成</p>
              <div className="flex gap-1 mb-1">
                {["Instagram", "X(Twitter)", "ブログ"].map(t => (
                  <span key={t} className="text-[9px] border border-purple-200 text-purple-600 rounded px-1.5 py-0.5">{t}</span>
                ))}
              </div>
              <div className="bg-purple-50 rounded-lg p-2 border border-purple-100">
                <p className="text-[10px] text-gray-700 leading-relaxed">「【膝の痛みでお悩みの方へ】変形性膝関節症は早期リハビリが重要です。当院では…」</p>
              </div>
              <div className="flex gap-1.5">
                <span className="text-[9px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">#理学療法士</span>
                <span className="text-[9px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">#膝痛</span>
                <span className="text-[9px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">#リハビリ</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">開業・院運営パック 限定機能</p>
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
                  <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-full px-3 py-1.5">
                    <span className="text-xs font-semibold text-purple-600">開業・院運営パックで利用可能</span>
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
            style={{ background: "#7C3AED" }}>
            このプランで始める →
          </Link>
        </div>
      </div>
    </main>
  );
}
