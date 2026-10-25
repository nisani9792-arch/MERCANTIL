import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSql } from "@/lib/db/client";

const validMonth = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
let schema: Promise<unknown> | undefined;
function ensureSchema() {
  return schema ??= getSql()`create table if not exists monthly_planning_estimates (
    user_id text not null, month_key text not null, amount numeric(12,2),
    updated_at timestamptz not null default now(), primary key(user_id, month_key),
    check(amount is null or amount >= 0)
  )`.catch((error: unknown) => { schema = undefined; throw error; });
}
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = new URL(request.url).searchParams.get("month");
  if (!validMonth(month)) return NextResponse.json({ error: "חודש לא תקין" }, { status: 400 });
  await ensureSchema();
  const rows = await getSql()`select amount from monthly_planning_estimates where user_id = ${session.userId} and month_key = ${month}`;
  return NextResponse.json({ amount: rows[0]?.amount == null ? null : Number(rows[0].amount) }, { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !validMonth(body.month) || !(body.amount === null || (typeof body.amount === "number" && Number.isFinite(body.amount) && body.amount >= 0 && body.amount <= 999999999 && Math.abs(body.amount * 100 - Math.round(body.amount * 100)) < 0.00001))) {
    return NextResponse.json({ error: "יש להזין סכום תקין, עד שתי ספרות אחרי הנקודה" }, { status: 400 });
  }
  await ensureSchema();
  await getSql()`insert into monthly_planning_estimates(user_id, month_key, amount) values (${session.userId}, ${body.month}, ${body.amount}) on conflict(user_id, month_key) do update set amount = excluded.amount, updated_at = now()`;
  return NextResponse.json({ amount: body.amount });
}
