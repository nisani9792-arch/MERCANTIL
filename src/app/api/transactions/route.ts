import { transactionCreate } from "@/lib/api/schemas";
import { withApi, readJson } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { learnFromEntry } from "@/lib/db/learning-rules";
import { createTransaction, listTransactions } from "@/lib/db/transactions";

async function GETHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) return NextResponse.json({error:"גבול שליפה אינו תקין"},{status:400});

  const transactions = await listTransactions(session.userId, limit);
  return NextResponse.json({ transactions });
}

async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = transactionCreate.parse(await readJson(request));

  const day =
    body.recurringDayOfMonth != null &&
    body.recurringDayOfMonth >= 1 &&
    body.recurringDayOfMonth <= 31
      ? body.recurringDayOfMonth
      : null;

  const transaction = await createTransaction(session.userId, {
    amount: Math.abs(body.amount),
    date: body.date,
    categoryId: body.categoryId,
    accountSource: body.accountSource,
    notes: body.notes,
    isFixedRecurring: body.isFixedRecurring ?? day != null,
    recurringDayOfMonth: day,
  });

  await learnFromEntry(session.userId, {
    notes: body.notes,
    categoryId: body.categoryId,
    amount: Math.abs(body.amount),
    recurringDayOfMonth: day,
    isFixedRecurring: body.isFixedRecurring ?? day != null,
  });

  return NextResponse.json({ transaction }, { status: 201 });
}

export const GET = withApi(GETHandler, "transactions.get");

export const POST = withApi(POSTHandler, "transactions.post");
