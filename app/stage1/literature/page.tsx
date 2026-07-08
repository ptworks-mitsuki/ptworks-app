"use client";

import { useState, useCallback, useTransition, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useFavorites } from "@/hooks/useFavorites";
import {
  DUMMY_PAPERS, DUMMY_BOOKS, BOOK_CATEGORIES,
  type Paper, type Book, type BookCategoryId,
} from "./data";
import type { LiteratureSearchResponse } from "@/app/api/literature-search/route";
import type { LiteratureDetailResponse } from "@/app/api/literature-detail/route";
import { saveNewNote, loadNotes, type Note } from "@/lib/notes";
import { NoteToast } from "@/components/SaveNoteModal";

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

const BRAND_ORANGE = "#E85D04";
const BRAND_GREEN  = "#1B4332";

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k.toLowerCase()));
}

function searchPapers(papers: Paper[], keywords: string[]): Paper[] {
  if (keywords.length === 0) return papers;
  return papers.filter(p =>
    matchesKeywords(p.title + " " + p.titleJa + " " + p.authors + " " + p.keywords.join(" "), keywords)
  );
}

function searchBooks(books: Book[], keywords: string[], category: BookCategoryId | "all"): Book[] {
  const byCategory = category === "all" ? books : books.filter(b => b.category === category);
  if (keywords.length === 0) return byCategory;
  return byCategory.filter(b =>
    matchesKeywords(b.title + " " + b.authors + " " + b.summary + " " + b.keywords.join(" "), keywords)
  );
}

function evidenceBadge(level: string) {
  const colors: Record<string, string> = { A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#9ca3af" };
  return (
    <span style={{ background: colors[level] ?? "#9ca3af", color: "#fff", borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 700, marginLeft: 6 }}>
      Lv.{level}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────
// PaperCard
// ──────────────────────────────────────────────────────────────

function PaperCard({ paper, onSaved }: { paper: Paper; onSaved?: () => void }) {
  const { isFavorited, toggleFavorite } = useFavorites();
  const favId = `literature-${paper.id}`;
  const [expanded, setExpanded] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    const existing = loadNotes().find(
      n => n.type === "literature" && n.literature.some(l => l.url === paper.url)
    );
    if (existing) setNoteSaved(true);
  }, [paper.url]);

  const handleSaveNote = useCallback(() => {
    if (noteSaved) return;
    saveNewNote({
      type: "literature",
      title: paper.titleJa,
      content: paper.summary,
      memo: "",
      tags: [],
      literature: [{ title: paper.title, author: paper.authors, year: String(paper.year), url: paper.url }],
    });
    setNoteSaved(true);
    onSaved?.();
  }, [noteSaved, paper, onSaved]);
  const [detail, setDetail] = useState<LiteratureDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleExpand = useCallback(async () => {
    if (!paper.isOpenAccess) return;
    const next = !expanded;
    setExpanded(next);
    if (!next || detail || loading) return;
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/literature-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: paper.title, titleJa: paper.titleJa, authors: paper.authors, journal: paper.journal, year: paper.year, summary: paper.summary }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as LiteratureDetailResponse;
      setDetail(data);
    } catch {
      setErr("詳細情報の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [paper, expanded, detail, loading]);

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "16px 18px", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111", lineHeight: 1.5 }}>{paper.titleJa}</p>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>{paper.title}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#374151" }}>{paper.authors}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>{paper.journal}, {paper.year}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {evidenceBadge(paper.evidenceLevel)}
            {paper.isOpenAccess
              ? <span style={{ background: "#dcfce7", color: "#16a34a", borderRadius: 4, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>全文無料</span>
              : <span style={{ background: "#f3f4f6", color: "#6b7280", borderRadius: 4, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>要約のみ</span>
            }
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
          <button
            onClick={() => toggleFavorite({ id: favId, type: "literature", title: paper.titleJa, subtitle: `${paper.journal} ${paper.year}`, literatureData: { id: paper.id, title: paper.title, titleJa: paper.titleJa, authors: paper.authors, journal: paper.journal, year: paper.year, evidenceLevel: paper.evidenceLevel, url: paper.url, summary: paper.summary } })}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: 0, color: isFavorited(favId) ? "#ef4444" : "#d1d5db" }}
            title={isFavorited(favId) ? "お気に入り解除" : "お気に入りに追加"}
          >
            {isFavorited(favId) ? "♥" : "♡"}
          </button>
          <button
            onClick={handleSaveNote}
            style={{ background: noteSaved ? "#FFF7ED" : "#F9FAFB", border: `1px solid ${noteSaved ? "#FED7AA" : "#E5E7EB"}`, borderRadius: 8, cursor: noteSaved ? "default" : "pointer", padding: "3px 8px", fontSize: 11, fontWeight: 600, color: noteSaved ? "#E85D04" : "#9CA3AF", display: "flex", alignItems: "center", gap: 4 }}
            title={noteSaved ? "保存済み" : "ノートに保存"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={noteSaved ? "#E85D04" : "none"} stroke={noteSaved ? "#E85D04" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            {noteSaved ? "保存済み" : "保存"}
          </button>
        </div>
      </div>

      <p style={{ margin: "10px 0 0", fontSize: 13, color: "#374151", lineHeight: 1.7, background: "#f9fafb", borderRadius: 6, padding: "8px 12px" }}>{paper.summary}</p>

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <a href={paper.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: BRAND_GREEN, textDecoration: "underline" }}>
          PubMedで確認 →
        </a>
        {paper.isOpenAccess && (
          <button
            onClick={handleExpand}
            style={{ fontSize: 12, color: BRAND_ORANGE, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            {expanded ? "▲ 閉じる" : "▼ AIが詳細分析・臨床ポイントを表示"}
          </button>
        )}
      </div>

      {paper.isOpenAccess && expanded && (
        <div style={{ marginTop: 12, background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a", padding: "12px 14px" }}>
          {loading && <p style={{ margin: 0, color: "#92400e", fontSize: 13 }}>⏳ AI が分析中です...</p>}
          {err && <p style={{ margin: 0, color: "#dc2626", fontSize: 13 }}>{err}</p>}
          {detail && !loading && (
            <>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#92400e" }}>📋 AI詳細要約</p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#374151", lineHeight: 1.7 }}>{detail.summaryJa}</p>
              <p style={{ margin: "10px 0 4px", fontWeight: 700, fontSize: 13, color: "#92400e" }}>💡 臨床応用ポイント</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {detail.clinicalPoints.map((pt, i) => (
                  <li key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, marginBottom: 4 }}>{pt}</li>
                ))}
              </ul>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#78350f" }}>
                エビデンスレベル：<strong>{detail.evidenceLevel}</strong>　{detail.evidenceLevelReason}
              </p>
              <a href={paper.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 10, fontSize: 12, background: BRAND_GREEN, color: "#fff", borderRadius: 6, padding: "4px 12px", textDecoration: "none" }}>
                原文を読む →
              </a>
            </>
          )}
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#9ca3af" }}>※ AIが生成した情報です。実際の論文内容と異なる場合があります。</p>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// BookCard
// ──────────────────────────────────────────────────────────────

function BookCard({ book }: { book: Book }) {
  const { isFavorited, toggleFavorite } = useFavorites();
  const favId = `book-${book.id}`;
  const affiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID ?? "RAKUTEN_AFFILIATE_ID_HERE";
  const rakutenUrl = `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encodeURIComponent("https://books.rakuten.co.jp/search/?" + new URLSearchParams({ sty: "1", b: "1", f: "1", s: "0", sf: "0", e: "2", kw: book.title }).toString())}`;

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "14px 16px", marginBottom: 12, display: "flex", gap: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ width: 64, height: 85, borderRadius: 6, background: "#f3f4f6", border: "1px solid #e5e7eb", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📚</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#111", lineHeight: 1.4 }}>{book.title}</p>
          <button
            onClick={() => toggleFavorite({ id: favId, type: "book", title: book.title, subtitle: book.authors, bookData: { id: book.id, title: book.title, authors: book.authors, publisher: book.publisher, year: book.year, price: book.price, coverUrl: book.coverUrl, summary: book.summary, rakutenUrl, category: book.category } })}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 0, color: isFavorited(favId) ? "#ef4444" : "#d1d5db", flexShrink: 0 }}
          >
            {isFavorited(favId) ? "♥" : "♡"}
          </button>
        </div>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: "#6b7280" }}>{book.authors} ／ {book.publisher}（{book.year}）</p>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{book.summary}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <span style={{ fontWeight: 700, color: BRAND_ORANGE, fontSize: 14 }}>{book.price}</span>
          <a href={rakutenUrl} target="_blank" rel="noopener noreferrer" style={{ background: "#bf0000", color: "#fff", borderRadius: 6, padding: "4px 12px", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>
            楽天で購入
          </a>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// PaperSearchTab
// ──────────────────────────────────────────────────────────────

function PaperSearchTab({ initialQuery, onSaved }: { initialQuery: string; onSaved?: () => void }) {
  const [inputValue, setInputValue] = useState(initialQuery);
  const [expandedKeywords, setExpandedKeywords] = useState<{ ja: string[]; en: string[] } | null>(null);
  const [results, setResults] = useState<Paper[] | null>(
    initialQuery
      ? searchPapers(DUMMY_PAPERS, [initialQuery]).sort((a, b) => (b.isOpenAccess ? 1 : 0) - (a.isOpenAccess ? 1 : 0))
      : null
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [, startTransition] = useTransition();

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = inputValue.trim();
    if (!q) return;
    setAnalyzing(true);
    setExpandedKeywords(null);
    try {
      const res = await fetch("/api/literature-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json() as LiteratureSearchResponse;
      setExpandedKeywords({ ja: data.keywordsJa, en: data.keywordsEn });
      const kws = data.all.length > 0 ? data.all : [q];
      startTransition(() => {
        const found = searchPapers(DUMMY_PAPERS, kws);
        found.sort((a, b) => (b.isOpenAccess ? 1 : 0) - (a.isOpenAccess ? 1 : 0));
        setResults(found);
      });
    } catch {
      startTransition(() => {
        const found = searchPapers(DUMMY_PAPERS, [q]);
        found.sort((a, b) => (b.isOpenAccess ? 1 : 0) - (a.isOpenAccess ? 1 : 0));
        setResults(found);
      });
    } finally {
      setAnalyzing(false);
    }
  }, [inputValue]);

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="例：変形性膝関節症　脳卒中　肩関節　COPD..."
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, outline: "none" }}
        />
        <button
          type="submit"
          disabled={analyzing}
          style={{ background: BRAND_GREEN, color: "#fff", border: "none", borderRadius: 8, padding: "0 20px", fontSize: 14, cursor: analyzing ? "not-allowed" : "pointer", opacity: analyzing ? 0.7 : 1, whiteSpace: "nowrap" }}
        >
          {analyzing ? "分析中..." : "検索"}
        </button>
      </form>

      {analyzing && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#9a3412" }}>
          🤖 AIがキーワードを分析して検索中です...
        </div>
      )}

      {expandedKeywords && !analyzing && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
          <p style={{ margin: 0, fontWeight: 600, color: BRAND_GREEN }}>🔍 AIが以下のキーワードで検索しました</p>
          {expandedKeywords.ja.length > 0 && (
            <p style={{ margin: "6px 0 0", color: "#374151" }}>🇯🇵 {expandedKeywords.ja.map(k => <span key={k} style={{ background: "#dcfce7", borderRadius: 4, padding: "1px 6px", marginRight: 4, display: "inline-block" }}>{k}</span>)}</p>
          )}
          {expandedKeywords.en.length > 0 && (
            <p style={{ margin: "4px 0 0", color: "#374151" }}>🇺🇸 {expandedKeywords.en.map(k => <span key={k} style={{ background: "#dbeafe", borderRadius: 4, padding: "1px 6px", marginRight: 4, display: "inline-block" }}>{k}</span>)}</p>
          )}
        </div>
      )}

      {results === null && !analyzing && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
          <p style={{ fontSize: 36 }}>🔍</p>
          <p style={{ margin: 0 }}>検索キーワードを入力してください</p>
          <p style={{ margin: "4px 0 0", fontSize: 12 }}>例：「膝」「脳卒中」「呼吸リハ」「転倒予防」など</p>
        </div>
      )}

      {results !== null && !analyzing && (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>
            {results.length > 0 ? `${results.length}件ヒット（全文無料を優先表示）` : "該当する文献が見つかりませんでした"}
          </p>
          {results.map(p => <PaperCard key={p.id} paper={p} onSaved={onSaved} />)}
          {results.length > 0 && (
            <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 16 }}>
              ※ 表示しているのはダミーデータです。PubMed API連携後、実際の論文が表示されます。
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// BookSearchTab
// ──────────────────────────────────────────────────────────────

function BookSearchTab() {
  const [inputValue, setInputValue] = useState("");
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [expandedKeywords, setExpandedKeywords] = useState<{ ja: string[]; en: string[] } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BookCategoryId | "all">("all");
  const [results, setResults] = useState<Book[]>(DUMMY_BOOKS);
  const [analyzing, setAnalyzing] = useState(false);
  const [, startTransition] = useTransition();

  const applyFilter = useCallback((kws: string[], cat: BookCategoryId | "all") => {
    startTransition(() => {
      setResults(searchBooks(DUMMY_BOOKS, kws, cat));
    });
  }, []);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = inputValue.trim();
    if (!q) {
      setActiveKeywords([]);
      setExpandedKeywords(null);
      applyFilter([], selectedCategory);
      return;
    }
    setAnalyzing(true);
    setExpandedKeywords(null);
    try {
      const res = await fetch("/api/literature-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json() as LiteratureSearchResponse;
      setExpandedKeywords({ ja: data.keywordsJa, en: data.keywordsEn });
      const kws = data.all.length > 0 ? data.all : [q];
      setActiveKeywords(kws);
      applyFilter(kws, selectedCategory);
    } catch {
      setActiveKeywords([q]);
      applyFilter([q], selectedCategory);
    } finally {
      setAnalyzing(false);
    }
  }, [inputValue, selectedCategory, applyFilter]);

  const handleCategoryChange = useCallback((cat: BookCategoryId | "all") => {
    setSelectedCategory(cat);
    applyFilter(activeKeywords, cat);
  }, [activeKeywords, applyFilter]);

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="例：脳卒中　運動器　呼吸リハ　国試対策..."
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, outline: "none" }}
        />
        <button
          type="submit"
          disabled={analyzing}
          style={{ background: BRAND_GREEN, color: "#fff", border: "none", borderRadius: 8, padding: "0 20px", fontSize: 14, cursor: analyzing ? "not-allowed" : "pointer", opacity: analyzing ? 0.7 : 1, whiteSpace: "nowrap" }}
        >
          {analyzing ? "分析中..." : "検索"}
        </button>
      </form>

      {analyzing && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#9a3412" }}>
          🤖 AIがキーワードを分析して検索中です...
        </div>
      )}

      {expandedKeywords && !analyzing && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 13 }}>
          <p style={{ margin: 0, fontWeight: 600, color: BRAND_GREEN }}>🔍 AIが拡張検索を実行しました</p>
          {expandedKeywords.ja.length > 0 && (
            <p style={{ margin: "4px 0 0", color: "#374151" }}>🇯🇵 {expandedKeywords.ja.map(k => <span key={k} style={{ background: "#dcfce7", borderRadius: 4, padding: "1px 6px", marginRight: 4, display: "inline-block" }}>{k}</span>)}</p>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        <button
          onClick={() => handleCategoryChange("all")}
          style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: selectedCategory === "all" ? 700 : 400, background: selectedCategory === "all" ? BRAND_GREEN : "#f3f4f6", color: selectedCategory === "all" ? "#fff" : "#374151" }}
        >
          すべて
        </button>
        {BOOK_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: selectedCategory === cat.id ? 700 : 400, background: selectedCategory === cat.id ? BRAND_GREEN : "#f3f4f6", color: selectedCategory === cat.id ? "#fff" : "#374151" }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>{results.length}冊表示中</p>
      {results.map(b => <BookCard key={b.id} book={b} />)}
      {results.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af" }}>
          <p style={{ fontSize: 32 }}>📚</p>
          <p style={{ margin: 0 }}>該当する参考書が見つかりませんでした</p>
        </div>
      )}
      <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 16 }}>
        ※ 楽天アフィリエイトリンクを含みます。実際の商品情報と価格はサイトでご確認ください。
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Inner (uses useSearchParams — must be wrapped in Suspense)
// ──────────────────────────────────────────────────────────────

function SavedLiteratureTab() {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    setNotes(loadNotes().filter(n => n.type === "literature"));
  }, []);

  if (notes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
        <p style={{ fontSize: 36 }}>🔖</p>
        <p style={{ margin: 0, fontSize: 14 }}>保存された文献はありません</p>
        <p style={{ margin: "4px 0 0", fontSize: 12 }}>論文カードの「保存」ボタンで追加できます</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>{notes.length}件の保存済み文献</p>
      {notes.map(note => (
        <div key={note.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "14px 16px", marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#111" }}>{note.title}</p>
          {note.literature[0] && (
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#6b7280" }}>{note.literature[0].author}（{note.literature[0].year}）</p>
          )}
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#374151", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{note.content}</p>
          {note.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {note.tags.map(t => <span key={t} style={{ background: "#FFF7ED", color: "#E85D04", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600, border: "1px solid #FED7AA" }}>{t}</span>)}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            {note.literature[0]?.url && (
              <a href={note.literature[0].url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: BRAND_GREEN, textDecoration: "underline" }}>PubMedで確認 →</a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function LiteratureSearchInner() {
  const searchParams = useSearchParams();
  const initQuery = searchParams.get("q") ?? "";
  const [activeTab, setActiveTab] = useState<"paper" | "book" | "saved">("paper");
  const [savedToast, setSavedToast] = useState(false);

  const handleNoteSaved = useCallback(() => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  }, []);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 20px",
    borderRadius: "10px 10px 0 0",
    border: "none",
    cursor: "pointer",
    fontWeight: active ? 700 : 400,
    fontSize: 13,
    background: active ? "#fff" : "#f3f4f6",
    color: active ? BRAND_GREEN : "#6b7280",
    borderBottom: `2px solid ${active ? BRAND_GREEN : "transparent"}`,
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <NoteToast visible={savedToast} />
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/stage1" style={{ color: "#6B7280", fontSize: 20, textDecoration: "none", lineHeight: 1, flexShrink: 0 }}>←</Link>
        <div style={{ borderLeft: "4px solid #E85D04", paddingLeft: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#111", lineHeight: 1.25 }}>文献・参考書検索</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>論文・教科書を日本語で検索</p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid #e5e7eb", overflowX: "auto" }}>
          <button style={tabStyle(activeTab === "paper")} onClick={() => setActiveTab("paper")}>論文検索</button>
          <button style={tabStyle(activeTab === "book")}  onClick={() => setActiveTab("book")}>参考書検索</button>
          <button style={tabStyle(activeTab === "saved")} onClick={() => setActiveTab("saved")}>保存済み文献</button>
        </div>

        {activeTab === "paper" && <PaperSearchTab initialQuery={initQuery} onSaved={handleNoteSaved} />}
        {activeTab === "book"  && <BookSearchTab />}
        {activeTab === "saved" && <SavedLiteratureTab />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────

export default function LiteratureSearchPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
        読み込み中...
      </div>
    }>
      <LiteratureSearchInner />
    </Suspense>
  );
}
