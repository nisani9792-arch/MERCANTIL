import { NextResponse, type NextRequest } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const PROTECTED_PREFIXES = ["/dashboard", "/month", "/templates", "/finance", "/transactions", "/categories"];
const AUTH_ROUTES = ["/login", "/register"];
const DEPRECATED = ["/import", "/insights"];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/transactions")) {
    const url = request.nextUrl.clone();
    url.pathname = "/month";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/categories")) {
    const url = request.nextUrl.clone();
    url.pathname = "/templates";
    return NextResponse.redirect(url);
  }

  if (DEPRECATED.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  if (!isDatabaseConfigured()) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      url.searchParams.set("setup", "database");
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (isProtected && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (isAuthRoute && session) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
