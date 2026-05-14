import Link from "next/link";

interface PlanGateBannerProps {
  requiredStage: number;  // 1-4
  planName:      string;  // "Stage 1", "Stage 2", etc.
  price:         string;  // "¥980"
  color:         string;  // hex color
  description?:  string;
}

export function PlanGateBanner({ requiredStage, planName, price, color, description }: PlanGateBannerProps) {
  return (
    <div className="mb-6 rounded-2xl border-2 overflow-hidden shadow-sm" style={{ borderColor: color }}>
      {/* Top stripe */}
      <div className="px-5 py-3 flex items-center gap-3 text-white text-sm font-bold"
        style={{ background: color }}>
        <span>この機能は {planName} 以上で利用できます</span>
        <span className="ml-auto text-xs font-normal opacity-80">{price}/月〜</span>
      </div>
      {/* Body */}
      <div className="bg-white px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          {description ?? `${planName} にアップグレードすると、この機能を含む全ての機能が使えます。`}
        </p>
        <Link
          href="/pricing"
          className="shrink-0 px-5 py-2.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90 shadow-sm"
          style={{ background: color }}
        >
          プランをアップグレード →
        </Link>
      </div>
    </div>
  );
}
