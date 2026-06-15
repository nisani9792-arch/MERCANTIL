import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { learnFromEntry, upsertLearningRule } from "@/lib/db/learning-rules";
import {
  getTransactionById,
  updateTransaction,
} from "@/lib/db/transactions";

type PatchBody = {
  categoryId?: string;
  isFixedRecurring?: boolean;
  recurringDayOfMonth?: number | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json()) as PatchBody;

  const existing = await getTransactionById(session.userId, id);
  if (!existing) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  const updated = await updateTransaction(session.userId, id, {
    categoryId: body.categoryId,
    isFixedRecurring: body.isFixedRecurring,
    recurringDayOfMonth: body.recurringDayOfMonth,
  });

  if (!updated) {
    return NextResponse.json({ error: "עדכון נכשל" }, { status: 400 });
  }

  await learnFromEntry(session.userId, {
    notes: existing.notes,
    categoryId: updated.category_id,
    amount: updated.amount,
    recurringDayOfMonth: updated.recurring_day_of_month,
    isFixedRecurring: updated.is_fixed_recurring,
  }).catch(() => undefined);

  const pattern = (existing.notes ?? existing.account_source)
    .trim()
    .toLowerCase()
    .slice(0, 80);
  if (pattern && (body.categoryId || body.isFixedRecurring !== undefined)) {
    await upsertLearningRule(session.userId, {
      textPattern: pattern,
      categoryId: body.categoryId ?? existing.category_id,
      isFixedRecurring: body.isFixedRecurring ?? existing.is_fixed_recurring,
      recurringDayOfMonth:
        body.recurringDayOfMonth ?? existing.recurring_day_of_month,
      typicalAmount: existing.amount,
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, transaction: updated });
}
