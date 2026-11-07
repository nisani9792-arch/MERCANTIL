import { NextResponse } from "next/server";
import { requestViolation } from "@/lib/security/request";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const violation = requestViolation(request);
    if (violation) return NextResponse.json({error: violation.error}, {status: violation.status, headers:{"Cache-Control":"no-store"}});
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  const hasSession = Boolean(request.cookies.get("mercantil_session")?.value);
  return NextResponse.redirect(
    new URL(hasSession ? "/dashboard" : "/login", request.url),
  );
}

export const config = {
  matcher: ["/", "/api/:path*"],
};
