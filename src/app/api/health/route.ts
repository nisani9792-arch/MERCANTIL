import { withApi } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { isPinConfigured } from "@/lib/auth/pin";
import { isSessionConfigured } from "@/lib/auth/session";
import { getSql, isDatabaseConfigured } from "@/lib/db/client";

async function GETHandler() {
  const started=performance.now();
  let databaseMs=0;
  const status = {
    ok: false,
    database: "not_configured" as string,
    schema: "not_checked" as string,
    session: isSessionConfigured() ? "configured" : "missing",
    pin: isPinConfigured() ? "configured" : "missing",
  };

  if (isDatabaseConfigured()) {
    try {
      const dbStarted=performance.now();
      const sql = getSql();
      const tables = await sql`select to_regclass('public.monthly_ledger') as ledger, to_regclass('public.fixed_templates') as templates, to_regclass('public.user_finance_preferences') as preferences`;
      databaseMs=performance.now()-dbStarted;
      status.database = "connected";
      // Health checks must stay cheap on Workers. Full schema creation is a
      // provisioning task, not a request-path operation.
      status.schema = tables[0]?.ledger && tables[0]?.templates && tables[0]?.preferences ? "ready" : "missing";
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

  return NextResponse.json(status, { status: status.ok ? 200 : 503, headers:{"Server-Timing":`db;dur=${databaseMs.toFixed(1)}, app;dur=${(performance.now()-started).toFixed(1)}`} });
}

export const GET = withApi(GETHandler, "health.get");
