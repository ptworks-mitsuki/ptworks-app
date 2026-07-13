// API usage tracking with 3-hour sliding window

export interface UsageEntry {
  timestamp:   number;  // ms since epoch
  inputTokens: number;
  outputTokens: number;
  costYen:     number;
}

const STORAGE_KEY = "pt_usage_log";
const WINDOW_MS   = 3 * 60 * 60 * 1000; // 3 hours

// Anthropic pricing × 150 JPY/USD
const INPUT_YEN_PER_TOKEN  = (3  / 1_000_000) * 150; // ≈ ¥0.00045
const OUTPUT_YEN_PER_TOKEN = (15 / 1_000_000) * 150; // ≈ ¥0.00225

export function calcCostYen(inputTokens: number, outputTokens: number): number {
  return inputTokens * INPUT_YEN_PER_TOKEN + outputTokens * OUTPUT_YEN_PER_TOKEN;
}

export function loadUsageLog(): UsageEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UsageEntry[]) : [];
  } catch { return []; }
}

function saveUsageLog(log: UsageEntry[]): void {
  try {
    // Prune entries older than 6 hours to keep storage small
    const cutoff = Date.now() - 6 * WINDOW_MS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log.filter(e => e.timestamp > cutoff)));
  } catch { /* ignore */ }
}

export function recordUsage(inputTokens: number, outputTokens: number): void {
  const log = loadUsageLog();
  log.push({ timestamp: Date.now(), inputTokens, outputTokens, costYen: calcCostYen(inputTokens, outputTokens) });
  saveUsageLog(log);
}

export interface WindowUsage {
  costYen:    number;        // total cost in current 3-hr window
  entries:    UsageEntry[];  // entries within window
  oldestMs:   number | null; // timestamp of oldest entry in window
}

export function getWindowUsage(): WindowUsage {
  const log     = loadUsageLog();
  const cutoff  = Date.now() - WINDOW_MS;
  const entries = log.filter(e => e.timestamp > cutoff);
  const costYen = entries.reduce((s, e) => s + e.costYen, 0);
  const oldestMs = entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : null;
  return { costYen, entries, oldestMs };
}

// ms until the oldest 3-hr window entry expires (= when limit resets)
export function msUntilReset(): number {
  const { oldestMs } = getWindowUsage();
  if (oldestMs === null) return 0;
  return Math.max(0, oldestMs + WINDOW_MS - Date.now());
}
