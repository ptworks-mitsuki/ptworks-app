import { NextRequest, NextResponse } from "next/server";

// These paths are always public (no auth required)
const PUBLIC = ["/", "/login", "/register", "/about", "/pricing", "/faq", "/api/auth", "/learn", "/stage1"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow: public pages, Next.js internals, static assets
  if (
    PUBLIC.some(p => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const accessCode = process.env.ACCESS_CODE;

  // If ACCESS_CODE is not configured, allow all (local dev / no auth mode)
  if (!accessCode) return NextResponse.next();

  const token = request.cookies.get("pt-auth")?.value;
  if (token !== accessCode) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
