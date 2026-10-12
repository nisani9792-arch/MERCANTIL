import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { saveMonthlyCategoryOrder } from "@/lib/db/monthly-ledger";
import { apiError, readJson, RouteError } from "@/lib/api/route";
import { categoryOrderSchema } from "@/lib/ledger/validation";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");
    const body = categoryOrderSchema.parse(await readJson(request));
    const categoryOrder = await saveMonthlyCategoryOrder(session.userId, body.monthKey, body.categoryOrder);
    return NextResponse.json({ categoryOrder });
  } catch (error) {
    return apiError(error, "ledger.category-order");
  }
}
