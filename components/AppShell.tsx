"use client";

import { useState, ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ThemeProvider } from "./ThemeProvider";
import Link from "next/link";

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <Header
        onSidebarToggle={() => setSidebarOpen(v => !v)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
          <main className="flex-1">
            {children}
          </main>

          <footer className="print:hidden border-t border-gray-100 bg-white py-5 mt-8">
            <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-xs"
                  style={{ background: "#E85D04" }}>P</div>
                <span className="text-xs font-bold text-gray-700">PT Works</span>
                <span className="text-xs text-gray-400">
                  © 2025 — AI生成情報を含みます。医療上の最終判断は専門家にご相談ください。
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/about"   className="text-xs text-gray-400 hover:text-gray-600 transition">PT Worksとは</Link>
                <Link href="/pricing" className="text-xs text-gray-400 hover:text-gray-600 transition">料金</Link>
                <Link href="/faq"     className="text-xs text-gray-400 hover:text-gray-600 transition">FAQ</Link>
                <a href="mailto:support@ptworks.jp" className="text-xs text-gray-400 hover:text-gray-600 transition">お問い合わせ</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  );
}
