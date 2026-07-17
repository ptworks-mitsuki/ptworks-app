"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const ONBOARDING_KEY = "onboarding_completed";

export function markOnboardingDone() {
  try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch { /* ignore */ }
}

export function isOnboardingDone(): boolean {
  try { return !!localStorage.getItem(ONBOARDING_KEY); } catch { return false; }
}

// ─── アイコン ─────────────────────────────────────────────────────────────

function IconLogo() {
  return (
    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-4xl shadow-lg"
      style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}>
      P
    </div>
  );
}

function IconChat() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}

function IconNote() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function IconCycle() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
  );
}

function IconStart() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
  );
}

// ─── 吹き出し ─────────────────────────────────────────────────────────────

function Bubble({ text }: { text: string }) {
  return (
    <div className="inline-block px-3 py-2 rounded-xl text-xs leading-snug"
      style={{ background: "#F3F4F6", color: "#555" }}>
      「{text}」
    </div>
  );
}

// ─── スライド定義 ─────────────────────────────────────────────────────────

interface Slide {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  warm?: boolean;
}

const SLIDES: Slide[] = [
  {
    warm: true,
    icon: <IconLogo />,
    title: "はじめまして",
    body: (
      <p className="text-sm leading-relaxed text-center" style={{ color: "#444" }}>
        こんにちは。<br />
        代表の<strong>藤 充輝</strong>です。<br /><br />
        この度はアプリ開発に<br />
        ご協力いただき<br />
        誠にありがとうございます。<br /><br />
        今から簡単に<br />
        アプリの使い方を<br />
        説明しますね。
      </p>
    ),
  },
  {
    icon: <IconChat />,
    title: "PT専用GPT",
    body: (
      <div className="space-y-4 w-full">
        <p className="text-sm leading-relaxed text-center" style={{ color: "#444" }}>
          疾患・術式・臨床の疑問を<br />
          何でも質問できます。<br />
          教科書・ガイドラインをもとに<br />
          AIが一緒に考えます。
        </p>
        <div className="flex flex-col gap-2 items-center">
          <Bubble text="肩関節周囲炎の禁忌は？" />
          <Bubble text="変形性膝関節症の運動療法は？" />
        </div>
      </div>
    ),
  },
  {
    icon: <IconBook />,
    title: "文献検索",
    body: (
      <div className="space-y-4 w-full">
        <p className="text-sm leading-relaxed text-center" style={{ color: "#444" }}>
          論文・参考書を検索できます。<br />
          気になった文献は<br />
          そのまま詳しく確認できます。
        </p>
        <div className="flex flex-col gap-2 items-center">
          <Bubble text="脳梗塞 リハビリ" />
          <Bubble text="肩 野球" />
        </div>
      </div>
    ),
  },
  {
    icon: <IconNote />,
    title: "マイノート",
    body: (
      <div className="space-y-4 w-full">
        <p className="text-sm leading-relaxed text-center" style={{ color: "#444" }}>
          気になった回答・文献を<br />
          保存・メモできます。<br />
          自分だけの臨床ノートを<br />
          作っていけます。
        </p>
        <div className="flex justify-center">
          <div className="px-4 py-3 rounded-xl text-xs text-center leading-relaxed"
            style={{ background: "#F3F4F6", color: "#555", maxWidth: "220px" }}>
            回答画面の「ノートに保存」を<br />タップするだけです
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: <IconCycle />,
    title: "検索 → 保存 → 復習",
    body: (
      <div className="space-y-4 w-full">
        <p className="text-sm leading-relaxed text-center" style={{ color: "#444" }}>
          PT専用GPTで疑問を検索して<br />
          気になった回答はマイノートに<br />
          保存できます。<br /><br />
          1週間後、1ヶ月後に<br />
          復習することで<br />
          臨床知識がどんどん<br />
          積み重なっていきます。
        </p>
        <div className="flex items-center justify-center gap-2">
          {(["検索", "保存", "復習"] as const).map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xs font-black"
                  style={{ background: i === 0 ? "#E85D04" : i === 1 ? "#1B4332" : "#2563EB" }}>
                  {label === "検索" ? "🔍" : label === "保存" ? "📓" : "🔁"}
                </div>
                <span className="text-[10px] font-black" style={{ color: i === 0 ? "#E85D04" : i === 1 ? "#1B4332" : "#2563EB" }}>{label}</span>
              </div>
              {i < 2 && <span className="text-gray-400 font-black text-sm mt-[-10px]">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: <IconStart />,
    title: "まずは質問してみましょう",
    body: (
      <p className="text-sm leading-relaxed text-center" style={{ color: "#444" }}>
        「PT専用GPT」から<br />
        気になることを自由に<br />
        入力してみてください。
      </p>
    ),
  },
];

// ─── メインコンポーネント ──────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  /** ヘルプ経由の場合は最終スライドで遷移しない */
  helpMode?: boolean;
}

export function OnboardingModal({ onClose, helpMode = false }: Props) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const total = SLIDES.length;
  const current = SLIDES[slide];
  const isLast = slide === total - 1;

  const handleNext = () => {
    if (isLast) {
      markOnboardingDone();
      onClose();
      if (!helpMode) router.push("/pt-gpt");
    } else {
      setSlide(s => s + 1);
    }
  };

  const handleSkip = () => {
    markOnboardingDone();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        {/* スキップ */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-xs text-gray-400 hover:text-gray-600 transition z-10"
        >
          スキップ
        </button>

        {/* コンテンツ */}
        <div className="flex flex-col items-center px-6 pt-10 pb-6" style={{ minHeight: "420px" }}>

          {/* アイコン */}
          <div className="mb-5 flex items-center justify-center"
            style={{ color: current.warm ? undefined : "#E85D04" }}>
            {current.icon}
          </div>

          {/* タイトル */}
          <h2 className="text-lg font-black mb-5 text-center" style={{ color: "#1A1A1A" }}>
            {current.title}
          </h2>

          {/* 本文 */}
          <div className="flex-1 flex items-start justify-center w-full">
            {current.body}
          </div>
        </div>

        {/* インジケーター */}
        <div className="flex justify-center gap-1.5 pb-4">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width:      i === slide ? "20px" : "8px",
                height:     "8px",
                background: i === slide ? "#E85D04" : "#E5E7EB",
              }}
            />
          ))}
        </div>

        {/* ボタン */}
        <div className="px-6 pb-7">
          <button
            onClick={handleNext}
            className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition hover:opacity-90 active:scale-95"
            style={{
              background: isLast
                ? "linear-gradient(135deg, #E85D04, #c44b00)"
                : "#1A1A1A",
              fontSize: isLast ? "15px" : "14px",
              boxShadow: isLast ? "0 4px 16px rgba(232,93,4,0.35)" : undefined,
            }}
          >
            {isLast ? "はじめる →" : "次へ →"}
          </button>
        </div>
      </div>
    </div>
  );
}
