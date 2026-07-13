// Plan definitions — swap CURRENT_PLAN when real auth is implemented

export type Plan = "free" | "basic" | "pro";

// テストモード：NEXT_PUBLIC_TEST_MODE=true の間は全ユーザーをproとして扱う
export const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

if (IS_TEST_MODE && typeof window !== "undefined") {
  console.log(
    "⚠️ テストモードが有効です。本番リリース前にNEXT_PUBLIC_TEST_MODEをfalseに変更してください。"
  );
}

// 3-hour cost limit per plan (¥). null = unlimited
export const PLAN_LIMIT_YEN: Record<Plan, number | null> = {
  free:  null,  // free plan uses monthly-count quota (useFreeQuota), not cost
  basic: 100,   // ¥980/月 → ¥100 per 3 hrs
  pro:   180,   // ¥1,980/月 → ¥180 per 3 hrs
};

// テストモード中は強制的にproプラン扱い
export const CURRENT_PLAN: Plan = IS_TEST_MODE ? "pro" : "pro";

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
