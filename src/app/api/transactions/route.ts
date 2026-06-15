import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createTransaction, listTransactions } from "@/lib/db/transactions";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 50);

  const transactions = await listTransactions(session.userId, limit);
  return NextResponse.json({ transactions });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    amount?: number;
    date?: string;
    categoryId?: string;
    accountSource?: string;
    notes?: string;
    isFixedRecurring?: boolean;
  };

  if (!body.amount || !body.date || !body.categoryId) {
    return NextResponse.json({ error: "נתונים חסרים" }, { status: 400 });
  }

  const transaction = await createTransaction(session.userId, {
    amount: Math.abs(body.amount),
    date: body.date,
    categoryId: body.categoryId,
    accountSource: body.accountSource,
    notes: body.notes,
    isFixedRecurring: body.isFixedRecurring ?? true,
  });

  return NextResponse.json({ transaction }, { status: 201 });
}
