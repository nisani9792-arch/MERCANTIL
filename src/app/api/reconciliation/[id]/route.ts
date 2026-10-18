import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { apiError, readJson, RouteError } from "@/lib/api/route";
import { reconcileBankTransaction } from "@/lib/db/reconciliation";

const reconcileSchema = z.object({ ledgerEntryId: z.string().uuid() }).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new RouteError(401, "UNAUTHORIZED", "נדרשת התחברות");
    const body = reconcileSchema.parse(await readJson(request));
    const { id } = await params;
    const result = await reconcileBankTransaction(session.userId, id, body.ledgerEntryId);
    if (!result) throw new RouteError(409, "INVALID_REQUEST", "ההתאמה כבר טופלה או אינה זמינה");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error, "reconciliation.match");
  }
}
