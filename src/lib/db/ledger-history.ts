import { getSql } from "@/lib/db/client";
import { ensureIncomeAmounts } from "@/lib/db/income-amounts";

let schema: Promise<unknown> | undefined;
async function ensureHistorySchema() {
  await ensureIncomeAmounts();
  return schema ??= (async () => {
    const sql = getSql();
    await sql`alter table monthly_ledger add column if not exists history_source_id uuid`;
    await sql`create unique index if not exists monthly_ledger_history_source_unique on monthly_ledger(user_id, month_key, history_source_id) where history_source_id is not null`;
  })().catch((error: unknown) => { schema = undefined; throw error; });
}

export async function listHistoryChoices(userId: string, month: string) {
  await ensureHistorySchema();
  const rows = await getSql()`
    with previous as (
      select *, lower(trim(name)) as item_key from monthly_ledger
      where user_id = ${userId} and month_key < ${month} and entry_kind = 'transaction'
    ), latest as (
      select distinct on (item_key, type, is_variable, payment_method) * from previous
      order by item_key, type, is_variable, payment_method, month_key desc, updated_at desc, id
    ), monthly as (
      select item_key, type, is_variable, payment_method, month_key, sum(amount) as amount,
        bool_or(amount_pending) as pending
      from previous where month_key >= to_char(to_date(${month} || '-01', 'YYYY-MM-DD') - interval '6 months', 'YYYY-MM')
      group by item_key, type, is_variable, payment_method, month_key
    ), patterns as (
      select item_key, type, is_variable, payment_method, count(*) filter(where not pending)::int as samples,
        round(avg(amount) filter(where not pending), 2) as average
      from monthly group by item_key, type, is_variable, payment_method
    )
    select l.id, l.name, l.type, l.amount, l.amount_pending, l.is_variable, l.category,
      l.month_key as last_month, coalesce(p.samples, 0) as samples, p.average,
      exists(select 1 from monthly_ledger current
        where current.user_id = ${userId} and current.month_key = ${month}
          and current.type = l.type and lower(trim(current.name)) = l.item_key
          and current.is_variable = l.is_variable and current.payment_method = l.payment_method
          and current.entry_kind = 'transaction') as already_added
    from latest l left join patterns p on p.item_key = l.item_key and p.type = l.type
      and p.is_variable = l.is_variable and p.payment_method = l.payment_method
    order by l.type desc, l.name
    limit 500`;
  return rows.map((row) => ({
    id: String(row.id), name: String(row.name), type: row.type as "income" | "expense",
    amount: Number(row.amount), amountPending: Boolean(row.amount_pending),
    isVariable: Boolean(row.is_variable), category: String(row.category ?? row.name),
    lastMonth: String(row.last_month), samples: Number(row.samples),
    average: row.average == null ? null : Number(row.average), alreadyAdded: Boolean(row.already_added),
  }));
}

export async function addFromHistory(userId: string, month: string, ids: string[]) {
  await ensureHistorySchema();
  const sql = getSql();
  // Serialize additions for this user/month. The insert sees the committed rows
  // after the lock, so concurrent selections cannot add the same named item twice.
  const results = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtextextended(${userId + ":" + month}, 0))`,
    sql`with chosen as (
      select distinct on (lower(trim(name)), type, is_variable, payment_method) * from monthly_ledger
      where user_id = ${userId} and month_key < ${month} and entry_kind = 'transaction'
        and id = any(${ids}::uuid[])
      order by lower(trim(name)), type, is_variable, payment_method, month_key desc, updated_at desc, id
    )
    insert into monthly_ledger(user_id, month_key, name, type, amount, amount_pending,
      category, is_from_template, template_id, is_variable, is_paid, notes,
      entry_kind, payment_method, due_date, history_source_id)
    select ${userId}, ${month}, s.name, s.type,
      case when s.type = 'income' then 0 else s.amount end, s.type = 'income',
      s.category, s.is_from_template, s.template_id, s.is_variable, false, null,
      'transaction', s.payment_method,
      case when s.due_date is null then null else
        (to_date(${month} || '-01', 'YYYY-MM-DD') +
          (least(extract(day from s.due_date)::int,
            extract(day from (to_date(${month} || '-01', 'YYYY-MM-DD') + interval '1 month - 1 day'))::int) - 1))::date end,
      s.id
    from chosen s where not exists (
      select 1 from monthly_ledger e where e.user_id = ${userId} and e.month_key = ${month}
        and e.entry_kind = 'transaction' and e.type = s.type and lower(trim(e.name)) = lower(trim(s.name))
        and e.is_variable = s.is_variable and e.payment_method = s.payment_method
    ) on conflict do nothing returning id`,
  ]);
  return { created: results[1].length };
}
