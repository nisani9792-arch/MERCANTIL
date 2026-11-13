import { ensureTemplateCycle } from "@/lib/db/template-cycle";
import { logServerError } from "@/lib/api/route";
import { getSql } from "@/lib/db/client";
import { ensureIncomeAmounts } from "@/lib/db/income-amounts";
import { incomeAmountState } from "@/lib/ledger/income-amount";
import { RouteError } from "@/lib/api/route";
import { currentMonthKey, previousMonthKey } from "@/lib/utils/month";
import type { FixedTemplate, LedgerEntryKind, LedgerItemType, MonthSummary, MonthlyLedgerEntry, PaymentMethod } from "@/types/ledger";

export { currentMonthKey };

let paymentTrackingSchemaReady: Promise<void> | null = null;

/**
 * Keep this focused migration off the login and health request paths. It uses
 * a small, bounded number of queries, so the first ledger request can safely
 * upgrade an existing account on a Cloudflare Worker.
 */
async function ensurePaymentTrackingSchema() {
  if (!paymentTrackingSchemaReady) {
    const sql = getSql();
    paymentTrackingSchemaReady = (async () => {
      await ensureIncomeAmounts();
      const version = await sql`select exists(select 1 from app_schema_migrations where name = 'payment_tracking_schema_v1') as ready`;
      if (version[0]?.ready) return;
      await sql.transaction([
        sql`select pg_advisory_xact_lock(742026102)`,
        sql`alter table monthly_ledger add column if not exists due_date date`,
        sql`alter table monthly_ledger add column if not exists completed_at timestamptz`,
        sql`alter table monthly_ledger add column if not exists confirmation_source text not null default 'manual'`,
        sql`alter table fixed_templates add column if not exists source_ledger_entry_id uuid references monthly_ledger (id) on delete set null`,
        sql`create index if not exists monthly_ledger_user_due_idx on monthly_ledger (user_id, due_date) where due_date is not null`,
        sql`create unique index if not exists fixed_templates_source_ledger_unique on fixed_templates (source_ledger_entry_id) where source_ledger_entry_id is not null`,
        sql`create table if not exists ledger_change_log (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users (id) on delete cascade,
        ledger_entry_id uuid references monthly_ledger (id) on delete set null,
        action text not null check (action in ('created', 'updated', 'confirmed', 'reopened', 'deleted')),
        source text not null default 'app',
        before_data jsonb,
        after_data jsonb,
        created_at timestamptz not null default now()
      )`,
        sql`create index if not exists ledger_change_log_user_created_idx on ledger_change_log (user_id, created_at desc)`,
        sql`create table if not exists monthly_ledger_preferences (
        user_id uuid not null references users (id) on delete cascade,
        month_key text not null,
        category_order jsonb not null default '[]'::jsonb,
        updated_at timestamptz not null default now(),
        primary key (user_id, month_key)
      )`,
        sql`insert into app_schema_migrations (name) values ('payment_tracking_schema_v1') on conflict do nothing`,
      ]);
    })().catch((error) => {
      paymentTrackingSchemaReady = null;
      throw error;
    });
  }
  return paymentTrackingSchemaReady;
}

function mapRow(row: Record<string, unknown>): MonthlyLedgerEntry {
  const timestamp=(value:unknown)=>{const date=value instanceof Date?value:new Date(String(value));return Number.isFinite(date.getTime())?date.toISOString():String(value);};
  const dueDate = row.due_date;
  const completedAt = row.completed_at;
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    month_key: String(row.month_key),
    name: String(row.name),
    type: row.type as LedgerItemType,
    amount: Number(row.amount),
    amount_pending: Boolean(row.amount_pending),
    category: String(row.category ?? row.name),
    is_from_template: Boolean(row.is_from_template),
    template_id: row.template_id ? String(row.template_id) : null,
    is_variable: Boolean(row.is_variable),
    is_paid: Boolean(row.is_paid),
    entry_kind: (row.entry_kind ?? "transaction") as LedgerEntryKind,
    payment_method: (row.payment_method ?? "bank") as PaymentMethod,
    due_date: dueDate ? (dueDate instanceof Date ? dueDate.toISOString().slice(0, 10) : String(dueDate).slice(0, 10)) : null,
    completed_at: completedAt ? (timestamp(completedAt)) : null,
    confirmation_source: (row.confirmation_source ?? "manual") as "manual" | "automatic",
    notes: row.notes ? String(row.notes) : null,
    created_at: timestamp(row.created_at),
    updated_at: timestamp(row.updated_at),
  };
}

async function writeLedgerChange(
  userId: string,
  entryId: string | null,
  action: "created" | "updated" | "confirmed" | "reopened" | "deleted",
  beforeData?: unknown,
  afterData?: unknown,
) {
  try {
    const sql = getSql();
    await sql`insert into ledger_change_log (user_id, ledger_entry_id, action, before_data, after_data)
      values (${userId}, ${entryId}, ${action}, ${beforeData === undefined ? null : JSON.stringify(beforeData)}::jsonb, ${afterData === undefined ? null : JSON.stringify(afterData)}::jsonb)`;
  } catch (error) {
    // An audit failure must never make a successfully committed financial edit look unsaved.
    logServerError("[ledger] audit write failed", error);
  }
}

export type DeferLedgerAudit = (task: () => Promise<void>) => void;
async function persistLedgerChange(defer: DeferLedgerAudit | undefined, ...args: Parameters<typeof writeLedgerChange>) {
  if(defer){try{defer(()=>writeLedgerChange(...args));return;}catch{ /* Outside a request lifecycle, keep the synchronous fallback. */ }}
  await writeLedgerChange(...args);
}

export async function listLedgerEntries(
  userId: string,
  monthKey: string,
): Promise<MonthlyLedgerEntry[]> {
  await ensureIncomeAmounts();
  const sql = getSql();
  const rows = await sql`
    select * from monthly_ledger
    where user_id = ${userId} and month_key = ${monthKey}
    order by type desc, is_variable asc, name
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

/**
 * A financial period is never closed just because the calendar changed.
 * Only unpaid entries can roll forward. Completed entries are immutable
 * history, and template-backed entries never replace an entry that already
 * exists in the destination month.
 */
export async function listRolloverCandidates(
  userId: string,
  targetMonthKey: string,
): Promise<{ sourceMonthKey: string; entries: MonthlyLedgerEntry[] }> {
  await ensureIncomeAmounts();
  const sourceMonthKey = previousMonthKey(targetMonthKey);
  const sql = getSql();
  const rows = await sql`
    select e.*
    from monthly_ledger e
    where e.user_id = ${userId}
      and e.month_key = ${sourceMonthKey}
      and e.is_paid = false
      and (
        e.template_id is null
        or not exists (
          select 1
          from monthly_ledger destination
          where destination.user_id = e.user_id
            and destination.month_key = ${targetMonthKey}
            and destination.template_id = e.template_id
        )
      )
    order by e.due_date nulls last, e.type desc, e.name
  `;
  return { sourceMonthKey, entries: (rows as Record<string, unknown>[]).map(mapRow) };
}

export async function rollOverUnpaidEntries(
  userId: string,
  targetMonthKey: string,
): Promise<{ sourceMonthKey: string; moved: MonthlyLedgerEntry[] }> {
  const { sourceMonthKey, entries } = await listRolloverCandidates(userId, targetMonthKey);
  if (!entries.length) return { sourceMonthKey, moved: [] };

  const [targetYear, targetMonth] = targetMonthKey.split("-").map(Number);
  const ids = entries.map((entry) => entry.id);
  const sql = getSql();
  const rows = await sql`
    update monthly_ledger
    set
      month_key = ${targetMonthKey},
      due_date = case
        when due_date is null or to_char(due_date, 'YYYY-MM') <> ${sourceMonthKey} then due_date
        else make_date(
          ${targetYear},
          ${targetMonth},
          least(
            extract(day from due_date)::int,
            extract(day from (make_date(${targetYear}, ${targetMonth}, 1) + interval '1 month - 1 day'))::int
          )
        )
      end,
      updated_at = now()
    where user_id = ${userId}
      and month_key = ${sourceMonthKey}
      and is_paid = false
      and id = any(${ids}::uuid[])
    returning *
  `;
  const moved = (rows as Record<string, unknown>[]).map(mapRow);
  const beforeById = new Map(entries.map((entry) => [entry.id, entry]));
  await Promise.all(moved.map((entry) => writeLedgerChange(userId, entry.id, "updated", beforeById.get(entry.id), entry)));
  return { sourceMonthKey, moved };
}

/** One-time correction for a month that was created under the wrong period.
 * Unlike rollover, this intentionally includes completed history and is only
 * valid for adjacent months. Template collisions are left untouched so a
 * correction can never silently duplicate or discard a financial record. */
export async function correctLedgerPeriod(
  userId: string,
  sourceMonthKey: string,
  targetMonthKey: string,
): Promise<{ moved: MonthlyLedgerEntry[]; skippedTemplateDuplicates: number }> {
  if (previousMonthKey(targetMonthKey) !== sourceMonthKey) {
    throw new Error("Period correction only supports adjacent months");
  }
  const sql = getSql();
  const candidates = await sql`
    select e.*
    from monthly_ledger e
    where e.user_id = ${userId}
      and e.month_key = ${sourceMonthKey}
      and (e.template_id is null or not exists (
        select 1 from monthly_ledger destination
        where destination.user_id = e.user_id
          and destination.month_key = ${targetMonthKey}
          and destination.template_id = e.template_id
      ))
    order by e.due_date nulls last, e.created_at
  `;
  const conflicts = await sql`
    select count(*)::int as count
    from monthly_ledger e
    where e.user_id = ${userId}
      and e.month_key = ${sourceMonthKey}
      and e.template_id is not null
      and exists (
        select 1 from monthly_ledger destination
        where destination.user_id = e.user_id
          and destination.month_key = ${targetMonthKey}
          and destination.template_id = e.template_id
      )
  `;
  const before = (candidates as Record<string, unknown>[]).map(mapRow);
  if (!before.length) return { moved: [], skippedTemplateDuplicates: Number(conflicts[0]?.count ?? 0) };

  const [targetYear, targetMonth] = targetMonthKey.split("-").map(Number);
  const rows = await sql`
    update monthly_ledger
    set month_key = ${targetMonthKey},
        due_date = case
          when due_date is null or to_char(due_date, 'YYYY-MM') <> ${sourceMonthKey} then due_date
          else make_date(${targetYear}, ${targetMonth}, least(
            extract(day from due_date)::int,
            extract(day from (make_date(${targetYear}, ${targetMonth}, 1) + interval '1 month - 1 day'))::int
          ))
        end,
        updated_at = now()
    where user_id = ${userId}
      and month_key = ${sourceMonthKey}
      and id = any(${before.map((entry) => entry.id)}::uuid[])
    returning *
  `;
  const moved = (rows as Record<string, unknown>[]).map(mapRow);
  const beforeById = new Map(before.map((entry) => [entry.id, entry]));
  await Promise.all(moved.map((entry) => writeLedgerChange(userId, entry.id, "updated", beforeById.get(entry.id), entry)));
  return { moved, skippedTemplateDuplicates: Number(conflicts[0]?.count ?? 0) };
}

export async function getMonthSummary(
  userId: string,
  monthKey: string,
  providedEntries?: MonthlyLedgerEntry[],
  cashSnapshot?: { withdrawn: number; spent: number },
): Promise<MonthSummary> {
  const entries = providedEntries ?? await listLedgerEntries(userId, monthKey);
  const transactions = entries.filter((e) => e.entry_kind === "transaction");
  const sum = (items: MonthlyLedgerEntry[]) => items.reduce((cents, entry) => cents + Math.round(entry.amount * 100), 0) / 100;
  const rounded = (value: number) => Math.round(value * 100) / 100;
  const totalIncome = sum(transactions
    .filter((e) => e.type === "income"));
  const fixedExpenses = sum(transactions
    .filter((e) => e.type === "expense" && !e.is_variable));
  const variableExpenses = sum(transactions
    .filter((e) => e.type === "expense" && e.is_variable));

  const remainingForVariable = rounded(totalIncome - fixedExpenses);
  const actualIncome = sum(transactions.filter(e => e.type === 'income' && e.is_paid));
  const actualExpenses = sum(transactions.filter(e => e.type === 'expense' && e.is_paid));

  const sql = getSql();
  const cashRows = cashSnapshot ? [cashSnapshot] : await sql`
    select
      coalesce(sum(case when entry_kind = 'cash_withdrawal' or (type = 'income' and payment_method = 'cash') then amount else 0 end), 0) as withdrawn,
      coalesce(sum(case when entry_kind = 'transaction' and type = 'expense' and payment_method = 'cash' then amount else 0 end), 0) as spent
    from monthly_ledger
    where user_id = ${userId} and month_key <= ${monthKey} and is_paid = true
  `;
  const cashWithdrawn = Number(cashRows[0]?.withdrawn ?? 0);
  const cashSpent = Number(cashRows[0]?.spent ?? 0);
  const cashWithdrawnThisMonth = sum(entries
    .filter((e) => e.entry_kind === "cash_withdrawal"));
  const cashSpentThisMonth = sum(entries
    .filter((e) => e.entry_kind === "transaction" && e.type === "expense" && e.payment_method === "cash" && e.is_paid));

  return {
    monthKey,
    totalIncome,
    totalFixedExpenses: fixedExpenses,
    fixedExpensesPaid: sum(transactions
      .filter((e) => e.type === "expense" && !e.is_variable && e.is_paid)),
    totalVariableExpenses: variableExpenses,
    remainingForVariable,
    disposableRemaining: rounded(remainingForVariable - variableExpenses),
    netAfterAll: rounded(totalIncome - fixedExpenses - variableExpenses),
    actualIncome,
    actualExpenses,
    actualNet: rounded(actualIncome - actualExpenses),
    cashBalance: rounded(cashWithdrawn - cashSpent),
    cashWithdrawnThisMonth,
    cashSpentThisMonth,
    pendingIncomeCount: transactions.filter((e) => e.type === "income" && e.amount_pending).length,
    pendingExpenseCount: transactions.filter((e) => e.type === "expense" && e.amount_pending).length,
    entryCount: entries.length,
    initialized: entries.length > 0,
  };
}

export async function initMonthFromTemplates(
  userId: string,
  monthKey: string,
  templateIds?: string[],
  copyAmountIds?: string[],
): Promise<{ created: number; skipped: boolean }> {
  await ensureTemplateCycle();
  const sql = getSql();
  const chosenIds = Array.from(new Set((templateIds ?? []).filter((id) => /^[0-9a-f-]{36}$/i.test(id))));
  const copyIds = Array.from(new Set((copyAmountIds ?? []).filter((id) => /^[0-9a-f-]{36}$/i.test(id))));
  const keepLegacyAmounts = copyAmountIds === undefined;
  // A new month is always empty until the user explicitly chooses items.
  if (chosenIds.length === 0) return { created: 0, skipped: true };
  // One atomic statement copies only missing templates. The unique index on
  // user/month/template also makes repeated or concurrent taps idempotent.
  const results = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtextextended(${userId + ":" + monthKey}, 0))`,
    sql`insert into monthly_ledger (
      user_id, month_key, name, type, amount, amount_pending, category,
      is_from_template, template_id, is_variable, is_paid, notes, due_date, payment_method
    ) select t.user_id, ${monthKey}, t.name, t.type,
      case when ${keepLegacyAmounts} or t.id = any(${copyIds}::uuid[]) then t.amount else 0 end,
      case when ${keepLegacyAmounts} or t.id = any(${copyIds}::uuid[]) then t.amount_pending else true end, t.name,
      true, t.id, t.is_variable, false, null,
      case when t.payment_method = 'card' then make_date(${Number(monthKey.slice(0, 4))}, ${Number(monthKey.slice(5))}, 10)
        when t.day_of_month is null then null else make_date(${Number(monthKey.slice(0, 4))}, ${Number(monthKey.slice(5))}, least(t.day_of_month, extract(day from (make_date(${Number(monthKey.slice(0, 4))}, ${Number(monthKey.slice(5))}, 1) + interval '1 month - 1 day'))::int)) end,
      t.payment_method
    from (
      select distinct on (lower(trim(name)), type, is_variable) * from fixed_templates
      where user_id = ${userId} and is_active = true
        and id = any(${chosenIds}::uuid[])
        and (frequency = 'monthly' or (
          (start_month is null or start_month <= ${monthKey})
          and ${Number(monthKey.slice(5))} % 2 = coalesce(substring(start_month from 6 for 2)::int % 2, 1)))
      order by lower(trim(name)), type, is_variable, updated_at desc, id
    ) t
    where not exists (select 1 from monthly_ledger e
        where e.user_id = ${userId} and e.month_key = ${monthKey}
          and (e.template_id = t.id or (e.entry_kind = 'transaction' and e.type = t.type
            and lower(trim(e.name)) = lower(trim(t.name)) and e.is_variable = t.is_variable)))
    on conflict do nothing
    returning id`,
  ]);
  const rows = results[1];
  const created = rows.length;
  return { created, skipped: created === 0 };
}

export async function addLedgerEntry(
  userId: string,
  input: {
    monthKey: string;
    clientRequestId?: string;
    name: string;
    type: LedgerItemType;
    amount: number;
    amountPending?: boolean;
    isVariable?: boolean;
    category?: string;
    notes?: string;
    entryKind?: LedgerEntryKind;
    paymentMethod?: PaymentMethod;
    dueDate?: string | null;
  },
  deferAudit?: DeferLedgerAudit,
): Promise<MonthlyLedgerEntry> {
  await ensureIncomeAmounts();
  const amount = incomeAmountState(input.type, input.amount, input.amountPending);
  const sql = getSql();
  const category = input.category ?? input.name;
  const rows = await sql`
    insert into monthly_ledger (
      user_id, month_key, name, type, amount, amount_pending, category,
      is_from_template, template_id, is_variable, is_paid, notes,
      entry_kind, payment_method, due_date, client_request_id
    )
    values (
      ${userId}, ${input.monthKey}, ${input.name}, ${input.type},
      ${amount.amount}, ${amount.amountPending}, ${category}, false, null, ${input.isVariable ?? false},
      false, ${input.notes ?? null}, ${input.entryKind ?? "transaction"},
      ${input.paymentMethod ?? "bank"}, ${input.type === "expense" && input.paymentMethod === "card" ? `${input.monthKey}-10` : input.dueDate ?? null}, ${input.clientRequestId ?? null}
    )
    on conflict (user_id,client_request_id) where client_request_id is not null
      do update set client_request_id = excluded.client_request_id
    returning *
  `;
  const entry = mapRow(rows[0] as Record<string, unknown>);
  await persistLedgerChange(deferAudit, userId, entry.id, "created", undefined, entry);
  return entry;
}

/** Create exactly one recurring template from a monthly transaction.
 * The source entry is never altered, so the current month's history stays intact. */
export async function createTemplateFromLedgerEntry(
  userId: string,
  entryId: string,
  input: { frequency: "monthly" | "bi-monthly"; dayOfMonth: number | null },
): Promise<{ entry: MonthlyLedgerEntry; template: FixedTemplate; created: boolean } | null> {
  await ensureIncomeAmounts();
  await ensurePaymentTrackingSchema();
  const sql = getSql();
  const sourceRows = await sql`select * from monthly_ledger where id = ${entryId} and user_id = ${userId} limit 1`;
  if (!sourceRows.length) return null;
  const entry = mapRow(sourceRows[0] as Record<string, unknown>);
  if (entry.entry_kind !== "transaction") return null;

  const inserted = await sql`
    insert into fixed_templates (
      user_id, name, type, amount, amount_pending, frequency, day_of_month, is_active, is_variable, sort_order, source_ledger_entry_id, payment_method
    ) values (
      ${userId}, ${entry.name}, ${entry.type}, ${entry.amount}, ${entry.amount_pending ?? false}, ${input.frequency}, ${input.dayOfMonth}, true, ${entry.is_variable},
      (select coalesce(max(sort_order), 0) + 1 from fixed_templates where user_id = ${userId}), ${entry.id}, ${entry.payment_method}
    )
    on conflict (source_ledger_entry_id) where source_ledger_entry_id is not null do nothing
    returning *
  `;
  const templateRows = inserted.length ? inserted : await sql`
    select * from fixed_templates where user_id = ${userId} and source_ledger_entry_id = ${entry.id} limit 1
  `;
  const row = templateRows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("המרת התנועה לתבנית נכשלה");
  return {
    entry,
    template: {
      id: String(row.id), user_id: String(row.user_id), name: String(row.name), type: row.type as "income" | "expense",
      amount: Number(row.amount), frequency: row.frequency as "monthly" | "bi-monthly", day_of_month: row.day_of_month ? Number(row.day_of_month) : null,
      amount_pending: Boolean(row.amount_pending),
      is_active: Boolean(row.is_active), is_variable: Boolean(row.is_variable), sort_order: Number(row.sort_order),
      created_at: String(row.created_at), updated_at: String(row.updated_at),
    },
    created: inserted.length > 0,
  };
}

export async function createTemplatesFromMonth(userId: string, monthKey: string): Promise<number> {
  await ensureIncomeAmounts();
  await ensurePaymentTrackingSchema();
  const sql = getSql();
  const rows = await sql`
    insert into fixed_templates (
      user_id, name, type, amount, amount_pending, frequency, day_of_month, is_active, is_variable, sort_order, source_ledger_entry_id, payment_method
    )
    select e.user_id, e.name, e.type, e.amount, e.amount_pending, 'monthly',
      case when e.due_date is null then null else extract(day from e.due_date)::int end,
      true, e.is_variable,
      row_number() over (order by e.type desc, e.name) + (select coalesce(max(sort_order), 0) from fixed_templates where user_id = ${userId}),
      e.id, e.payment_method
    from monthly_ledger e
    where e.user_id = ${userId} and e.month_key = ${monthKey} and e.entry_kind = 'transaction'
    on conflict (source_ledger_entry_id) where source_ledger_entry_id is not null do nothing
    returning id
  `;
  return rows.length;
}

export async function updateLedgerEntry(
  userId: string,
  id: string,
  input: Partial<{ name: string; amount: number; amountPending: boolean; category: string; notes: string | null; isPaid: boolean; paymentMethod: PaymentMethod; isVariable: boolean; dueDate: string | null; confirmationSource: "manual" | "automatic"; expectedUpdatedAt: string }>,
  deferAudit?: DeferLedgerAudit,
): Promise<MonthlyLedgerEntry | null> {
  await ensureIncomeAmounts();
  const sql = getSql();
  const existing = await sql`
    select * from monthly_ledger where id = ${id} and user_id = ${userId} limit 1
  `;
  if (!existing.length) return null;
  const cur = mapRow(existing[0] as Record<string, unknown>);
  if (input.paymentMethod === "card" && (cur.type !== "expense" || cur.entry_kind !== "transaction")) {
    throw new RouteError(400, "INVALID_REQUEST", "רק הוצאה רגילה יכולה להשתייך לכרטיס האשראי");
  }
  const dueDate = input.paymentMethod === "card" ? `${cur.month_key}-10` : input.dueDate !== undefined ? input.dueDate : cur.due_date;
  const amount = incomeAmountState(cur.type, input.amount ?? cur.amount,
    input.amountPending ?? (input.amount !== undefined ? false : cur.amount_pending));
  if (input.isPaid === true && amount.amountPending) {
    throw new RouteError(400, "INVALID_REQUEST", "יש להזין סכום לפני אישור הרישום");
  }

  const rows = await sql`
    with updated as (update monthly_ledger
    set name = ${input.name ?? cur.name},
        amount = ${amount.amount},
        amount_pending = ${amount.amountPending},
        category = ${input.category ?? cur.category},
        is_paid = ${amount.amountPending ? false : input.isPaid ?? cur.is_paid},
        due_date = ${dueDate},
        completed_at = case when ${amount.amountPending || input.isPaid === false} then null when ${input.isPaid === true} then now() else completed_at end,
        confirmation_source = ${input.confirmationSource ?? cur.confirmation_source},
        payment_method = ${input.paymentMethod ?? cur.payment_method},
        is_variable = ${input.isVariable ?? cur.is_variable},
        notes = ${input.notes !== undefined ? input.notes : cur.notes},
        updated_at = greatest(now(), updated_at + interval '1 millisecond')
    where id = ${id} and user_id = ${userId}
      and date_trunc('milliseconds',updated_at) = date_trunc('milliseconds',${input.expectedUpdatedAt ?? cur.updated_at}::timestamptz)
    returning *), synced_template as (
      update fixed_templates t set payment_method = e.payment_method, updated_at = now()
      from updated e where ${input.paymentMethod !== undefined} and t.user_id = ${userId}
        and t.id = e.template_id and e.type = 'expense' and e.entry_kind = 'transaction'
      returning t.id
    ) select * from updated
  `;
  if (!rows.length) throw new RouteError(409,"CONFLICT","הרישום עודכן בינתיים. רענן את החודש ובדוק את הפרטים לפני שמירה חוזרת.");
  const updated = mapRow(rows[0] as Record<string, unknown>);
  const action = input.isPaid === true && !cur.is_paid ? "confirmed" : input.isPaid === false && cur.is_paid ? "reopened" : "updated";
  await persistLedgerChange(deferAudit, userId, id, action, cur, updated);
  return updated;
}

export async function deleteLedgerEntry(userId: string, id: string, deferAudit?: DeferLedgerAudit): Promise<boolean> {
  const sql = getSql();
  const existing = await sql`select * from monthly_ledger where id = ${id} and user_id = ${userId} limit 1`;
  const rows = await sql`
    delete from monthly_ledger where id = ${id} and user_id = ${userId} returning id
  `;
  if (rows.length && existing.length) await persistLedgerChange(deferAudit, userId, null, "deleted", mapRow(existing[0] as Record<string, unknown>));
  return rows.length > 0;
}

export async function getMonthlyCategoryOrder(userId: string, monthKey: string): Promise<string[]> {
  await ensurePaymentTrackingSchema();
  const sql = getSql();
  const rows = await sql`select category_order from monthly_ledger_preferences where user_id = ${userId} and month_key = ${monthKey} limit 1`;
  const value = rows[0]?.category_order;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 30) : [];
}

export async function saveMonthlyCategoryOrder(userId: string, monthKey: string, categoryOrder: string[]): Promise<string[]> {
  await ensurePaymentTrackingSchema();
  const clean = Array.from(new Set(categoryOrder.map((item) => item.trim()).filter(Boolean))).slice(0, 30);
  const sql = getSql();
  const rows = await sql`insert into monthly_ledger_preferences (user_id, month_key, category_order)
    values (${userId}, ${monthKey}, ${JSON.stringify(clean)}::jsonb)
    on conflict (user_id, month_key) do update set category_order = excluded.category_order, updated_at = now()
    returning category_order`;
  const value = rows[0]?.category_order;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : clean;
}

export async function getLedgerContextForAi(userId: string, monthKey: string) {
  const entries = await listLedgerEntries(userId, monthKey);
  const summary = await getMonthSummary(userId, monthKey, entries);
  return { summary, entries };
}


/** One read-only database round trip for an already-provisioned month. No financial cache. */
export async function getMonthlyWorkspace(userId: string, monthKey: string, trendMonths?: string[]) {
  const sql=getSql();
  const read=async()=>{
    const rows=await sql`select
      coalesce((select jsonb_agg(to_jsonb(e) order by e.type desc,e.is_variable asc,e.name)
        from monthly_ledger e where e.user_id=${userId} and e.month_key=${monthKey}), '[]'::jsonb) as entries,
      coalesce((select p.category_order from monthly_ledger_preferences p where p.user_id=${userId} and p.month_key=${monthKey}), '[]'::jsonb) as category_order,
      cash.withdrawn,cash.spent,
      case when ${!!trendMonths} then coalesce((select jsonb_agg(to_jsonb(t) order by t.month_key) from (
        select e.month_key, count(*) filter(where e.amount_pending and e.entry_kind='transaction') as pending_count,
          coalesce(sum(case when e.type='income' and e.entry_kind='transaction' then e.amount else 0 end),0) as income,
          coalesce(sum(case when e.type='expense' and e.entry_kind='transaction' then e.amount else 0 end),0) as expense
        from monthly_ledger e where e.user_id=${userId} and e.month_key=any(${trendMonths??[]}::text[]) group by e.month_key
      ) t),'[]'::jsonb) else '[]'::jsonb end as trend,
      (exists(select 1 from app_schema_migrations where name='income_amounts_card_v3')
        and exists(select 1 from app_schema_migrations where name='payment_tracking_schema_v1')) as schema_ready
      from (select
        coalesce(sum(case when entry_kind='cash_withdrawal' or (type='income' and payment_method='cash') then amount else 0 end),0) as withdrawn,
        coalesce(sum(case when entry_kind='transaction' and type='expense' and payment_method='cash' then amount else 0 end),0) as spent
        from monthly_ledger where user_id=${userId} and month_key<=${monthKey} and is_paid=true) cash`;
    return rows[0];
  };
  let snapshot;
  try {snapshot=await read();}
  catch(error){if(!['42P01','42703'].includes(String((error as {code?:string}).code)))throw error;}
  if(!snapshot?.schema_ready){await ensurePaymentTrackingSchema();snapshot=await read();}
  const entries=(Array.isArray(snapshot?.entries)?snapshot.entries:[]).map(row=>mapRow(row as Record<string,unknown>));
  const categoryOrder=Array.isArray(snapshot?.category_order)?snapshot.category_order.filter((v):v is string=>typeof v==='string').slice(0,30):[];
  const summary=await getMonthSummary(userId,monthKey,entries,{withdrawn:Number(snapshot?.withdrawn??0),spent:Number(snapshot?.spent??0)});
  return {entries,summary,categoryOrder,...(trendMonths?{trendRows:Array.isArray(snapshot?.trend)?snapshot.trend as Record<string,unknown>[]:[]}: {})};
}
