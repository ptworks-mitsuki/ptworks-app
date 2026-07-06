"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const TreatmentEvidence = dynamic(
  () => import("@/components/TreatmentEvidence").then(m => ({ default: m.TreatmentEvidence })),
  { ssr: false },
);

export default function TreatmentPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 3.5rem)" }}>

      {/* ページヘッダー */}
      <div className="shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center px-4 h-12">
          <button onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 mr-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div>
            <p className="text-sm font-black leading-tight" style={{ color: "#1A1A1A" }}>治療を考える</p>
            <p className="text-[10px] text-gray-400 leading-none">患者情報から治療方針を提案</p>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <TreatmentEvidence />
        </div>
      </div>

    </div>
  );
}
