import { getSql } from "@/lib/db/client";
import { ensureIncomeAmounts } from "@/lib/db/income-amounts";
import { incomeAmountState } from "@/lib/ledger/income-amount";
import type { FixedTemplate, RecurringFrequency } from "@/types/ledger";

function mapRow(row: Record<string, unknown>): FixedTemplate {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    type: row.type as FixedTemplate["type"],
    amount: Number(row.amount),
    amount_pending: Boolean(row.amount_pending),
    frequency: row.frequency as RecurringFrequency,
    day_of_month: row.day_of_month ? Number(row.day_of_month) : null,
    is_active: Boolean(row.is_active),
    is_variable: Boolean(row.is_variable),
    sort_order: Number(row.sort_order),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listTemplates(userId: string): Promise<FixedTemplate[]> {
  await ensureIncomeAmounts();
  const sql = getSql();
  const rows = await sql`
    select * from fixed_templates
    where user_id = ${userId}
    order by type desc, sort_order, name
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function createTemplate(
  userId: string,
  input: {
    name: string;
    type: FixedTemplate["type"];
    amount: number;
    amountPending?: boolean;
    frequency?: RecurringFrequency;
    dayOfMonth?: number | null;
    isVariable?: boolean;
  },
): Promise<FixedTemplate> {
  await ensureIncomeAmounts();
  const amount = incomeAmountState(input.type, input.amount, input.amountPending);
  const sql = getSql();
  const rows = await sql`
    insert into fixed_templates (
      user_id, name, type, amount, amount_pending, frequency, day_of_month, is_active, is_variable, sort_order
    )
    values (
      ${userId}, ${input.name}, ${input.type}, ${amount.amount}, ${amount.amountPending},
      ${input.frequency ?? "monthly"}, ${input.dayOfMonth ?? null}, true, ${input.isVariable ?? false},
      (select coalesce(max(sort_order), 0) + 1 from fixed_templates where user_id = ${userId})
    )
    returning *
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function updateTemplate(
  userId: string,
  id: string,
  input: Partial<{
    type: FixedTemplate["type"];
    name: string;
    amount: number;
    amountPending: boolean;
    frequency: RecurringFrequency;
    dayOfMonth: number | null;
    isActive: boolean;
    isVariable: boolean;
    sortOrder: number;
  }>,
): Promise<FixedTemplate | null> {
  await ensureIncomeAmounts();
  const sql = getSql();
  const existing = await sql`
    select * from fixed_templates where id = ${id} and user_id = ${userId} limit 1
  `;
  if (!existing.length) return null;
  const cur = mapRow(existing[0] as Record<string, unknown>);
  const amount = incomeAmountState(input.type ?? cur.type, input.amount ?? cur.amount,
    input.amountPending ?? (input.amount !== undefined || input.type === "expense" ? false : cur.amount_pending));

  const rows = await sql`
    update fixed_templates
    set name = ${input.name ?? cur.name},
        type = ${input.type ?? cur.type},
        amount = ${amount.amount},
        amount_pending = ${amount.amountPending},
        frequency = ${input.frequency ?? cur.frequency},
        day_of_month = ${input.dayOfMonth !== undefined ? input.dayOfMonth : cur.day_of_month},
        is_active = ${input.isActive !== undefined ? input.isActive : cur.is_active},
        is_variable = ${input.isVariable !== undefined ? input.isVariable : cur.is_variable},
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
    delete from fixed_templates where id = ${id} and user_id = ${userId} returning id
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
