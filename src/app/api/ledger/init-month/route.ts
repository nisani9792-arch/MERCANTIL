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
  if (typeof monthKey !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
    return NextResponse.json({ error: 'חודש לא תקין' }, { status: 400 });
  }

  try {
    const result = await initMonthFromTemplates(session.userId, monthKey);
    return NextResponse.json({ monthKey, ...result });
  } catch (error) {
    const incidentId = crypto.randomUUID().slice(0, 8);
    console.error(`[init-month:${incidentId}]`, error);
    return NextResponse.json(
      { error: "אתחול החודש נכשל בצד השרת", incidentId },
      { status: 500 },
    );
  }
}
