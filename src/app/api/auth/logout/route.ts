import { withApi } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { clearSessionCookieOptions } from "@/lib/auth/session";

async function POSTHandler() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearSessionCookieOptions());
  return response;
}

export const POST = withApi(POSTHandler, "auth.logout.post");
