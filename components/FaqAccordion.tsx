"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "本当に無料で使えますか？",
    a: "はい。Stage 1（メディカルサーチ）は月5回まで無料でご利用いただけます。クレジットカードの登録も不要です。6回目以降はStage 1（¥980/月）へのアップグレードが必要です。",
  },
  {
    q: "解約はいつでもできますか？",
    a: "はい、いつでも解約できます。解約した月の末日まで引き続きご利用いただけます。解約手続きはマイページから1分で完了します。違約金等は一切ありません。",
  },
  {
    q: "医療従事者以外でも使えますか？",
    a: "ご利用いただけます。ただし本ツールは理学療法士・医療従事者向けに設計されており、専門的な内容が多く含まれます。整体師・トレーナー・スポーツ指導者の方々にもご活用いただいています。AI生成情報の最終判断は専門家にご相談ください。",
  },
  {
    q: "スマートフォンでも使えますか？",
    a: "はい、スマートフォン・タブレットに完全対応しています。ブラウザからそのままアクセスでき、アプリのインストールは不要です。iOS・Androidいずれでも快適にご利用いただけます。",
  },
  {
    q: "AIが生成する情報はどのくらい正確ですか？",
    a: "Anthropic社のClaude（最新モデル）を使用しており、高精度な医療情報を生成します。ただしAI生成情報には誤りが含まれる可能性があります。臨床での最終判断は必ず一次文献や専門家への確認のうえ行ってください。本ツールはあくまで情報収集・学習補助としてご活用ください。",
  },
  {
    q: "プランのアップグレード・ダウングレードはできますか？",
    a: "いつでも変更できます。アップグレードは即時反映、ダウングレードは翌月以降に反映されます。上位プランにアップグレードすると、下位ステージの全機能も引き続きご利用いただけます。",
  },
  {
    q: "Stage 2以降の機能はいつリリースされますか？",
    a: "現在Stage 2〜4の機能を開発中です。リリース時期はマイページ・お知らせ機能でご案内します。事前登録していただくと優先的にご案内いたします。",
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
          >
            <span className="font-semibold text-sm text-gray-900 dark:text-white pr-4">
              {item.q}
            </span>
            <span className={`shrink-0 text-[#E85D04] transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>
          {open === i && (
            <div className="px-5 pb-4 animate-fadeIn">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3">
                {item.a}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
