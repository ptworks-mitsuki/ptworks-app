// ── ノート・辞書機能 ── DB移行対応のデータ構造

export type NoteType = "gpt" | "treatment" | "literature";

export interface NoteLiterature {
  title:  string;
  author: string;
  year:   string;
  url?:   string;
}

export interface Note {
  id:         string;
  type:       NoteType;
  title:      string;
  content:    string;
  memo:       string;
  tags:       string[];
  literature: NoteLiterature[];
  createdAt:  string;
  updatedAt:  string;
}

export const NOTES_KEY = "ptworks_notes";
export const TAGS_KEY  = "ptworks_note_tags";

// ── CRUD ──────────────────────────────────────────────────────────────────

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Note[];
  } catch { return []; }
}

export function saveNewNote(
  data: Omit<Note, "id" | "createdAt" | "updatedAt">,
): Note {
  const notes = loadNotes();
  const now   = new Date().toISOString();
  const note: Note = {
    ...data,
    id:        `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };
  notes.unshift(note);
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  saveTags(data.tags);
  return note;
}

export function updateNote(id: string, patch: Partial<Pick<Note, "title" | "memo" | "tags">>): void {
  const notes = loadNotes().map(n =>
    n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
  );
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  if (patch.tags) saveTags(patch.tags);
}

export function deleteNote(id: string): void {
  const notes = loadNotes().filter(n => n.id !== id);
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

// ── タグ管理 ──────────────────────────────────────────────────────────────

export function loadTags(): string[] {
  try {
    const raw = localStorage.getItem(TAGS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function saveTags(newTags: string[]): void {
  const existing = loadTags();
  const merged   = Array.from(new Set([...existing, ...newTags])).slice(0, 100);
  localStorage.setItem(TAGS_KEY, JSON.stringify(merged));
}

// ── エクスポート ───────────────────────────────────────────────────────────

export function exportNotes(): void {
  const notes    = loadNotes();
  const payload  = {
    version:    "1.0",
    exportedAt: new Date().toISOString(),
    notes,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `ptworks_notes_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── インポート ─────────────────────────────────────────────────────────────

export function importNotes(json: string): { count: number } {
  const payload = JSON.parse(json) as { notes?: Note[] };
  const imported = Array.isArray(payload.notes) ? payload.notes : [];
  const existing = loadNotes();
  const existingIds = new Set(existing.map(n => n.id));
  const toAdd = imported.filter(n => !existingIds.has(n.id));
  const merged = [...toAdd, ...existing];
  localStorage.setItem(NOTES_KEY, JSON.stringify(merged));
  return { count: toAdd.length };
}
