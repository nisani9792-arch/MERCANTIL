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
  };

  if (!body.name || !body.type || body.amount == null) {
    return NextResponse.json({ error: "נתונים חסרים" }, { status: 400 });
  }

  const entry = await addLedgerEntry(session.userId, {
    monthKey: body.monthKey ?? currentMonthKey(),
    name: body.name,
    type: body.type,
    amount: Math.abs(body.amount),
    isVariable: body.isVariable,
    category: body.category,
    notes: body.notes,
  });

  return NextResponse.json({ entry }, { status: 201 });
}
