import { getSql } from "@/lib/db/client";
import type { CategoryType } from "@/types";

export type LearningRule = {
  id: string;
  user_id: string;
  text_pattern: string;
  assigned_category_id: string;
  is_fixed_recurring: boolean;
  recurring_day_of_month: number | null;
  typical_amount: number | null;
  created_at: string;
};

export type EntrySuggestion = {
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  amount?: number;
  recurringDayOfMonth?: number;
  isFixedRecurring: boolean;
  matchedPattern: string;
};

export async function listLearningRules(userId: string): Promise<LearningRule[]> {
  const sql = getSql();
  const rows = await sql`
    select id, user_id, text_pattern, assigned_category_id,
           is_fixed_recurring, recurring_day_of_month, typical_amount, created_at
    from ai_learning_rules
    where user_id = ${userId}
    order by created_at desc
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    user_id: String(r.user_id),
    text_pattern: String(r.text_pattern),
    assigned_category_id: String(r.assigned_category_id),
    is_fixed_recurring: Boolean(r.is_fixed_recurring),
    recurring_day_of_month: r.recurring_day_of_month
      ? Number(r.recurring_day_of_month)
      : null,
    typical_amount: r.typical_amount ? Number(r.typical_amount) : null,
    created_at: String(r.created_at),
  }));
}

function scoreMatch(query: string, pattern: string): number {
  if (query === pattern) return 100;
  if (query.includes(pattern) || pattern.includes(query)) {
    return 60 + Math.min(pattern.length, query.length);
  }
  const qWords = new Set(query.split(/\s+/).filter(Boolean));
  const pWords = pattern.split(/\s+/).filter(Boolean);
  const overlap = pWords.filter((w) => qWords.has(w)).length;
  if (overlap > 0) return 25 + overlap * 15;
  return 0;
}

export async function suggestFromNotes(
  userId: string,
  notes: string,
  type?: CategoryType,
): Promise<EntrySuggestion | null> {
  const query = notes.trim().toLowerCase();
  if (query.length < 2) return null;

  const sql = getSql();
  const rows = await sql`
    select r.text_pattern, r.assigned_category_id, r.is_fixed_recurring,
           r.recurring_day_of_month, r.typical_amount,
           c.name as category_name, c.type as category_type
    from ai_learning_rules r
    join categories c on c.id = r.assigned_category_id
    where r.user_id = ${userId}
  `;

  let best: Record<string, unknown> | null = null;
  let bestScore = 0;

  for (const row of rows as Record<string, unknown>[]) {
    const catType = row.category_type as CategoryType;
    if (type && catType !== type) continue;
    const score = scoreMatch(query, String(row.text_pattern));
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  if (!best || bestScore < 25) return null;

  return {
    categoryId: String(best.assigned_category_id),
    categoryName: String(best.category_name),
    categoryType: best.category_type as CategoryType,
    amount: best.typical_amount ? Number(best.typical_amount) : undefined,
    recurringDayOfMonth: best.recurring_day_of_month
      ? Number(best.recurring_day_of_month)
      : undefined,
    isFixedRecurring: Boolean(best.is_fixed_recurring),
    matchedPattern: String(best.text_pattern),
  };
}

export async function upsertLearningRule(
  userId: string,
  input: {
    textPattern: string;
    categoryId: string;
    isFixedRecurring: boolean;
    recurringDayOfMonth?: number | null;
    typicalAmount?: number | null;
  },
): Promise<void> {
  const sql = getSql();
  const pattern = input.textPattern.trim().toLowerCase().slice(0, 120);
  if (!pattern) return;

  const day = input.recurringDayOfMonth ?? null;
  const amount = input.typicalAmount ?? null;

  await sql`
    insert into ai_learning_rules (
      user_id, text_pattern, assigned_category_id,
      is_fixed_recurring, recurring_day_of_month, typical_amount
    )
    values (
      ${userId}, ${pattern}, ${input.categoryId},
      ${input.isFixedRecurring}, ${day}, ${amount}
    )
    on conflict (user_id, text_pattern) do update
    set assigned_category_id = excluded.assigned_category_id,
        is_fixed_recurring = excluded.is_fixed_recurring,
        recurring_day_of_month = coalesce(excluded.recurring_day_of_month, ai_learning_rules.recurring_day_of_month),
        typical_amount = coalesce(excluded.typical_amount, ai_learning_rules.typical_amount)
  `;
}

export async function learnFromEntry(
  userId: string,
  input: {
    notes?: string | null;
    categoryId: string;
    amount: number;
    recurringDayOfMonth?: number | null;
    isFixedRecurring?: boolean;
  },
): Promise<void> {
  const notes = input.notes?.trim();
  if (!notes || notes.length < 2) return;

  const isRecurring =
    input.isFixedRecurring ?? input.recurringDayOfMonth != null;

  await upsertLearningRule(userId, {
    textPattern: notes,
    categoryId: input.categoryId,
    isFixedRecurring: isRecurring,
    recurringDayOfMonth: input.recurringDayOfMonth ?? null,
    typicalAmount: input.amount,
  });
}
