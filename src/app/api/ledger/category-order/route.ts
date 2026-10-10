import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { saveMonthlyCategoryOrder } from "@/lib/db/monthly-ledger";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { monthKey?: string; categoryOrder?: unknown };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.monthKey ?? "") || !Array.isArray(body.categoryOrder) || body.categoryOrder.some((item) => typeof item !== "string" || item.length > 80)) {
    return NextResponse.json({ error: "סדר הקטגוריות אינו תקין" }, { status: 400 });
  }
  const categoryOrder = await saveMonthlyCategoryOrder(session.userId, body.monthKey!, body.categoryOrder);
  return NextResponse.json({ categoryOrder });
}
