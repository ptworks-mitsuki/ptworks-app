import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code } = await req.json() as { code?: string };
  const accessCode = process.env.ACCESS_CODE;

  // No ACCESS_CODE set — open access (dev mode)
  if (!accessCode) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("pt-auth", "dev", { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
    return res;
  }

  if (!code || code !== accessCode) {
    return NextResponse.json({ error: "コードが正しくありません" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("pt-auth", accessCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
  });
  return res;
}
