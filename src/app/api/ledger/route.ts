import { withApi } from "@/lib/api/route";
import { after, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { apiError, noStoreHeaders, readJson, RouteError } from "@/lib/api/route";
import { ledgerCreateSchema } from "@/lib/ledger/validation";
import {
  addLedgerEntry,
  currentMonthKey,
  getMonthlyWorkspace,
} from "@/lib/db/monthly-ledger";

async function GETHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");

    const { searchParams } = new URL(request.url);
    const requestedMonth = searchParams.get("month");
    if (requestedMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)) {
      throw new RouteError(400, "INVALID_REQUEST", "החודש המבוקש אינו תקין");
    }
    const monthKey = requestedMonth ?? currentMonthKey();

    const {entries,summary,categoryOrder} = await getMonthlyWorkspace(session.userId,monthKey);

    return NextResponse.json({ entries, summary, monthKey, categoryOrder }, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error, "ledger.get");
  }
}

async function POSTHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");
    const body = ledgerCreateSchema.parse(await readJson(request));

    const entry = await addLedgerEntry(session.userId, {
      clientRequestId: body.clientRequestId,
      monthKey: body.monthKey ?? currentMonthKey(),
      name: body.name,
      type: body.entryKind === "cash_withdrawal" ? "expense" : body.type,
      amount: body.amount,
      amountPending: body.amountPending,
      isVariable: body.isVariable,
      category: body.category,
      notes: body.notes,
      entryKind: body.entryKind,
      paymentMethod: body.paymentMethod,
      dueDate: body.dueDate,
    }, task=>after(task));

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return apiError(error, "ledger.create");
  }
}

export const GET = withApi(GETHandler, "ledger.get");

export const POST = withApi(POSTHandler, "ledger.post");
