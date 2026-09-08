import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteLedgerEntry, updateLedgerEntry } from "@/lib/db/monthly-ledger";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    amount?: number;
    category?: string;
    notes?: string | null;
    isPaid?: boolean;
    paymentMethod?: 'bank' | 'card' | 'cash';
    isVariable?: boolean;
  };

  if ((body.amount !== undefined && (!Number.isFinite(body.amount) || body.amount < 0)) ||
      (body.paymentMethod !== undefined && !['bank','card','cash'].includes(body.paymentMethod)) ||
      (body.isPaid !== undefined && typeof body.isPaid !== 'boolean') ||
      (body.isVariable !== undefined && typeof body.isVariable !== 'boolean')) {
    return NextResponse.json({error: 'נתונים לא תקינים'}, {status: 400});
  }
  const entry = await updateLedgerEntry(session.userId, id, body);
  if (!entry) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json({ entry });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await deleteLedgerEntry(session.userId, id);
  if (!ok) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
