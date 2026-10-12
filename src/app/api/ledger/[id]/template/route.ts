import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createTemplateFromLedgerEntry } from "@/lib/db/monthly-ledger";
import { apiError, readJson, RouteError } from "@/lib/api/route";
import { entryTemplateSchema } from "@/lib/ledger/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");

    const body = entryTemplateSchema.parse(await readJson(request));
    const { id } = await params;
    const result = await createTemplateFromLedgerEntry(session.userId, id, body);
    if (!result) throw new RouteError(404, "NOT_FOUND", "התנועה אינה זמינה להמרה לתבנית");
    return NextResponse.json({ template: result.template, created: result.created }, { status: result.created ? 201 : 200 });
  } catch (error) {
    return apiError(error, "ledger.template");
  }
}
