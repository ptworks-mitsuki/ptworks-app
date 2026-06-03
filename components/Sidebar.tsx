"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFreeQuota } from "@/hooks/useFreeQuota";
import { useState } from "react";

interface SidebarProps {
  isOpen:  boolean;
  onClose: () => void;
}

// ── Current plan (mock: free plan) ────────────────────────────────────────
// Replace with real auth context when available
const CURRENT_PLAN = "free" as "free" | "stage1" | "stage2" | "stage3" | "stage4";

const PLAN_META = {
  free:   { label: "無料プラン",       color: "#6B7280", bg: "#F3F4F6",  text: "#374151" },
  stage1: { label: "臨床サポートパック",   color: "#1B4332", bg: "#DCFCE7",  text: "#14532D" },
  stage2: { label: "副業支援パック",       color: "#2563EB", bg: "#DBEAFE",  text: "#1E40AF" },
  stage3: { label: "開業・院運営パック",   color: "#7C3AED", bg: "#EDE9FE", text: "#4C1D95" },
  stage4: { label: "全部入りパック",       color: "#E85D04", bg: "#FEF3C7",  text: "#92400E" },
};

const PLAN_LEVEL = { free: 0, stage1: 1, stage2: 2, stage3: 3, stage4: 4 };

// 開発中: 全ユーザーが全機能を使えるようロックを一時的に無効化
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function canAccess(_required: "free" | "stage1" | "stage2" | "stage3" | "stage4") {
  return true;
}

// ── Stage feature groups ──────────────────────────────────────────────────

const STAGE1_FEATURES = [
  { href: "/stage1",        icon: "›", label: "メディカルサーチ", sub: false, required: "free"   as const, badge: canAccess("free") ? "月5回" : undefined },
  { href: "/stage1",        icon: "›", label: "メディカルサーチ無制限", sub: true, required: "stage1" as const },
  { href: "/stage1",        icon: "›", label: "症例相談機能",         sub: true, required: "stage1" as const },
  { href: "/stage1",        icon: "›", label: "自主トレ指導書作成",   sub: true, required: "stage1" as const },
  { href: "/stage1/slides", icon: "›", label: "スライド自動生成",     sub: true, required: "stage1" as const },
  { href: "/learn",         icon: "›", label: "学習コンテンツ",       sub: true, required: "free"   as const, badge: canAccess("stage1") ? undefined : "一部のみ" },
];

const STAGE2_FEATURES = [
  { icon: "›", label: "副業診断・ロードマップ" },
  { icon: "›", label: "AIコーチング" },
  { icon: "›", label: "SNS・ブログ・LP文章生成" },
  { icon: "›", label: "収益管理ダッシュボード" },
  { icon: "›", label: "先輩PT成功事例DB" },
];

const STAGE3_FEATURES = [
  { icon: "›", label: "口コミ返信文生成" },
  { icon: "›", label: "Googleビジネス最適化" },
  { icon: "›", label: "問い合わせチャットボット" },
  { icon: "›", label: "確定申告・経費管理補助" },
];

const STAGE4_FEATURES = [
  { icon: "›", label: "全パックの機能使い放題" },
  { icon: "›", label: "優先サポート" },
  { icon: "›", label: "新機能先行アクセス" },
  { icon: "›", label: "月1回AIキャリア相談" },
];

const USER_NAV = [
  { href: "/mypage",    icon: "›", label: "マイページ" },
  { href: "/history",   icon: "›", label: "利用履歴" },
  { href: "/bookmarks", icon: "›", label: "ブックマーク・メモ" },
];

const SERVICE_NAV = [
  { href: "/about",   icon: "›", label: "PT Worksとは" },
  { href: "/pricing", icon: "›", label: "料金プラン" },
  { href: "/faq",     icon: "›", label: "よくある質問" },
];

// ── NavLink ───────────────────────────────────────────────────────────────

function NavLink({ href, icon, label, sub, locked, badge, pathname, onClose }: {
  href: string; icon: string; label: string;
  sub?: boolean; locked?: boolean; badge?: string;
  pathname: string; onClose: () => void;
}) {
  const isActive = href === "/" ? pathname === "/" : pathname === href;

  return (
    <Link
      href={locked ? "/pricing" : href}
      onClick={onClose}
      className={`flex items-center justify-between rounded-xl text-sm transition-all mb-0.5 ${
        sub ? "ml-5 mr-2 px-2.5 py-1.5" : "mx-2 px-3 py-2"
      } ${
        isActive
          ? "text-[#E85D04] font-semibold bg-orange-50"
          : locked
            ? "text-gray-400 hover:bg-gray-50"
            : sub
              ? "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {sub && <span className="text-gray-300 text-xs shrink-0">└</span>}
        <span className={sub ? "text-sm" : "text-base"}>{icon}</span>
        <span className={`truncate ${sub ? "text-xs" : ""}`}>{label}</span>
        {badge && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium shrink-0">{badge}</span>
        )}
      </div>
      {locked && (
        <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )}
    </Link>
  );
}

// ── Locked stage section ──────────────────────────────────────────────────

function LockedStageSection({ title, price, color, features, isExpanded, onToggle }: {
  title: string; price: string; color: string;
  features: { icon: string; label: string }[];
  isExpanded: boolean; onToggle: () => void;
}) {
  return (
    <div className="mx-2 mb-0.5">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="font-medium text-xs" style={{ color }}>{title}</span>
          <span className="text-[10px] text-gray-400">{price}</span>
        </div>
        <span className="text-gray-300 text-xs transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : "" }}>▾</span>
      </button>
      {isExpanded && (
        <div className="ml-3 pb-1">
          {features.map(f => (
            <Link key={f.label} href="/pricing"
              className="flex items-center gap-2 ml-2 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-50 transition">
              <span className="text-gray-300 text-xs">└</span>
              <span className="text-gray-300">{f.icon}</span>
              <span>{f.label}</span>
              <svg className="w-3 h-3 text-gray-200 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </Link>
          ))}
          <Link href="/pricing"
            className="flex items-center justify-center gap-1 mx-2 mt-2 py-1.5 rounded-lg text-[10px] font-bold text-white transition hover:opacity-90"
            style={{ background: color }}>
            このプランを見る →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { used, total, remaining, percentage } = useFreeQuota();

  const [openStage2, setOpenStage2] = useState(false);
  const [openStage3, setOpenStage3] = useState(false);
  const [openStage4, setOpenStage4] = useState(false);

  const plan = PLAN_META[CURRENT_PLAN];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div onClick={onClose} className="lg:hidden fixed inset-0 bg-black/30 z-30 backdrop-blur-sm" />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed left-0 top-14 h-[calc(100vh-3.5rem)]
          w-64 bg-white border-r border-gray-200
          flex flex-col overflow-hidden z-40
          transition-transform duration-300 ease-in-out
          print:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >

        {/* ── Plan badge + upgrade ── */}
        <div className="shrink-0 px-3 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: plan.bg, color: plan.text }}>
                {plan.label}
              </span>
            </div>
            <Link href="/pricing" className="text-[10px] font-bold text-[#E85D04] hover:underline">
              プラン変更
            </Link>
          </div>

          {/* Upgrade CTA */}
          {CURRENT_PLAN === "free" && (
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl font-bold text-white text-xs transition hover:opacity-90 shadow-sm"
              style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}
            >
              プランをアップグレードする
            </Link>
          )}
        </div>

        {/* ── Free quota banner ── */}
        <div className="shrink-0 px-3 pb-2">
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-orange-700">今月の無料枠</p>
              <span className="text-[10px] font-semibold text-orange-600">
                残り <span className="text-sm font-black">{remaining}</span> 回
              </span>
            </div>
            <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percentage}%`, background: percentage >= 80 ? "#dc2626" : "#E85D04" }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-orange-400">{used}/{total} 回使用</span>
              {remaining <= 2 && remaining > 0 && (
                <span className="text-[10px] text-red-500 font-semibold">⚠ 残りわずか</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Nav (scrollable) ── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-1">

          {/* PT Worksとは — 最上部 */}
          <NavLink href="/about" icon="›" label="PT Worksとは" pathname={pathname} onClose={onClose} />

          {/* Home */}
          <NavLink href="/" icon="›" label="ホーム" pathname={pathname} onClose={onClose} />

          {/* Stage 1 section */}
          <div className="mx-2 mt-2 mb-0.5">
            <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              臨床サポートパック
              <span className="ml-1 text-green-600 font-semibold">無料〜¥980</span>
            </p>
          </div>

          {/* Stage1 nav items — 全ロック解除済み */}
          <NavLink href="/stage1"        icon="🔬" label="メディカルサーチ" sub badge="無制限" pathname={pathname} onClose={onClose} />
          <NavLink href="/stage1"        icon="📋" label="自主トレ指導書作成" sub pathname={pathname} onClose={onClose} />
          <NavLink href="/stage1/slides" icon="📊" label="スライド自動生成" sub pathname={pathname} onClose={onClose} />
          <NavLink href="/learn"         icon="📚" label="学習コンテンツ" sub pathname={pathname} onClose={onClose} />

          {/* Divider */}
          <div className="mx-3 my-2 border-t border-gray-100" />

          {/* Stage 2 — unlocked, all users can view */}
          <div className="mx-2 mb-0.5">
            <button
              onClick={() => setOpenStage2(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-blue-50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs" style={{ color: "#2563EB" }}>副業支援パック</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#2563EB" }}>初月¥980</span>
              </div>
              <span className="text-gray-400 text-xs transition-transform" style={{ transform: openStage2 ? "rotate(180deg)" : "" }}>▾</span>
            </button>
            {openStage2 && (
              <div className="ml-3 pb-1">
                {STAGE2_FEATURES.map(f => (
                  <Link key={f.label} href="/stage2" onClick={onClose}
                    className="flex items-center gap-2 ml-2 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition">
                    <span className="text-gray-300 text-xs">└</span>
                    <span>{f.label}</span>
                  </Link>
                ))}
                <Link href="/stage2" onClick={onClose}
                  className="flex items-center justify-center gap-1 mx-2 mt-2 py-1.5 rounded-lg text-[10px] font-bold text-white transition hover:opacity-90"
                  style={{ background: "#2563EB" }}>
                  詳細・申し込みを見る →
                </Link>
              </div>
            )}
          </div>

          {/* Stage 3 — unlocked */}
          <div className="mx-2 mb-0.5">
            <button
              onClick={() => setOpenStage3(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-purple-50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs" style={{ color: "#7C3AED" }}>開業・院運営パック</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#7C3AED" }}>初月¥2,980</span>
              </div>
              <span className="text-gray-400 text-xs" style={{ transform: openStage3 ? "rotate(180deg)" : "" }}>▾</span>
            </button>
            {openStage3 && (
              <div className="ml-3 pb-1">
                {STAGE3_FEATURES.map(f => (
                  <Link key={f.label} href="/stage3" onClick={onClose}
                    className="flex items-center gap-2 ml-2 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-purple-50 hover:text-purple-700 transition">
                    <span className="text-gray-300 text-xs">└</span>
                    <span>{f.label}</span>
                  </Link>
                ))}
                <Link href="/stage3" onClick={onClose}
                  className="flex items-center justify-center gap-1 mx-2 mt-2 py-1.5 rounded-lg text-[10px] font-bold text-white transition hover:opacity-90"
                  style={{ background: "#7C3AED" }}>
                  詳細を見る →
                </Link>
              </div>
            )}
          </div>

          {/* Stage 4 — unlocked */}
          <div className="mx-2 mb-0.5">
            <button
              onClick={() => setOpenStage4(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-orange-50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs" style={{ color: "#E85D04" }}>全部入りパック</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#E85D04" }}>初月¥3,480</span>
              </div>
              <span className="text-gray-400 text-xs" style={{ transform: openStage4 ? "rotate(180deg)" : "" }}>▾</span>
            </button>
            {openStage4 && (
              <div className="ml-3 pb-1">
                {STAGE4_FEATURES.map(f => (
                  <Link key={f.label} href="/stage4" onClick={onClose}
                    className="flex items-center gap-2 ml-2 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-orange-50 hover:text-orange-700 transition">
                    <span className="text-gray-300 text-xs">└</span>
                    <span>{f.label}</span>
                  </Link>
                ))}
                <Link href="/stage4" onClick={onClose}
                  className="flex items-center justify-center gap-1 mx-2 mt-2 py-1.5 rounded-lg text-[10px] font-bold text-white transition hover:opacity-90"
                  style={{ background: "#E85D04" }}>
                  詳細を見る →
                </Link>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-3 my-2 border-t border-gray-100" />

          {/* User nav */}
          <p className="px-5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">マイアカウント</p>
          {USER_NAV.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={onClose}
                className={`flex items-center gap-2.5 mx-2 px-3 py-2 rounded-xl text-sm transition-all mb-0.5 ${
                  isActive
                    ? "bg-orange-50 text-[#E85D04] font-semibold"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}>
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Divider */}
          <div className="mx-3 my-2 border-t border-gray-100" />

          {/* Service nav */}
          <p className="px-5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">サービス情報</p>
          {SERVICE_NAV.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={onClose}
                className={`flex items-center gap-2.5 mx-2 px-3 py-2 rounded-xl text-sm transition-all mb-0.5 ${
                  isActive
                    ? "bg-orange-50 text-[#E85D04] font-semibold"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}>
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="h-4" />
        </div>
      </aside>
    </>
  );
}
