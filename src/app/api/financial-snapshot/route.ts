import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createFinancialSnapshotItem, financialItemKinds, listFinancialSnapshotItems, type FinancialItemKind } from "@/lib/db/financial-snapshot";

function validDate(value: unknown) { return value === null || value === undefined || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)); }

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ items: await listFinancialSnapshotItems(session.userId) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.name !== "string" || !body.name.trim() || !financialItemKinds.includes(body.kind as FinancialItemKind) ||
    (body.amount !== undefined && body.amount !== null && (!Number.isFinite(Number(body.amount)) || Number(body.amount) < 0)) || !validDate(body.dueDate)) {
    return NextResponse.json({ error: "פרטי הכרטיסייה אינם תקינים" }, { status: 400 });
  }
  const item = await createFinancialSnapshotItem(session.userId, {
    kind: body.kind as FinancialItemKind, name: body.name.trim(), institution: typeof body.institution === "string" ? body.institution.trim() || null : null,
    amount: body.amount === undefined || body.amount === null || body.amount === "" ? null : Number(body.amount), dueDate: body.dueDate as string | null,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
  });
  return NextResponse.json({ item }, { status: 201 });
}
