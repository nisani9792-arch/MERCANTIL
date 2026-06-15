import { getSql } from "@/lib/db/client";
import { DEFAULT_RECURRING_TEMPLATES } from "@/lib/db/default-templates";
import type { RecurringFrequency, RecurringTemplate } from "@/types/ledger";

function mapRow(row: Record<string, unknown>): RecurringTemplate {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    type: row.type as RecurringTemplate["type"],
    amount: Number(row.amount),
    frequency: row.frequency as RecurringFrequency,
    day_of_month: row.day_of_month ? Number(row.day_of_month) : null,
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function seedDefaultTemplates(userId: string): Promise<void> {
  const sql = getSql();
  const existing = await sql`
    select count(*)::int as c from recurring_templates where user_id = ${userId}
  `;
  if (Number((existing[0] as { c: number }).c) > 0) return;

  for (const t of DEFAULT_RECURRING_TEMPLATES) {
    await sql`
      insert into recurring_templates (
        user_id, name, type, amount, frequency, day_of_month, is_active, sort_order
      )
      values (
        ${userId}, ${t.name}, ${t.type}, ${t.amount},
        ${t.frequency}, ${t.day_of_month}, true, ${t.sort_order}
      )
    `;
  }
}

export async function listTemplates(userId: string): Promise<RecurringTemplate[]> {
  const sql = getSql();
  const rows = await sql`
    select * from recurring_templates
    where user_id = ${userId}
    order by type desc, sort_order, name
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function createTemplate(
  userId: string,
  input: {
    name: string;
    type: RecurringTemplate["type"];
    amount: number;
    frequency?: RecurringFrequency;
    dayOfMonth?: number | null;
  },
): Promise<RecurringTemplate> {
  const sql = getSql();
  const rows = await sql`
    insert into recurring_templates (
      user_id, name, type, amount, frequency, day_of_month, is_active, sort_order
    )
    values (
      ${userId}, ${input.name}, ${input.type}, ${input.amount},
      ${input.frequency ?? "monthly"}, ${input.dayOfMonth ?? null}, true,
      (select coalesce(max(sort_order), 0) + 1 from recurring_templates where user_id = ${userId})
    )
    returning *
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function updateTemplate(
  userId: string,
  id: string,
  input: Partial<{
    name: string;
    amount: number;
    frequency: RecurringFrequency;
    dayOfMonth: number | null;
    isActive: boolean;
    sortOrder: number;
  }>,
): Promise<RecurringTemplate | null> {
  const sql = getSql();
  const existing = await sql`
    select * from recurring_templates where id = ${id} and user_id = ${userId} limit 1
  `;
  if (!existing.length) return null;
  const cur = mapRow(existing[0] as Record<string, unknown>);

  const rows = await sql`
    update recurring_templates
    set name = ${input.name ?? cur.name},
        amount = ${input.amount ?? cur.amount},
        frequency = ${input.frequency ?? cur.frequency},
        day_of_month = ${input.dayOfMonth !== undefined ? input.dayOfMonth : cur.day_of_month},
        is_active = ${input.isActive !== undefined ? input.isActive : cur.is_active},
        sort_order = ${input.sortOrder ?? cur.sort_order},
        updated_at = now()
    where id = ${id} and user_id = ${userId}
    returning *
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function deleteTemplate(userId: string, id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    delete from recurring_templates where id = ${id} and user_id = ${userId} returning id
  `;
  return rows.length > 0;
}

export function templateAppliesToMonth(
  frequency: RecurringFrequency,
  monthKey: string,
): boolean {
  if (frequency === "monthly") return true;
  const month = Number(monthKey.split("-")[1]);
  return month % 2 === 1;
}
