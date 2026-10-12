import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteLedgerEntry, updateLedgerEntry } from "@/lib/db/monthly-ledger";
import { apiError, readJson, RouteError } from "@/lib/api/route";
import { ledgerUpdateSchema } from "@/lib/ledger/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");

    const { id } = await params;
    const body = ledgerUpdateSchema.parse(await readJson(request));
    const entry = await updateLedgerEntry(session.userId, id, body);
    if (!entry) throw new RouteError(404, "NOT_FOUND", "התנועה לא נמצאה");
    return NextResponse.json({ entry });
  } catch (error) {
    return apiError(error, "ledger.update");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");
    const { id } = await params;
    const ok = await deleteLedgerEntry(session.userId, id);
    if (!ok) throw new RouteError(404, "NOT_FOUND", "התנועה לא נמצאה");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "ledger.delete");
  }
}
