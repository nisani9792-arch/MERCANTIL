import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { apiError, readJson, RouteError } from "@/lib/api/route";
import { correctLedgerPeriod, listLedgerEntries } from "@/lib/db/monthly-ledger";
import { ledgerPeriodCorrectionSchema } from "@/lib/ledger/validation";
import { previousMonthKey } from "@/lib/utils/month";

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");
    const targetMonthKey = new URL(request.url).searchParams.get("targetMonthKey") ?? "";
    if (!MONTH_KEY.test(targetMonthKey)) throw new RouteError(400, "INVALID_REQUEST", "החודש המבוקש אינו תקין");

    const sourceMonthKey = previousMonthKey(targetMonthKey);
    const entries = await listLedgerEntries(session.userId, sourceMonthKey);
    return NextResponse.json({ sourceMonthKey, entries });
  } catch (error) {
    return apiError(error, "ledger.period-correction.preview");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");

    const { sourceMonthKey, targetMonthKey } = ledgerPeriodCorrectionSchema.parse(await readJson(request));
    const result = await correctLedgerPeriod(session.userId, sourceMonthKey, targetMonthKey);
    return NextResponse.json({ ...result, movedCount: result.moved.length });
  } catch (error) {
    return apiError(error, "ledger.period-correction");
  }
}
