import { getSql } from "@/lib/db/client";
import {
  listTemplates,
  seedDefaultTemplates,
  templateAppliesToMonth,
} from "@/lib/db/recurring-templates";
import { currentMonthKey } from "@/lib/utils/month";
import type { LedgerItemType, MonthSummary, MonthlyLedgerEntry } from "@/types/ledger";

export { currentMonthKey };

function mapRow(row: Record<string, unknown>): MonthlyLedgerEntry {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    month_key: String(row.month_key),
    name: String(row.name),
    type: row.type as LedgerItemType,
    amount: Number(row.amount),
    category: String(row.category ?? row.name),
    is_from_template: Boolean(row.is_from_template),
    template_id: row.template_id ? String(row.template_id) : null,
    is_variable: Boolean(row.is_variable),
    is_paid: Boolean(row.is_paid),
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listLedgerEntries(
  userId: string,
  monthKey: string,
): Promise<MonthlyLedgerEntry[]> {
  const sql = getSql();
  const rows = await sql`
    select * from monthly_ledger
    where user_id = ${userId} and month_key = ${monthKey}
    order by type desc, is_variable asc, name
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function getMonthSummary(
  userId: string,
  monthKey: string,
): Promise<MonthSummary> {
  const entries = await listLedgerEntries(userId, monthKey);
  const totalIncome = entries
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const fixedExpenses = entries
    .filter((e) => e.type === "expense" && !e.is_variable)
    .reduce((s, e) => s + e.amount, 0);
  const variableExpenses = entries
    .filter((e) => e.type === "expense" && e.is_variable)
    .reduce((s, e) => s + e.amount, 0);

  const remainingForVariable = totalIncome - fixedExpenses;

  return {
    monthKey,
    totalIncome,
    totalFixedExpenses: fixedExpenses,
    fixedExpensesPaid: fixedExpenses,
    totalVariableExpenses: variableExpenses,
    remainingForVariable,
    disposableRemaining: remainingForVariable - variableExpenses,
    netAfterAll: totalIncome - fixedExpenses - variableExpenses,
    entryCount: entries.length,
    initialized: entries.length > 0,
  };
}

export async function initMonthFromTemplates(
  userId: string,
  monthKey: string,
): Promise<{ created: number; skipped: boolean }> {
  await seedDefaultTemplates(userId);
  const existing = await listLedgerEntries(userId, monthKey);
  if (existing.length > 0) return { created: 0, skipped: true };

  const templates = (await listTemplates(userId)).filter((t) => t.is_active);
  const sql = getSql();
  let created = 0;

  for (const t of templates) {
    if (!templateAppliesToMonth(t.frequency, monthKey)) continue;
    await sql`
      insert into monthly_ledger (
        user_id, month_key, name, type, amount, category,
        is_from_template, template_id, is_variable, is_paid, notes
      )
      values (
        ${userId}, ${monthKey}, ${t.name}, ${t.type}, ${t.amount}, ${t.name},
        true, ${t.id}, false, true, null
      )
    `;
    created++;
  }

  return { created, skipped: false };
}

export async function addLedgerEntry(
  userId: string,
  input: {
    monthKey: string;
    name: string;
    type: LedgerItemType;
    amount: number;
    isVariable?: boolean;
    category?: string;
    notes?: string;
  },
): Promise<MonthlyLedgerEntry> {
  const sql = getSql();
  const category = input.category ?? input.name;
  const rows = await sql`
    insert into monthly_ledger (
      user_id, month_key, name, type, amount, category,
      is_from_template, template_id, is_variable, is_paid, notes
    )
    values (
      ${userId}, ${input.monthKey}, ${input.name}, ${input.type},
      ${input.amount}, ${category}, false, null, ${input.isVariable ?? false},
      true, ${input.notes ?? null}
    )
    returning *
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function updateLedgerEntry(
  userId: string,
  id: string,
  input: Partial<{ name: string; amount: number; category: string; notes: string | null }>,
): Promise<MonthlyLedgerEntry | null> {
  const sql = getSql();
  const existing = await sql`
    select * from monthly_ledger where id = ${id} and user_id = ${userId} limit 1
  `;
  if (!existing.length) return null;
  const cur = mapRow(existing[0] as Record<string, unknown>);

  const rows = await sql`
    update monthly_ledger
    set name = ${input.name ?? cur.name},
        amount = ${input.amount ?? cur.amount},
        category = ${input.category ?? cur.category},
        is_paid = true,
        notes = ${input.notes !== undefined ? input.notes : cur.notes},
        updated_at = now()
    where id = ${id} and user_id = ${userId}
    returning *
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function deleteLedgerEntry(userId: string, id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    delete from monthly_ledger where id = ${id} and user_id = ${userId} returning id
  `;
  return rows.length > 0;
}

export async function getLedgerContextForAi(userId: string, monthKey: string) {
  const [summary, entries] = await Promise.all([
    getMonthSummary(userId, monthKey),
    listLedgerEntries(userId, monthKey),
  ]);
  return { summary, entries };
}
