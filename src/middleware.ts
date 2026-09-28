import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("mercantil_session")?.value);
  return NextResponse.redirect(
    new URL(hasSession ? "/dashboard" : "/login", request.url),
  );
}

export const config = {
  matcher: ["/"],
};
