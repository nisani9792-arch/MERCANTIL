import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { apiError, noStoreHeaders, RouteError } from "@/lib/api/route";
import { listBankReconciliationItems } from "@/lib/db/reconciliation";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");
    const monthKey = new URL(request.url).searchParams.get("month") ?? "";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
      throw new RouteError(400, "INVALID_REQUEST", "החודש המבוקש אינו תקין");
    }
    const transactions = await listBankReconciliationItems(session.userId, monthKey);
    return NextResponse.json({ transactions }, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error, "reconciliation.list");
  }
}
