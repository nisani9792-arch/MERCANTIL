import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createTemplatesFromMonth } from "@/lib/db/monthly-ledger";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { monthKey?: string };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.monthKey ?? "")) return NextResponse.json({ error: "החודש אינו תקין" }, { status: 400 });
  const created = await createTemplatesFromMonth(session.userId, body.monthKey!);
  return NextResponse.json({ created });
}
