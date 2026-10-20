import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { apiError, noStoreHeaders, readJson, RouteError } from "@/lib/api/route";
import { ledgerRolloverSchema } from "@/lib/ledger/validation";
import { listRolloverCandidates, rollOverUnpaidEntries } from "@/lib/db/monthly-ledger";

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");

    const targetMonthKey = new URL(request.url).searchParams.get("targetMonthKey") ?? "";
    if (!MONTH_KEY.test(targetMonthKey)) {
      throw new RouteError(400, "INVALID_REQUEST", "החודש המבוקש אינו תקין");
    }

    const result = await listRolloverCandidates(session.userId, targetMonthKey);
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error, "ledger.rollover.preview");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");

    const { targetMonthKey } = ledgerRolloverSchema.parse(await readJson(request));
    const result = await rollOverUnpaidEntries(session.userId, targetMonthKey);
    return NextResponse.json({ ...result, movedCount: result.moved.length }, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error, "ledger.rollover.apply");
  }
}
