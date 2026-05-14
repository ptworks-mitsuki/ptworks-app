"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  const handleLogin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (res.ok) {
        const from = params.get("from") ?? "/";
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "ログインに失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-5 py-2.5 font-bold text-xl mb-4">
            PT Works
          </div>
          <h1 className="text-2xl font-bold text-gray-800">メディカルサーチ</h1>
          <p className="text-gray-500 text-sm mt-1">医療従事者・セラピスト向け疾患情報検索</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-base font-semibold text-gray-700 mb-5">アクセスコードでログイン</h2>

          <div className="space-y-4">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="アクセスコードを入力"
                className={`w-full px-4 py-3 pr-12 rounded-xl border-2 text-gray-800 placeholder-gray-400 focus:outline-none transition-colors ${
                  error ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-blue-500"
                }`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm px-1"
              >
                {show ? "隠す" : "表示"}
              </button>
            </div>

            {error && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <span>⚠</span> {error}
              </p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || !code.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "確認中..." : "ログイン"}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            アクセスコードをお持ちでない方は管理者にお問い合わせください
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          本ツールはAI生成情報を提供します。臨床判断の最終責任は医療従事者にあります。
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
