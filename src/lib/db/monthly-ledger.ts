import { getSql } from "@/lib/db/client";
import {
  seedDefaultTemplates,
} from "@/lib/db/recurring-templates";
import { currentMonthKey } from "@/lib/utils/month";
import type { LedgerEntryKind, LedgerItemType, MonthSummary, MonthlyLedgerEntry, PaymentMethod } from "@/types/ledger";

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
    entry_kind: (row.entry_kind ?? "transaction") as LedgerEntryKind,
    payment_method: (row.payment_method ?? "bank") as PaymentMethod,
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
  providedEntries?: MonthlyLedgerEntry[],
): Promise<MonthSummary> {
  const entries = providedEntries ?? await listLedgerEntries(userId, monthKey);
  const transactions = entries.filter((e) => e.entry_kind === "transaction");
  const totalIncome = transactions
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const fixedExpenses = transactions
    .filter((e) => e.type === "expense" && !e.is_variable)
    .reduce((s, e) => s + e.amount, 0);
  const variableExpenses = transactions
    .filter((e) => e.type === "expense" && e.is_variable)
    .reduce((s, e) => s + e.amount, 0);

  const remainingForVariable = totalIncome - fixedExpenses;
  const actualIncome = transactions.filter(e => e.type === 'income' && e.is_paid).reduce((s,e) => s + e.amount, 0);
  const actualExpenses = transactions.filter(e => e.type === 'expense' && e.is_paid).reduce((s,e) => s + e.amount, 0);

  const sql = getSql();
  const cashRows = await sql`
    select
      coalesce(sum(case when entry_kind = 'cash_withdrawal' or (type = 'income' and payment_method = 'cash') then amount else 0 end), 0) as withdrawn,
      coalesce(sum(case when entry_kind = 'transaction' and type = 'expense' and payment_method = 'cash' then amount else 0 end), 0) as spent
    from monthly_ledger
    where user_id = ${userId} and month_key <= ${monthKey} and is_paid = true
  `;
  const cashWithdrawn = Number(cashRows[0]?.withdrawn ?? 0);
  const cashSpent = Number(cashRows[0]?.spent ?? 0);
  const cashWithdrawnThisMonth = entries
    .filter((e) => e.entry_kind === "cash_withdrawal")
    .reduce((s, e) => s + e.amount, 0);
  const cashSpentThisMonth = entries
    .filter((e) => e.entry_kind === "transaction" && e.type === "expense" && e.payment_method === "cash" && e.is_paid)
    .reduce((s, e) => s + e.amount, 0);

  return {
    monthKey,
    totalIncome,
    totalFixedExpenses: fixedExpenses,
    fixedExpensesPaid: transactions
      .filter((e) => e.type === "expense" && !e.is_variable && e.is_paid)
      .reduce((s, e) => s + e.amount, 0),
    totalVariableExpenses: variableExpenses,
    remainingForVariable,
    disposableRemaining: remainingForVariable - variableExpenses,
    netAfterAll: totalIncome - fixedExpenses - variableExpenses,
    actualIncome,
    actualExpenses,
    actualNet: actualIncome - actualExpenses,
    cashBalance: cashWithdrawn - cashSpent,
    cashWithdrawnThisMonth,
    cashSpentThisMonth,
    entryCount: entries.length,
    initialized: entries.length > 0,
  };
}

export async function initMonthFromTemplates(
  userId: string,
  monthKey: string,
): Promise<{ created: number; skipped: boolean }> {
  await seedDefaultTemplates(userId);
  const sql = getSql();
  // One atomic statement copies only missing templates. The unique index on
  // user/month/template also makes repeated or concurrent taps idempotent.
  const rows = await sql`insert into monthly_ledger (
      user_id, month_key, name, type, amount, category,
      is_from_template, template_id, is_variable, is_paid, notes
    ) select t.user_id, ${monthKey}, t.name, t.type, t.amount, t.name,
      true, t.id, false, false, null
    from fixed_templates t
    where t.user_id = ${userId} and t.is_active = true
      and (t.frequency = 'monthly' or ${Number(monthKey.slice(5))} % 2 = 1)
      and not exists (select 1 from monthly_ledger e
        where e.user_id = ${userId} and e.month_key = ${monthKey} and e.template_id = t.id)
    on conflict do nothing
    returning id`;
  const created = rows.length;
  return { created, skipped: created === 0 };
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
    entryKind?: LedgerEntryKind;
    paymentMethod?: PaymentMethod;
  },
): Promise<MonthlyLedgerEntry> {
  const sql = getSql();
  const category = input.category ?? input.name;
  const rows = await sql`
    insert into monthly_ledger (
      user_id, month_key, name, type, amount, category,
      is_from_template, template_id, is_variable, is_paid, notes,
      entry_kind, payment_method
    )
    values (
      ${userId}, ${input.monthKey}, ${input.name}, ${input.type},
      ${input.amount}, ${category}, false, null, ${input.isVariable ?? false},
      true, ${input.notes ?? null}, ${input.entryKind ?? "transaction"},
      ${input.paymentMethod ?? "bank"}
    )
    returning *
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function updateLedgerEntry(
  userId: string,
  id: string,
  input: Partial<{ name: string; amount: number; category: string; notes: string | null; isPaid: boolean; paymentMethod: PaymentMethod; isVariable: boolean }>,
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
        is_paid = ${input.isPaid ?? cur.is_paid},
        payment_method = ${input.paymentMethod ?? cur.payment_method},
        is_variable = ${input.isVariable ?? cur.is_variable},
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
  const entries = await listLedgerEntries(userId, monthKey);
  const summary = await getMonthSummary(userId, monthKey, entries);
  return { summary, entries };
}
