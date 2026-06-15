import { NextResponse } from "next/server";
import { isSessionConfigured } from "@/lib/auth/session";
import { getSql, isDatabaseConfigured } from "@/lib/db/client";

export async function GET() {
  const status = {
    ok: false,
    database: "not_configured" as string,
    session: isSessionConfigured() ? "configured" : "missing",
  };

  if (isDatabaseConfigured()) {
    try {
      const sql = getSql();
      await sql`select 1 as ok`;
      status.database = "connected";
      status.ok = status.session === "configured";
    } catch {
      status.database = "error";
    }
  }

  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
