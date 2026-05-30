/**
 * lib/api-error.ts
 * ────────────────────────────────────────────────────────
 * Shared Anthropic-API error utilities
 *   - translateError   : English SDK/API errors → friendly Japanese
 *   - isBalanceError   : detect credit/billing failures
 *   - isRetryable      : detect transient errors worth retrying
 *   - withRetry        : generic retry wrapper (max 2 attempts)
 *   - notifyAdmin      : log + optional Resend email on balance failure
 *   - createClient     : per-request Anthropic client (reads env at runtime)
 * ────────────────────────────────────────────────────────
 */

import Anthropic from "@anthropic-ai/sdk";

// ── Error classification ──────────────────────────────────────────────────

/** Raw error message string (safe to call with any thrown value) */
function msgOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Returns true when the error is caused by depleted API credits */
export function isBalanceError(err: unknown): boolean {
  const m = msgOf(err).toLowerCase();
  return (
    m.includes("402") ||
    m.includes("credit_balance") ||
    m.includes("insufficient_quota") ||
    m.includes("billing") ||
    m.includes("payment_required") ||
    m.includes("out of credit")
  );
}

/** Returns true for transient errors that are safe to retry */
export function isRetryable(err: unknown): boolean {
  const m = msgOf(err).toLowerCase();
  return (
    m.includes("429") ||
    m.includes("529") ||
    m.includes("rate_limit") ||
    m.includes("overloaded") ||
    m.includes("econnreset") ||
    m.includes("fetch failed") ||
    m.includes("etimedout") ||
    m.includes("timeout")
  );
}

// ── User-facing Japanese translations ────────────────────────────────────

/**
 * Converts any Anthropic SDK / network error into a user-friendly Japanese
 * string that is safe to display directly on the UI.
 *
 * Rules (first match wins):
 *  401 / authentication → maintenance message
 *  402 / billing        → congestion message  (hides billing details)
 *  429 / rate_limit     → congestion message
 *  529 / overloaded     → congestion message
 *  pattern mismatch     → maintenance message (hides internal detail)
 *  network / timeout    → network error message
 *  everything else      → maintenance message
 */
export function translateError(err: unknown): string {
  const m = msgOf(err).toLowerCase();

  if (m.includes("401") || m.includes("authentication") || m.includes("invalid x-api-key")) {
    return "現在メンテナンス中です。しばらくお待ちください。";
  }
  if (isBalanceError(err)) {
    return "現在アクセスが集中しています。しばらくお待ちください。";
  }
  if (m.includes("429") || m.includes("rate_limit")) {
    return "現在アクセスが集中しています。しばらくお待ちください。";
  }
  if (m.includes("529") || m.includes("overloaded")) {
    return "現在アクセスが集中しています。しばらくお待ちください。";
  }
  if (
    m.includes("did not match the expected pattern") ||
    m.includes("invalid_request") ||
    m.includes("validation")
  ) {
    return "現在メンテナンス中です。しばらくお待ちください。";
  }
  if (m.includes("etimedout") || m.includes("timeout") || m.includes("timed out")) {
    return "通信に時間がかかっています。しばらくお待ちください。";
  }
  if (
    m.includes("fetch failed") ||
    m.includes("econnrefused") ||
    m.includes("enotfound") ||
    m.includes("econnreset")
  ) {
    return "通信環境をご確認ください。";
  }
  // Catch-all: never expose raw English to the user
  return "現在メンテナンス中です。しばらくお待ちください。";
}

// ── Retry wrapper ─────────────────────────────────────────────────────────

/**
 * Executes `fn` and retries up to `maxRetries` times on transient errors.
 * Uses exponential-ish back-off: delay = baseMs × (attempt + 1).
 *
 * @example
 *   const result = await withRetry(() => client.messages.create(...));
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseMs = 800,
): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      const canRetry = attempt < maxRetries && isRetryable(err);
      if (!canRetry) break;

      const wait = baseMs * (attempt + 1);
      await new Promise<void>(resolve => setTimeout(resolve, wait));
    }
  }

  throw lastErr;
}

// ── Admin notification ────────────────────────────────────────────────────

/**
 * Called whenever a balance/credit error is detected.
 *
 * Always writes a prominent console.error so the server log captures it.
 * If `RESEND_API_KEY` and `ADMIN_EMAIL` are both set in the environment,
 * also sends an email via the Resend API (https://resend.com).
 *
 * Required env vars for email:
 *   ADMIN_EMAIL      — recipient address (e.g. you@example.com)
 *   RESEND_API_KEY   — Resend API key (re_xxxxxxxxx)
 *   RESEND_FROM      — sender address (defaults to noreply@ptworks.app)
 */
export async function notifyAdmin(originalError: unknown): Promise<void> {
  const timestamp = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const rawMsg = msgOf(originalError);

  // ① Always log to server console (visible in Vercel / Railway logs)
  console.error(
    `\n🚨 [PT Works] APIクレジット残高不足アラート\n` +
    `   日時: ${timestamp}\n` +
    `   エラー: ${rawMsg}\n`
  );

  // ② Optionally send email via Resend
  const adminEmail = process.env.ADMIN_EMAIL;
  const resendKey  = process.env.RESEND_API_KEY;
  if (!adminEmail || !resendKey) return; // not configured — skip silently

  const from = process.env.RESEND_FROM ?? "noreply@ptworks.app";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from,
        to: adminEmail,
        subject: "【PT Works】APIクレジット残高不足アラート",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#dc2626;">⚠️ APIクレジット残高不足</h2>
            <p>PT Works の Anthropic API クレジットが不足しています。</p>
            <table style="border-collapse:collapse;width:100%;">
              <tr>
                <td style="padding:6px 0;color:#6b7280;white-space:nowrap;">発生日時</td>
                <td style="padding:6px 0 6px 12px;">${timestamp}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;white-space:nowrap;">エラー詳細</td>
                <td style="padding:6px 0 6px 12px;font-family:monospace;font-size:12px;">${rawMsg}</td>
              </tr>
            </table>
            <p style="margin-top:24px;">
              <a href="https://console.anthropic.com/settings/billing"
                 style="background:#e85d04;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Anthropic コンソールでチャージする
              </a>
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[PT Works] Resend API error:", res.status, body);
    }
  } catch (emailErr) {
    console.error("[PT Works] Failed to send admin email:", emailErr);
  }
}

// ── Anthropic client factory ──────────────────────────────────────────────

/**
 * Creates a fresh Anthropic client using the current process.env at call-time.
 * Call this inside the route handler (not at module level) to ensure the env
 * var is always read after Next.js has populated it.
 */
export function createClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
}

/**
 * Returns the API key or an empty string.
 * A missing key is checked separately in each route handler.
 */
export function getApiKey(): string {
  return process.env.ANTHROPIC_API_KEY ?? "";
}
