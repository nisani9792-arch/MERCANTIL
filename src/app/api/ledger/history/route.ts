import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { addFromHistory, listHistoryChoices } from "@/lib/db/ledger-history";
import { apiError, noStoreHeaders, RouteError } from "@/lib/api/route";

const monthValid = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");
    const month = new URL(request.url).searchParams.get("month");
    if (!monthValid(month)) throw new RouteError(400, "INVALID_REQUEST", "חודש לא תקין");
    return NextResponse.json({ items: await listHistoryChoices(session.userId, month) }, { headers: noStoreHeaders });
  } catch (error) { return apiError(error, "history.get"); }
}
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");
    const body = await request.json().catch(() => null);
    if (!body || !monthValid(body.month) || !Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > 100 || body.ids.some((id: unknown) => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
      throw new RouteError(400, "INVALID_REQUEST", "יש לבחור עד 100 פריטים תקינים");
    }
    return NextResponse.json(await addFromHistory(session.userId, body.month, [...new Set<string>(body.ids)]), { headers: noStoreHeaders });
  } catch (error) { return apiError(error, "history.add"); }
}
