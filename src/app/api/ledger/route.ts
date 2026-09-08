import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  addLedgerEntry,
  currentMonthKey,
  getMonthSummary,
  listLedgerEntries,
} from "@/lib/db/monthly-ledger";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const monthKey = searchParams.get("month") ?? currentMonthKey();

  const [entries, summary] = await Promise.all([
    listLedgerEntries(session.userId, monthKey),
    getMonthSummary(session.userId, monthKey),
  ]);

  return NextResponse.json(
    { entries, summary, monthKey },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    monthKey?: string;
    name?: string;
    type?: "income" | "expense";
    amount?: number;
    isVariable?: boolean;
    category?: string;
    notes?: string;
    entryKind?: "transaction" | "cash_withdrawal";
    paymentMethod?: "bank" | "card" | "cash";
  };

  if (!body.name?.trim() || !['income','expense'].includes(body.type ?? '') || !Number.isFinite(body.amount) || Number(body.amount) < 0 ||
      (body.monthKey !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.monthKey)) ||
      (body.entryKind !== undefined && !['transaction','cash_withdrawal'].includes(body.entryKind)) ||
      (body.paymentMethod !== undefined && !['bank','card','cash'].includes(body.paymentMethod))) {
    return NextResponse.json({ error: "נתונים חסרים" }, { status: 400 });
  }

  const entry = await addLedgerEntry(session.userId, {
    monthKey: body.monthKey ?? currentMonthKey(),
    name: body.name,
    type: body.entryKind === 'cash_withdrawal' ? 'expense' : body.type!,
    amount: Number(body.amount),
    isVariable: body.isVariable,
    category: body.category,
    notes: body.notes,
    entryKind: body.entryKind,
    paymentMethod: body.paymentMethod,
  });

  return NextResponse.json({ entry }, { status: 201 });
}
