export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      {/* ロゴ */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md"
          style={{ background: "#E85D04" }}
        >
          P
        </div>
        <span className="text-2xl font-black text-gray-800 tracking-tight">
          PT <span style={{ color: "#E85D04" }}>Works</span>
        </span>
      </div>

      {/* アニメーション */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-3 h-3 rounded-full animate-bounce"
          style={{ background: "#E85D04", animationDelay: "0ms" }}
        />
        <span
          className="w-3 h-3 rounded-full animate-bounce"
          style={{ background: "#1B4332", animationDelay: "150ms" }}
        />
        <span
          className="w-3 h-3 rounded-full animate-bounce"
          style={{ background: "#E85D04", animationDelay: "300ms" }}
        />
      </div>

      <p className="text-sm text-gray-500 font-medium">読み込み中...</p>
    </div>
  );
}
