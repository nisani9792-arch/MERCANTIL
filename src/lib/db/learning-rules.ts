import { getSql } from "@/lib/db/client";

export type LearningRule = {
  id: string;
  user_id: string;
  text_pattern: string;
  assigned_category_id: string;
  is_fixed_recurring: boolean;
  created_at: string;
};

export async function listLearningRules(userId: string): Promise<LearningRule[]> {
  const sql = getSql();
  const rows = await sql`
    select id, user_id, text_pattern, assigned_category_id,
           is_fixed_recurring, created_at
    from ai_learning_rules
    where user_id = ${userId}
    order by created_at desc
  `;
  return rows as LearningRule[];
}

export async function upsertLearningRule(
  userId: string,
  input: {
    textPattern: string;
    categoryId: string;
    isFixedRecurring: boolean;
  },
): Promise<void> {
  const sql = getSql();
  const pattern = input.textPattern.trim().toLowerCase().slice(0, 120);
  if (!pattern) return;

  await sql`
    insert into ai_learning_rules (user_id, text_pattern, assigned_category_id, is_fixed_recurring)
    values (${userId}, ${pattern}, ${input.categoryId}, ${input.isFixedRecurring})
    on conflict (user_id, text_pattern) do update
    set assigned_category_id = excluded.assigned_category_id,
        is_fixed_recurring = excluded.is_fixed_recurring
  `;
}
