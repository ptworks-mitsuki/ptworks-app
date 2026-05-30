"use client";

import { useState } from "react";
import { TreatmentFilter } from "./TreatmentFilter";

const QUICK_DISEASES = [
  "変形性膝関節症", "脳梗塞", "腰部脊柱管狭窄症", "肩関節周囲炎",
  "パーキンソン病", "大腿骨頸部骨折（術後）", "腰椎椎間板ヘルニア", "脳出血",
];

export function CaseConsultation() {
  const [inputDisease,  setInputDisease]  = useState("");
  const [activeDisease, setActiveDisease] = useState("");

  const handleSearch = (d = inputDisease) => {
    const term = d.trim();
    if (!term) return;
    setActiveDisease(term);
  };

  const handleClear = () => {
    setActiveDisease("");
    setInputDisease("");
  };

  return (
    <div className="w-full">

      {/* ── Disease input ── */}
      {!activeDisease && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
          <p className="text-xs font-semibold text-gray-500 mb-3">
            症例相談したい疾患を入力してください
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputDisease}
              onChange={e => setInputDisease(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="疾患名を入力（例：変形性膝関節症）"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none text-gray-900 placeholder-gray-400 text-base transition"
              autoComplete="off"
            />
            <button
              onClick={() => handleSearch()}
              disabled={!inputDisease.trim()}
              className="px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
            >
              次へ
            </button>
          </div>

          {/* Quick select */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 mb-2">よく相談される疾患</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DISEASES.map(d => (
                <button
                  key={d}
                  onClick={() => { setInputDisease(d); handleSearch(d); }}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 rounded-full transition"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Case filter ── */}
      {activeDisease && (
        <div>
          {/* Disease header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">「{activeDisease}」の症例相談</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                患者の状態・条件を入力すると、文献・論文をもとに最適なアプローチを整理します
              </p>
            </div>
            <button
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              ← 疾患を変更
            </button>
          </div>

          {/* Info banner */}
          <div className="mb-4 flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span className="text-green-600 shrink-0 mt-0.5">ℹ</span>
            <p className="text-xs text-green-800 leading-relaxed">
              患者の年代・痛み・ROM制限・受療環境などを選択して検索すると、
              その患者に合った治療アプローチを提案します。
              検索サーチ・治療アプローチの内容を統合したアドバイスを提供します。
            </p>
          </div>

          <TreatmentFilter disease={activeDisease} />
        </div>
      )}
    </div>
  );
}
