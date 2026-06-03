"use client";

import { useState, useEffect, useRef } from "react";

const PHOTO_KEY = "pt-founder-photo-v1";

export function FounderPhoto() {
  const [photoUrl,  setPhotoUrl]  = useState<string | null>(null);
  const [hovering,  setHovering]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PHOTO_KEY);
      if (stored) setPhotoUrl(stored);
    } catch { /* ignore */ }
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPhotoUrl(url);
      try { localStorage.setItem(PHOTO_KEY, url); } catch { /* ignore */ }
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <div
      className="relative shrink-0 mx-auto sm:mx-0 group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* ── Circular photo / placeholder ── */}
      <div
        className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 border-white shadow-xl cursor-pointer"
        onClick={() => fileRef.current?.click()}
        title="クリックして写真をアップロード（推奨 400×400px 以上・JPG / PNG）"
      >
        {photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photoUrl}
            alt="藤 充輝"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex flex-col items-center justify-center gap-1">
            {/* Person placeholder icon */}
            <svg viewBox="0 0 60 60" fill="none" className="w-16 h-16">
              <circle cx="30" cy="20" r="12" fill="#9CA3AF"/>
              <path d="M6 54 C6 36 54 36 54 54" fill="#9CA3AF"/>
            </svg>
            <p className="text-xs text-gray-500 font-medium">写真</p>
          </div>
        )}

        {/* Upload overlay (hover) */}
        {(hovering || uploading) && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center gap-1 transition-opacity">
            {uploading ? (
              <span className="inline-block w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <p className="text-white text-[11px] font-bold text-center leading-tight px-2">
                  クリックで<br />写真を変更
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {/* Upload hint (bottom badge) */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[9px] text-white/60 bg-gray-800/60 rounded-full px-2 py-0.5 font-medium">
          クリックで写真変更
        </span>
      </div>
    </div>
  );
}
