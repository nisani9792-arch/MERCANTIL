import { NextResponse } from "next/server";
import { isPinConfigured } from "@/lib/auth/pin";
import { isSessionConfigured } from "@/lib/auth/session";
import { getSql, isDatabaseConfigured } from "@/lib/db/client";
import { ensureAppSchema } from "@/lib/db/ensure-schema";

export async function GET() {
  const status = {
    ok: false,
    database: "not_configured" as string,
    schema: "not_checked" as string,
    session: isSessionConfigured() ? "configured" : "missing",
    pin: isPinConfigured() ? "configured" : "missing",
  };

  if (isDatabaseConfigured()) {
    try {
      const sql = getSql();
      await sql`select 1 as ok`;
      status.database = "connected";
      await ensureAppSchema();
      status.schema = "ready";
      status.ok =
        status.schema === "ready" &&
        status.session === "configured" &&
        status.pin === "configured";
    } catch {
      if (status.database === "connected") {
        status.schema = "error";
      } else {
        status.database = "error";
      }
    }
  }

  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
