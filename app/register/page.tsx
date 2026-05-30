"use client";

import { useState } from "react";
import Link from "next/link";
import { EXPERIENCE_OPTIONS, type ExperienceLevel } from "@/hooks/useExperienceLevel";

const STORAGE_KEY = "pt-experience-level";

export default function RegisterPage() {
  const [submitted,    setSubmitted]    = useState(false);
  const [expLevel,     setExpLevel]     = useState<ExperienceLevel>("");

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-md text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">ご登録ありがとうございます</h2>
          <p className="text-gray-500 text-sm mb-6">
            現在ベータ版の準備中です。<br />
            サービス開始時にメールでご連絡いたします。
          </p>
          <Link
            href="/stage1"
            className="inline-block w-full py-3 rounded-xl font-bold text-white text-sm text-center transition"
            style={{ background: "#E85D04" }}
          >
            今すぐ無料のStage 1を使ってみる
          </Link>
          <Link href="/" className="block mt-3 text-xs text-gray-400 hover:text-gray-600 transition">
            ← トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg"
              style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}>
              P
            </div>
            <span className="font-black text-xl text-gray-900">PT Works</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">無料アカウントを作成</h1>
          <p className="text-gray-400 text-xs mt-1">Stage 1（メディカルサーチ）が無料で利用できます</p>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            if (expLevel) {
              try { localStorage.setItem(STORAGE_KEY, expLevel); } catch { /* ignore */ }
            }
            setSubmitted(true);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">お名前</label>
            <input
              type="text"
              required
              placeholder="山田 太郎"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#E85D04] focus:ring-2 focus:ring-orange-100 focus:outline-none text-sm transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">メールアドレス</label>
            <input
              type="email"
              required
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#E85D04] focus:ring-2 focus:ring-orange-100 focus:outline-none text-sm transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">パスワード</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="8文字以上"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#E85D04] focus:ring-2 focus:ring-orange-100 focus:outline-none text-sm transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">職種</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#E85D04] focus:ring-2 focus:ring-orange-100 focus:outline-none text-sm bg-white transition"
            >
              <option value="">選択してください</option>
              <option>理学療法士（PT）</option>
              <option>作業療法士（OT）</option>
              <option>言語聴覚士（ST）</option>
              <option>柔道整復師</option>
              <option>あん摩マッサージ指圧師</option>
              <option>その他の医療従事者</option>
            </select>
          </div>

          {/* Experience level */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              経験年数
              <span className="text-gray-400 font-normal ml-1">（検索結果の難易度表示に使用します）</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EXPERIENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExpLevel(opt.value)}
                  className={`px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition text-left ${
                    expLevel === opt.value
                      ? "border-[#E85D04] bg-orange-50 text-[#E85D04]"
                      : "border-gray-200 text-gray-600 hover:border-orange-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90 active:scale-[0.98] mt-2"
            style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}
          >
            無料で登録する
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          すでにアカウントをお持ちの方は
          <Link href="/login" className="text-[#E85D04] hover:underline ml-1">ログイン</Link>
        </p>

        <p className="text-center text-[10px] text-gray-300 mt-4 leading-relaxed">
          登録することで、<span className="underline">利用規約</span>および<span className="underline">プライバシーポリシー</span>に同意したものとみなします
        </p>
      </div>
    </div>
  );
}
