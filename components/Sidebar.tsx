"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFreeQuota } from "@/hooks/useFreeQuota";
import { useState } from "react";
import { CURRENT_PLAN, canAccess } from "@/lib/plan";

interface SidebarProps {
  isOpen:  boolean;
  onClose: () => void;
}

// ─── トースト ─────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className="fixed bottom-24 left-1/2 z-[100] px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-xl pointer-events-none transition-all duration-300"
      style={{
        background: "#1A1A1A",
        transform:  `translateX(-50%) translateY(${visible ? "0" : "12px"})`,
        opacity:    visible ? 1 : 0,
        maxWidth:   "90vw",
        textAlign:  "center",
        whiteSpace: "pre-line",
      }}
    >
      {message}
    </div>
  );
}

function useToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const show = (msg: string) => {
    setMessage(msg);
    setVisible(true);
    setTimeout(() => setVisible(false), 2000);
  };
  return { visible, message, show };
}

// ─── プロアップグレードモーダル ────────────────────────────────────────────

function ProUpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-5"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3"
            style={{ background: "#FFF7ED" }}>
            <span className="text-2xl">🚀</span>
          </div>
          <h2 className="text-base font-black text-gray-900 leading-snug mb-2">
            この機能は「臨床サポート・プロ」<br />でご利用いただけます
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            AI治療考察・スライド自動生成・<br />
            診療報酬ガイドなど<br />
            さらに便利な機能が使えます
          </p>
        </div>

        <div className="space-y-2">
          <Link
            href="/pricing"
            onClick={onClose}
            className="flex items-center justify-center w-full py-3 rounded-xl font-black text-white text-sm transition hover:opacity-90 active:scale-95"
            style={{ background: "#E85D04" }}
          >
            プロにアップグレード →
          </Link>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 transition hover:bg-gray-100"
          >
            今は閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NavLink ──────────────────────────────────────────────────────────────

function NavLink({
  href, label, sub = false, pathname, onClose,
}: {
  href: string; label: string; sub?: boolean;
  pathname: string; onClose: () => void;
}) {
  const isActive = href === "/" ? pathname === "/" : pathname === href;

  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center justify-between rounded-xl transition-all"
      style={{
        marginLeft:   sub ? "0.75rem" : "0.5rem",
        marginRight:  "0.5rem",
        marginBottom: "2px",
        padding:      sub ? "9px 12px" : "10px 12px",
        background:   isActive ? "#FFF7ED" : "transparent",
        color:        isActive ? "#E85D04" : sub ? "#555555" : "#1A1A1A",
        fontWeight:   isActive ? 700 : sub ? 400 : 600,
        fontSize:     "13px",
      }}
    >
      <span className="truncate">{label}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#E85D04" }} />
      )}
    </Link>
  );
}

// ─── ProNavLink（プロ機能：プランによりモーダル表示） ─────────────────────

function ProNavLink({
  href, label, pathname, onClose, onUpgrade,
}: {
  href: string; label: string; pathname: string; onClose: () => void; onUpgrade: () => void;
}) {
  const isActive  = pathname === href;
  const hasAccess = canAccess(CURRENT_PLAN, href);

  if (hasAccess) {
    return (
      <Link
        href={href}
        onClick={onClose}
        className="flex items-center justify-between rounded-xl transition-all"
        style={{
          marginLeft: "0.75rem", marginRight: "0.5rem", marginBottom: "2px",
          padding: "9px 12px",
          background: isActive ? "#FFF7ED" : "transparent",
          color:      isActive ? "#E85D04" : "#555555",
          fontWeight: isActive ? 700 : 400,
          fontSize:   "13px",
        }}
      >
        <span className="truncate">{label}</span>
        {isActive && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#E85D04" }} />}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onUpgrade}
      className="w-full flex items-center justify-between rounded-xl transition-all text-left"
      style={{
        marginLeft: "0.75rem", marginRight: "0.5rem", marginBottom: "2px",
        width: "calc(100% - 1.25rem)",
        padding: "9px 12px",
        color:      "#9CA3AF",
        fontSize:   "13px",
        fontWeight: 400,
      }}
    >
      <span className="truncate">{label}</span>
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: "#FFF7ED", color: "#E85D04" }}>
        PRO
      </span>
    </button>
  );
}

// ─── メインサービスリンク ─────────────────────────────────────────────────

function MainServiceLink({
  href, label, pathname, onClose,
}: {
  href: string; label: string; pathname: string; onClose: () => void;
}) {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center justify-between transition-all"
      style={{
        padding:      "9px 12px",
        color:        isActive ? "#c44b00" : "#E85D04",
        fontWeight:   700,
        fontSize:     "13px",
        background:   isActive ? "rgba(232,93,4,0.12)" : "transparent",
        borderRadius: "0 8px 8px 0",
      }}
    >
      <span className="truncate">{label}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#E85D04" }} />
      )}
    </Link>
  );
}

// ─── 準備中アイテム ────────────────────────────────────────────────────────

function ComingSoonItem({ label, onToast }: { label: string; onToast: () => void }) {
  return (
    <button
      type="button"
      onClick={onToast}
      className="w-full flex items-center justify-between rounded-xl text-left transition-all"
      style={{
        margin:     "0 0.5rem 2px",
        padding:    "10px 12px",
        width:      "calc(100% - 1rem)",
        color:      "#9CA3AF",
        cursor:     "default",
        fontSize:   "13px",
        fontWeight: 500,
      }}
    >
      <span>{label}</span>
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: "#E5E7EB", color: "#9CA3AF" }}>
        準備中
      </span>
    </button>
  );
}

// ─── 区切り・見出し ───────────────────────────────────────────────────────

function Divider() {
  return <div className="mx-3 my-2" style={{ borderTop: "1px solid #F0F0F0" }} />;
}

function SectionLabel({ label, color = "#9CA3AF" }: { label: string; color?: string }) {
  return (
    <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
      {label}
    </p>
  );
}

function SubLabel({ label }: { label: string }) {
  return (
    <p className="px-4 pt-1 pb-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: "#BDBDBD" }}>
      {label}
    </p>
  );
}

// ─── メインSidebar ────────────────────────────────────────────────────────

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { used, total, remaining, isExhausted, percentage } = useFreeQuota();
  const toast = useToast();
  const [showProModal, setShowProModal] = useState(false);

  const handleComingSoon = () => {
    toast.show("現在準備中です。\nもうしばらくお待ちください。");
  };

  const handleUpgrade = () => {
    setShowProModal(true);
  };

  return (
    <>
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 bg-black/30 z-30 backdrop-blur-sm" />
      )}

      <aside
        className={`
          fixed left-0 top-14 h-[calc(100vh-3.5rem)]
          w-64 bg-white border-r
          flex flex-col overflow-hidden z-40
          transition-transform duration-300 ease-in-out
          print:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ borderColor: "#F0F0F0" }}
      >

        {/* 無料枠バナー */}
        <div className="shrink-0 px-3 pt-3 pb-2">
          {isExhausted ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-[10px] font-black text-red-700 mb-1">今月の無料枠を使い切りました</p>
              <p className="text-[10px] text-red-500 mb-2">引き続きご利用にはアップグレードが必要です</p>
              <Link href="/pricing" onClick={onClose}
                className="flex items-center justify-center w-full py-2 rounded-xl font-black text-white text-[10px] transition hover:opacity-90"
                style={{ background: "#dc2626" }}>
                プランをアップグレードする
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border p-3"
              style={{
                background:  remaining <= 2 ? "#FFF1F2" : "#FFF7ED",
                borderColor: remaining <= 2 ? "#FECDD3" : "#FED7AA",
              }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold" style={{ color: remaining <= 2 ? "#9F1239" : "#9A3412" }}>
                  今月の無料枠
                </p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[10px] font-semibold" style={{ color: remaining <= 2 ? "#dc2626" : "#EA580C" }}>残り</span>
                  <span className="font-black text-2xl leading-none" style={{ color: remaining <= 2 ? "#dc2626" : "#E85D04" }}>{remaining}</span>
                  <span className="text-[10px] font-semibold" style={{ color: remaining <= 2 ? "#dc2626" : "#EA580C" }}>回</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: remaining <= 2 ? "#FECDD3" : "#FED7AA" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%`, background: remaining <= 2 ? "#dc2626" : "#E85D04" }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: remaining <= 2 ? "#FDA4AF" : "#FDBA74" }}>
                  {used}/{total} 回使用
                </span>
                {remaining <= 2 && (
                  <span className="text-[10px] font-bold text-red-600">あと{remaining}回で上限</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ナビゲーション */}
        <div className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: "none" }}>

          {/* ホーム */}
          <NavLink href="/" label="ホーム" pathname={pathname} onClose={onClose} />

          <Divider />

          {/* マイアカウント */}
          <SectionLabel label="マイアカウント" />
          <NavLink href="/mynote"    label="マイノート"         sub pathname={pathname} onClose={onClose} />
          <NavLink href="/mypage"    label="マイページ"         sub pathname={pathname} onClose={onClose} />
          <NavLink href="/history"   label="利用履歴"           sub pathname={pathname} onClose={onClose} />
          <NavLink href="/bookmarks" label="ブックマーク・メモ" sub pathname={pathname} onClose={onClose} />

          <Divider />

          {/* 臨床サポートパック */}
          <SectionLabel label="臨床サポートパック　無料〜¥980" color="#E85D04" />

          <div className="mx-2 mb-2 overflow-hidden rounded-xl"
            style={{ background: "#FFF5F0", borderLeft: "4px solid #E85D04" }}>
            <SubLabel label="メインサービス" />
            <MainServiceLink href="/pt-gpt"            label="PT専用GPT" pathname={pathname} onClose={onClose} />
            <MainServiceLink href="/stage1/literature" label="文献検索"  pathname={pathname} onClose={onClose} />
            <MainServiceLink href="/mynote"            label="マイノート" pathname={pathname} onClose={onClose} />
          </div>

          <Divider />

          {/* 臨床サポート・プロ */}
          <SectionLabel label="臨床サポート・プロ　¥1,980" color="#7C3AED" />

          <ComingSoonItem label="AI治療考察"         onToast={handleComingSoon} />
          <ComingSoonItem label="スライド自動生成"     onToast={handleComingSoon} />
          <ComingSoonItem label="診療報酬・算定ガイド" onToast={handleComingSoon} />
          <ComingSoonItem label="自主トレ指導書作成"   onToast={handleComingSoon} />
          <ComingSoonItem label="学習コンテンツ"       onToast={handleComingSoon} />

          <Divider />

          {/* 準備中 */}
          <ComingSoonItem label="コンテンツマーケット" onToast={handleComingSoon} />
          <ComingSoonItem label="副業支援パック"       onToast={handleComingSoon} />
          <ComingSoonItem label="開業・院運営パック"   onToast={handleComingSoon} />
          <ComingSoonItem label="全部入りパック"       onToast={handleComingSoon} />

          <Divider />

          {/* サービス情報 */}
          <SectionLabel label="サービス情報" />
          <NavLink href="/about"   label="PT Worksとは"             sub pathname={pathname} onClose={onClose} />
          <NavLink href="/guide"   label="PT Worksの使い方について" sub pathname={pathname} onClose={onClose} />
          <NavLink href="/pricing" label="料金プラン"               sub pathname={pathname} onClose={onClose} />

          <div className="h-6" />
        </div>
      </aside>

      <Toast message={toast.message} visible={toast.visible} />

      {showProModal && <ProUpgradeModal onClose={() => setShowProModal(false)} />}
    </>
  );
}
