import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createTemplatesFromMonth } from "@/lib/db/monthly-ledger";
import { apiError, readJson, RouteError } from "@/lib/api/route";
import { monthTemplateSchema } from "@/lib/ledger/validation";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");
    const body = monthTemplateSchema.parse(await readJson(request));
    const created = await createTemplatesFromMonth(session.userId, body.monthKey);
    return NextResponse.json({ created });
  } catch (error) {
    return apiError(error, "ledger.month-template");
  }
}
