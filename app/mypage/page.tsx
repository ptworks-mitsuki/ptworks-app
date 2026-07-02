"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useFreeQuota } from "@/hooks/useFreeQuota";
import { useSavedPlans } from "@/hooks/useSavedPlans";
import type { SavedPlan } from "@/hooks/useSavedPlans";
import { useFavorites } from "@/hooks/useFavorites";
import type { FavoriteType } from "@/hooks/useFavorites";

// モック：実認証が実装されたら差し替える
const MOCK_USER = { name: "田中 優子" };
const CURRENT_PLAN = "free" as "free" | "stage1" | "stage2" | "stage3" | "stage4";

const PLAN_LABELS: Record<typeof CURRENT_PLAN, string> = {
  free:   "無料プラン",
  stage1: "臨床サポートパック",
  stage2: "副業支援パック",
  stage3: "開業・院運営パック",
  stage4: "全部入りパック",
};

// ── ゾーン2：今すぐ使うカードの定義 ────────────────────────────

const QUICK_ACTIONS = [
  {
    id:    "search",
    label: "疾患を調べる",
    desc:  "教科書・ガイドラインをもとに整理",
    href:  "/stage1",
    color: "#2563EB",
    bg:    "#EFF6FF",
    icon:  (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" aria-hidden="true">
        <circle cx="18" cy="18" r="10" stroke="#2563EB" strokeWidth="2" fill="#2563EB" fillOpacity="0.1"/>
        <line x1="25" y1="25" x2="34" y2="34" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="14" y1="18" x2="22" y2="18" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
        <line x1="18" y1="14" x2="18" y2="22" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
      </svg>
    ),
  },
  {
    id:    "treatment",
    label: "治療を考える",
    desc:  "患者情報を入力して治療を提案",
    href:  "/stage1",
    color: "#16a34a",
    bg:    "#F0FDF4",
    icon:  (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" aria-hidden="true">
        <rect x="8" y="10" width="24" height="22" rx="3" fill="#16a34a" fillOpacity="0.1" stroke="#16a34a" strokeWidth="1.5"/>
        <rect x="14" y="6" width="12" height="7" rx="2" fill="#16a34a" fillOpacity="0.15" stroke="#16a34a" strokeWidth="1.5"/>
        <path d="M20 22 C20 19 14 17 14 21 C14 25 20 28 20 28 C20 28 26 25 26 21 C26 17 20 19 20 22Z" fill="#16a34a" fillOpacity="0.5"/>
      </svg>
    ),
  },
  {
    id:    "consult",
    label: "相談する",
    desc:  "症例の悩みを24時間相談",
    href:  "/stage1",
    color: "#ea580c",
    bg:    "#FFF7ED",
    icon:  (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" aria-hidden="true">
        <rect x="4" y="8" width="24" height="16" rx="4" fill="#ea580c" fillOpacity="0.1" stroke="#ea580c" strokeWidth="1.5"/>
        <path d="M8 24 L6 32 L16 27" fill="#ea580c" fillOpacity="0.1" stroke="#ea580c" strokeWidth="1.2" strokeLinejoin="round"/>
        <circle cx="12" cy="16" r="1.5" fill="#ea580c"/>
        <circle cx="16" cy="16" r="1.5" fill="#ea580c" fillOpacity="0.6"/>
        <circle cx="20" cy="16" r="1.5" fill="#ea580c" fillOpacity="0.35"/>
        <rect x="26" y="7" width="10" height="8" rx="3" fill="#ea580c" fillOpacity="0.08" stroke="#ea580c" strokeWidth="1.2" strokeDasharray="2 1.5"/>
      </svg>
    ),
  },
];

// ─────────────────────────────────────────────────────────────────

// ── 保存プラン詳細モーダル ──────────────────────────────────────────────────

function PlanDetailModal({ plan, onClose }: { plan: SavedPlan; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 bg-black/50 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-gray-100"
          style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)" }}>
          <div>
            <p className="text-white font-black text-base leading-tight">{plan.name}</p>
            <p className="text-green-200 text-xs mt-0.5">
              {plan.disease}　·　{new Date(plan.savedAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-sm mt-0.5">✕</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {plan.patientInfo.age && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">患者情報</p>
              <p className="text-xs text-gray-700">
                {[
                  plan.patientInfo.age && `${plan.patientInfo.age}歳`,
                  plan.patientInfo.gender,
                  plan.patientInfo.goal && `「${plan.patientInfo.goal}」`,
                ].filter(Boolean).join("　·　")}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-green-700 mb-2">日本の標準的アプローチ</p>
            <div className="space-y-1">
              {plan.result.standard.points.map((p, i) => (
                <p key={i} className="text-xs text-gray-700 leading-relaxed">{p}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-blue-700 mb-2">海外エビデンス（{plan.result.evidence.length}件）</p>
            <div className="space-y-2">
              {plan.result.evidence.map((e, i) => (
                <div key={i} className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                  <p className="text-xs font-semibold text-blue-900">{e.approach}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{e.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-orange-700 mb-2">個別提案</p>
            <div className="space-y-1">
              {plan.result.personalized.split("\n").filter(Boolean).map((line, i) => (
                <p key={i} className="text-xs text-gray-700 leading-relaxed">{line}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function MyPage() {
  const router = useRouter();
  const { history } = useSearchHistory();
  const { used, total, remaining, isExhausted, percentage } = useFreeQuota();
  const { plans, removePlan }               = useSavedPlans();
  const { favorites, removeFavorite }       = useFavorites();
  const [detailPlan, setDetailPlan]         = useState<SavedPlan | null>(null);
  const [favTab, setFavTab]                 = useState<FavoriteType>("disease");

  const isLow     = remaining <= 2 && !isExhausted;
  const isFree    = CURRENT_PLAN === "free";
  const planLabel = PLAN_LABELS[CURRENT_PLAN];

  // ステータスバーの背景色
  const statusBg = isExhausted
    ? "#1B4332"
    : isLow
      ? "#E85D04"
      : "#1B4332";

  // 直近3件の検索履歴
  const recentHistory = history.slice(0, 3);

  return (
    <>
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* ══════════════════════════════════════════════════════════
          ZONE 1：ステータスバー
      ══════════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl px-5 py-4 text-white shadow-sm"
        style={{ background: statusBg }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          {/* 左：あいさつ＋プラン */}
          <div>
            <p className="text-sm font-bold text-white/80 mb-0.5">
              こんにちは、{MOCK_USER.name}さん
            </p>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                {planLabel}
              </span>
              {isFree && (
                <Link
                  href="/pricing"
                  className="text-[11px] font-bold text-white/70 hover:text-white underline underline-offset-2 transition"
                >
                  アップグレード →
                </Link>
              )}
            </div>
          </div>

          {/* 右：残り回数＋進捗バー */}
          <div className="sm:min-w-[180px]">
            {isExhausted ? (
              <p className="text-sm font-bold text-white/90 text-center sm:text-right">
                今月の上限に達しました
              </p>
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-1.5">
                  <p className="text-[11px] text-white/70">今月の残り検索回数</p>
                  <p className="text-lg font-black text-white">
                    残り <span className="text-2xl">{remaining}</span> 回
                  </p>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      background: isLow ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)",
                    }}
                  />
                </div>
                <p className="text-[10px] text-white/50 mt-1 text-right">
                  {used} / {total} 回使用済み
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ZONE 2：今すぐ使う
      ══════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-base font-black text-gray-900 mb-3">今すぐ使う</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-3 bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-opacity-100 transition group"
              style={{ borderColor: action.color + "33" }}
            >
              {/* アイコン */}
              <div
                className="shrink-0 w-14 h-14 sm:w-full sm:h-16 rounded-xl sm:rounded-lg flex items-center justify-center"
                style={{ background: action.bg }}
              >
                {action.icon}
              </div>

              {/* テキスト */}
              <div className="flex-1 sm:flex-none">
                <p
                  className="font-black text-sm sm:text-base leading-tight mb-1 group-hover:opacity-80 transition"
                  style={{ color: action.color }}
                >
                  {action.label}
                </p>
                <p className="text-xs text-gray-500 leading-snug">{action.desc}</p>
              </div>

              {/* 矢印（スマホのみ右端） */}
              <svg
                className="w-4 h-4 text-gray-300 shrink-0 sm:hidden"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ZONE 3：履歴とアップグレード
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* 最近調べた疾患 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-gray-900">最近調べた疾患</h3>
            <Link
              href="/history"
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              すべて見る →
            </Link>
          </div>

          {recentHistory.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              まだ検索履歴がありません
            </p>
          ) : (
            <ul className="space-y-2">
              {recentHistory.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => router.push(`/stage1?q=${encodeURIComponent(item.query)}`)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-orange-50 hover:border-orange-200 border border-gray-100 transition text-left group"
                  >
                    <span className="text-sm text-gray-700 font-medium group-hover:text-[#E85D04] transition truncate">
                      {item.query}
                    </span>
                    <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#E85D04] shrink-0 ml-2 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* アップグレード導線（無料プランのみ） */}
        {isFree && (
          <div
            className="rounded-2xl p-5 flex flex-col justify-between"
            style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)" }}
          >
            <div className="mb-4">
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                プランアップグレード
              </p>
              <p className="text-white font-black text-lg leading-tight mb-2">
                ¥980/月で<br />検索が無制限に
              </p>
              <ul className="space-y-1.5">
                {[
                  "メディカルサーチ 無制限",
                  "治療アプローチAI生成",
                  "スライド自動生成",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-white/80">
                    <span className="text-green-400 font-bold shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/pricing"
              className="block text-center text-sm font-black py-3 rounded-xl transition hover:opacity-90 shadow-md"
              style={{ background: "#E85D04", color: "white" }}
            >
              アップグレードする →
            </Link>
          </div>
        )}

        {/* 有料プラン：サブリンク */}
        {!isFree && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-black text-gray-900 mb-3">クイックリンク</h3>
            <div className="space-y-2">
              {[
                { href: "/stage1/slides", label: "スライド自動生成" },
                { href: "/learn",         label: "学習コンテンツ" },
                { href: "/bookmarks",     label: "ブックマーク" },
                { href: "/pricing",       label: "プラン変更" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-orange-200 transition text-sm text-gray-700 hover:text-[#E85D04] font-medium"
                >
                  {item.label}
                  <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          ZONE 4：保存した治療プラン
      ══════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-base font-black text-gray-900 mb-3">保存した治療プラン</h2>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          {plans.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              治療プランを保存するには、「治療を考える」タブで提案後に「この内容を保存する」を押してください
            </p>
          ) : (
            <ul className="space-y-2">
              {plans.map(plan => (
                <li key={plan.id} className="flex items-center gap-2 px-3 py-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition group">
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => setDetailPlan(plan)}
                  >
                    <p className="text-sm font-bold text-gray-800 group-hover:text-[#E85D04] transition truncate">{plan.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {plan.disease}　·　{new Date(plan.savedAt).toLocaleDateString("ja-JP")}
                    </p>
                  </button>
                  <button
                    onClick={() => removePlan(plan.id)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition"
                    aria-label="削除"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ZONE 5：お気に入り
      ══════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-base font-black text-gray-900 mb-3">お気に入り</h2>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* タブ */}
          <div className="flex border-b border-gray-100">
            {(["disease", "treatment", "literature"] as const).map(tab => {
              const labels: Record<string, string> = { disease: "疾患", treatment: "治療提案", literature: "文献" };
              const count = favorites.filter(f => f.type === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setFavTab(tab)}
                  className={`flex-1 py-3 text-xs font-bold transition ${
                    favTab === tab
                      ? "border-b-2 text-[#E85D04]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                  style={favTab === tab ? { borderBottomColor: "#E85D04" } : {}}
                >
                  {labels[tab]}
                  {count > 0 && (
                    <span className="ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: favTab === tab ? "#E85D04" : "#E5E7EB", color: favTab === tab ? "white" : "#6B7280" }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* リスト */}
          <div className="p-4">
            {favorites.filter(f => f.type === favTab).length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                {favTab === "disease" && "疾患の検索結果画面でハートアイコンをタップすると保存されます"}
                {favTab === "treatment" && "治療を考えるの結果画面でハートアイコンをタップすると保存されます"}
                {favTab === "literature" && "文献検索の各文献でハートアイコンをタップすると保存されます"}
              </p>
            ) : (
              <ul className="space-y-2">
                {favorites.filter(f => f.type === favTab).map(item => (
                  <li key={item.id} className="flex items-center gap-2">
                    <a
                      href={item.href}
                      target={item.type === "literature" ? "_blank" : undefined}
                      rel={item.type === "literature" ? "noopener noreferrer" : undefined}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition min-w-0 block"
                    >
                      <p className="text-sm font-semibold text-gray-800 hover:text-[#E85D04] truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.subtitle}</p>
                      )}
                    </a>
                    <button
                      onClick={() => removeFavorite(item.id)}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition"
                      aria-label="削除"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

    </div>

    {/* プラン詳細モーダル */}
    {detailPlan && (
      <PlanDetailModal plan={detailPlan} onClose={() => setDetailPlan(null)} />
    )}
    </>
  );
}
