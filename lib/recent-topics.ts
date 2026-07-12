import type { GptIntent } from "@/app/api/pt-gpt/route";

export interface RecentTopic {
  id: string;
  title: string;      // query先頭20文字
  query: string;      // 元の質問（全文）
  answer: string;     // AIの回答（raw）
  intent: GptIntent | null;
  savedAt: string;    // ISO timestamp
}

const KEY = "ptgpt_recent_topics";
const MAX = 10;

function load(): RecentTopic[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentTopic[]) : [];
  } catch { return []; }
}

export function saveRecentTopic(topic: RecentTopic): void {
  try {
    // 同じクエリは上書き（重複排除）
    const topics = load().filter(t => t.query !== topic.query);
    localStorage.setItem(KEY, JSON.stringify([topic, ...topics].slice(0, MAX)));
  } catch { /* ignore */ }
}

export function loadRecentTopics(): RecentTopic[] {
  return load();
}

export function deleteRecentTopic(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(load().filter(t => t.id !== id)));
  } catch { /* ignore */ }
}

export function getRecentTopic(id: string): RecentTopic | undefined {
  return load().find(t => t.id === id);
}
