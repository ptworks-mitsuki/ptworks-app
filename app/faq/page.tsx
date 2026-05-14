import { FaqAccordion } from "@/components/FaqAccordion";
import Link from "next/link";

export default function FaqPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">FAQ</p>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">よくある質問</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">解決しない場合は、お気軽にお問い合わせください</p>
      </div>
      <FaqAccordion />
      <div className="mt-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="font-bold text-gray-900 dark:text-white mb-2">他に質問がある場合</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">お気軽にお問い合わせください。通常2営業日以内にご返信します。</p>
        <a href="mailto:support@ptworks.jp"
          className="inline-block px-6 py-2.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90"
          style={{ background: "#E85D04" }}>
          お問い合わせする
        </a>
      </div>
      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
          ← トップに戻る
        </Link>
      </div>
    </main>
  );
}
