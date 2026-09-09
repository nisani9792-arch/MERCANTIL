import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { currentMonthKey } from "@/lib/utils/month";
import { getSql } from "@/lib/db/client";

const validMonth = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await getSql()`select selected_month_key from user_finance_preferences where user_id = ${session.userId} limit 1`;
  return NextResponse.json({ monthKey: validMonth(rows[0]?.selected_month_key) ? rows[0].selected_month_key : currentMonthKey() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { monthKey?: unknown };
  if (!validMonth(body.monthKey)) return NextResponse.json({ error: "חודש לא תקין" }, { status: 400 });
  await getSql()`insert into user_finance_preferences (user_id, selected_month_key) values (${session.userId}, ${body.monthKey}) on conflict (user_id) do update set selected_month_key = excluded.selected_month_key, updated_at = now()`;
  return NextResponse.json({ monthKey: body.monthKey });
}
