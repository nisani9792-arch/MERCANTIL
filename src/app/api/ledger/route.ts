import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { apiError, noStoreHeaders, readJson, RouteError } from "@/lib/api/route";
import { ledgerCreateSchema } from "@/lib/ledger/validation";
import {
  addLedgerEntry,
  currentMonthKey,
  getMonthSummary,
  getMonthlyCategoryOrder,
  listLedgerEntries,
} from "@/lib/db/monthly-ledger";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");

    const { searchParams } = new URL(request.url);
    const requestedMonth = searchParams.get("month");
    if (requestedMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)) {
      throw new RouteError(400, "INVALID_REQUEST", "החודש המבוקש אינו תקין");
    }
    const monthKey = requestedMonth ?? currentMonthKey();

    const [entries, categoryOrder] = await Promise.all([
      listLedgerEntries(session.userId, monthKey),
      getMonthlyCategoryOrder(session.userId, monthKey),
    ]);
    const summary = await getMonthSummary(session.userId, monthKey, entries);

    return NextResponse.json({ entries, summary, monthKey, categoryOrder }, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error, "ledger.get");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");
    const body = ledgerCreateSchema.parse(await readJson(request));

    const entry = await addLedgerEntry(session.userId, {
      monthKey: body.monthKey ?? currentMonthKey(),
      name: body.name,
      type: body.entryKind === "cash_withdrawal" ? "expense" : body.type,
      amount: body.amount,
      isVariable: body.isVariable,
      category: body.category,
      notes: body.notes,
      entryKind: body.entryKind,
      paymentMethod: body.paymentMethod,
      dueDate: body.dueDate,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return apiError(error, "ledger.create");
  }
}
