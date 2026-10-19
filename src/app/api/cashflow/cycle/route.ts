import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { apiError, noStoreHeaders, RouteError } from "@/lib/api/route";
import { buildCashflowCycle } from "@/lib/cashflow/cycle";
import { getSql } from "@/lib/db/client";
import { listLedgerEntries } from "@/lib/db/monthly-ledger";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function nextMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");
    const monthKey = new URL(request.url).searchParams.get("month") ?? "";
    if (!MONTH_RE.test(monthKey)) throw new RouteError(400, "INVALID_REQUEST", "החודש אינו תקין");

    const sql = getSql();
    const preferences = await sql`select cycle_start_day from user_finance_preferences where user_id = ${session.userId} limit 1`;
    const cycleStartDay = Math.min(28, Math.max(1, Number(preferences[0]?.cycle_start_day ?? 10)));
    const [current, following] = await Promise.all([
      listLedgerEntries(session.userId, monthKey),
      listLedgerEntries(session.userId, nextMonth(monthKey)),
    ]);
    return NextResponse.json(
      { cycle: buildCashflowCycle([...current, ...following], monthKey, cycleStartDay) },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return apiError(error, "cashflow.cycle.get");
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");
    const body = (await request.json().catch(() => ({}))) as { cycleStartDay?: unknown };
    if (!Number.isInteger(body.cycleStartDay) || Number(body.cycleStartDay) < 1 || Number(body.cycleStartDay) > 28) {
      throw new RouteError(400, "INVALID_REQUEST", "יום תחילת המחזור חייב להיות בין 1 ל־28");
    }
    const sql = getSql();
    await sql`insert into user_finance_preferences (user_id, cycle_start_day) values (${session.userId}, ${body.cycleStartDay}) on conflict (user_id) do update set cycle_start_day = excluded.cycle_start_day, updated_at = now()`;
    return NextResponse.json({ cycleStartDay: body.cycleStartDay }, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error, "cashflow.cycle.patch");
  }
}
