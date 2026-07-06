"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PtGptChat } from "@/components/PtGptChat";

// ─── Inner (uses useSearchParams) ─────────────────────────────────────────

function PtGptInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [hasMessages, setHasMessages] = useState(false);

  const initialQuery = searchParams.get("q") ?? undefined;

  return (
    <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>

      {/* ヘッダー */}
      <header className="shrink-0 bg-white border-b border-gray-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div>
              <p className="text-base font-black leading-tight">
                PT<span style={{ color: "#E85D04" }}>専用GPT</span>
              </p>
              <p className="text-[10px] text-gray-400 leading-none">疾患・臨床・キャリアまで何でも</p>
            </div>
          </div>
        </div>
      </header>

      {/* チャット本体 */}
      <div className="flex-1 min-h-0">
        <PtGptChat
          initialQuery={initialQuery}
          onClear={() => setHasMessages(false)}
        />
      </div>

    </div>
  );
}

export default function PtGptPage() {
  return (
    <Suspense>
      <PtGptInner />
    </Suspense>
  );
}
