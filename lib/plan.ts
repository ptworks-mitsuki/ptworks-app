// Plan definitions — swap CURRENT_PLAN when real auth is implemented

export type Plan = "free" | "basic" | "pro";

// Mock: "pro" keeps all existing users unblocked during development.
// Change to "basic" to test the upgrade modal.
export const CURRENT_PLAN: Plan = "pro";

// URLs that require the "pro" plan
export const PRO_URLS = [
  "/stage1/treatment",
  "/stage1/slides",
  "/learn/reimbursement",
  "/stage1/homeexercise",
  "/learn",
] as const;

export function isPro(plan: Plan): boolean {
  return plan === "pro";
}

export function canAccess(plan: Plan, url: string): boolean {
  if (isPro(plan)) return true;
  return !PRO_URLS.some(p => url === p || url.startsWith(p + "/"));
}
