import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  currentMonthKey,
  initMonthFromTemplates,
} from "@/lib/db/monthly-ledger";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { monthKey?: string };
  const monthKey = body.monthKey ?? currentMonthKey();

  const result = await initMonthFromTemplates(session.userId, monthKey);
  return NextResponse.json({ monthKey, ...result });
}
