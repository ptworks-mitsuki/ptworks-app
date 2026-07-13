"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { msUntilReset } from "@/lib/usage-tracker";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0分";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}時間${m}分`;
  if (h > 0) return `${h}時間`;
  return `${m}分`;
}

interface Props {
  onClose: () => void;
}

export function UsageLimitModal({ onClose }: Props) {
  const [remaining, setRemaining] = useState(() => msUntilReset());

  // Tick every 30 s
  useEffect(() => {
    const id = setInterval(() => {
      const ms = msUntilReset();
      setRemaining(ms);
      if (ms <= 0) onClose(); // auto-close when limit resets
    }, 30_000);
    return () => clearInterval(id);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-5"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white px-6 py-7 shadow-2xl text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-3xl mb-3">⏱</div>

        <h2 className="text-base font-black text-gray-900 mb-1">
          本日の利用枠に達しました
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          たくさんご利用いただき<br />ありがとうございます
        </p>

        {remaining > 0 && (
          <div className="rounded-xl py-3 px-4 mb-5"
            style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
            <p className="text-xs text-gray-500 mb-1">再度ご利用まで</p>
            <p className="text-xl font-black" style={{ color: "#E85D04" }}>
              あと {formatCountdown(remaining)}
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          もっと使いたい方は<br />上位プランもご検討ください
        </p>

        <div className="space-y-2">
          <Link
            href="/pricing"
            onClick={onClose}
            className="flex items-center justify-center w-full py-3 rounded-xl font-black text-white text-sm transition hover:opacity-90"
            style={{ background: "#E85D04" }}
          >
            プランを見る →
          </Link>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
