import { logServerError } from "@/lib/api/route";
import { withApi, readJson } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  currentMonthKey,
  initMonthFromTemplates,
} from "@/lib/db/monthly-ledger";

async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await readJson(request).catch(() => ({}))) as { monthKey?: string; templateIds?: string[]; copyAmountIds?: string[] };
  const monthKey = body.monthKey ?? currentMonthKey();
  if (typeof monthKey !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
    return NextResponse.json({ error: 'חודש לא תקין' }, { status: 400 });
  }

  try {
    if (body.templateIds !== undefined && (!Array.isArray(body.templateIds) || body.templateIds.length > 500 || body.templateIds.some((id) => typeof id !== "string"))) {
      return NextResponse.json({ error: "בחירת התבנית אינה תקינה" }, { status: 400 });
    }
    if (body.copyAmountIds !== undefined && (!Array.isArray(body.copyAmountIds) || body.copyAmountIds.length > 500 || body.copyAmountIds.some((id) => typeof id !== "string"))) {
      return NextResponse.json({ error: "בחירת הסכומים אינה תקינה" }, { status: 400 });
    }
    const result = await initMonthFromTemplates(session.userId, monthKey, body.templateIds, body.copyAmountIds);
    return NextResponse.json({ monthKey, ...result });
  } catch (error) {
    const incidentId = crypto.randomUUID().slice(0, 8);
    logServerError(`[init-month:${incidentId}]`, error);
    return NextResponse.json(
      { error: "אתחול החודש נכשל בצד השרת", incidentId },
      { status: 500 },
    );
  }
}

export const POST = withApi(POSTHandler, "ledger.init-month.post");
