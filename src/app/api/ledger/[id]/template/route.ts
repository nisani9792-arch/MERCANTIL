import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createTemplateFromLedgerEntry } from "@/lib/db/monthly-ledger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    frequency?: "monthly" | "bi-monthly";
    dayOfMonth?: number | null;
  };
  const day = body.dayOfMonth ?? null;
  if (!['monthly', 'bi-monthly'].includes(body.frequency ?? '') ||
      (day !== null && (!Number.isInteger(day) || day < 1 || day > 31))) {
    return NextResponse.json({ error: "פרטי התבנית אינם תקינים" }, { status: 400 });
  }

  const { id } = await params;
  const result = await createTemplateFromLedgerEntry(session.userId, id, {
    frequency: body.frequency!,
    dayOfMonth: day,
  });
  if (!result) return NextResponse.json({ error: "התנועה אינה זמינה להמרה לתבנית" }, { status: 404 });
  return NextResponse.json({ template: result.template, created: result.created }, { status: result.created ? 201 : 200 });
}
