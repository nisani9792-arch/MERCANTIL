import { getSql } from "@/lib/db/client";
import type { Transaction, TransactionWithCategory } from "@/types";

const RELEVANT_WHERE = `
  (t.notes is null or (
    t.notes not ilike '%חיוב זמני%'
    and t.notes not ilike '%temporary charge%'
  ))
`;

export async function listTransactions(
  userId: string,
  limit = 50,
  relevantOnly = true,
): Promise<TransactionWithCategory[]> {
  const sql = getSql();
  const rows = relevantOnly
    ? await sql`
        select
          t.id, t.user_id, t.amount, t.date, t.category_id,
          t.account_source, t.notes, t.import_hash, t.is_fixed_recurring,
          t.created_at, t.updated_at,
          c.name as category_name, c.type as category_type, c.icon as category_icon
        from transactions t
        join categories c on c.id = t.category_id
        where t.user_id = ${userId}
          and (t.notes is null or (
            t.notes not ilike '%חיוב זמני%'
            and t.notes not ilike '%temporary charge%'
          ))
        order by t.date desc, t.created_at desc
        limit ${limit}
      `
    : await sql`
        select
          t.id, t.user_id, t.amount, t.date, t.category_id,
          t.account_source, t.notes, t.import_hash, t.is_fixed_recurring,
          t.created_at, t.updated_at,
          c.name as category_name, c.type as category_type, c.icon as category_icon
        from transactions t
        join categories c on c.id = t.category_id
        where t.user_id = ${userId}
        order by t.date desc, t.created_at desc
        limit ${limit}
      `;

  return (rows as Record<string, unknown>[]).map(mapRow);
}

function mapRow(row: Record<string, unknown>): TransactionWithCategory {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    amount: Number(row.amount),
    date: String(row.date).slice(0, 10),
    category_id: row.category_id as string,
    account_source: row.account_source as string,
    notes: row.notes as string | null,
    import_hash: row.import_hash as string | null,
    is_fixed_recurring: Boolean(row.is_fixed_recurring),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    category: {
      name: row.category_name as string,
      type: row.category_type as "income" | "expense",
      icon: row.category_icon as string,
    },
  };
}

export async function createTransaction(
  userId: string,
  input: {
    amount: number;
    date: string;
    categoryId: string;
    accountSource?: string;
    notes?: string;
  },
): Promise<Transaction> {
  const sql = getSql();
  const rows = await sql`
    insert into transactions (user_id, amount, date, category_id, account_source, notes)
    values (
      ${userId},
      ${input.amount},
      ${input.date}::date,
      ${input.categoryId},
      ${input.accountSource ?? "ידני"},
      ${input.notes ?? null}
    )
    returning id, user_id, amount, date, category_id, account_source, notes,
              import_hash, created_at, updated_at
  `;
  const row = rows[0] as Record<string, unknown>;
  return {
    ...row,
    amount: Number(row.amount),
    date: String(row.date).slice(0, 10),
  } as Transaction;
}

export async function updateTransactionCategory(
  userId: string,
  transactionId: string,
  categoryId: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    update transactions set category_id = ${categoryId}, updated_at = now()
    where id = ${transactionId} and user_id = ${userId}
    returning id
  `;
  return rows.length > 0;
}

export type MonthlySnapshot = {
  month: string;
  income: number;
  expense: number;
  net: number;
};

export type FinancialSummary = {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  /** @deprecated use totalIncome */
  depositsTotal: number;
  recentMonths: MonthlySnapshot[];
};

export async function getFinancialSummary(userId: string): Promise<FinancialSummary> {
  const sql = getSql();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const rows = await sql`
    select
      coalesce(sum(case when c.type = 'income' then t.amount else 0 end), 0) as total_income,
      coalesce(sum(case when c.type = 'expense' then t.amount else 0 end), 0) as total_expense,
      coalesce(sum(case when c.type = 'income' and t.date >= ${monthStart}::date then t.amount else 0 end), 0) as month_income,
      coalesce(sum(case when c.type = 'expense' and t.date >= ${monthStart}::date then t.amount else 0 end), 0) as month_expense
    from transactions t
    join categories c on c.id = t.category_id
    where t.user_id = ${userId}
      and (t.notes is null or (
        t.notes not ilike '%חיוב זמני%'
        and t.notes not ilike '%temporary charge%'
      ))
  `;

  const monthRows = await sql`
    select
      to_char(date_trunc('month', t.date), 'YYYY-MM') as month,
      coalesce(sum(case when c.type = 'income' then t.amount else 0 end), 0) as income,
      coalesce(sum(case when c.type = 'expense' then t.amount else 0 end), 0) as expense
    from transactions t
    join categories c on c.id = t.category_id
    where t.user_id = ${userId}
      and t.date >= (date_trunc('month', now()) - interval '5 months')
      and (t.notes is null or (
        t.notes not ilike '%חיוב זמני%'
        and t.notes not ilike '%temporary charge%'
      ))
    group by 1
    order by 1 desc
  `;

  const r = rows[0] as Record<string, number>;
  const totalIncome = Number(r.total_income);
  const totalExpense = Number(r.total_expense);
  const monthIncome = Number(r.month_income);
  const monthExpense = Number(r.month_expense);

  const recentMonths = (monthRows as Record<string, unknown>[]).map((m) => {
    const income = Number(m.income);
    const expense = Number(m.expense);
    return {
      month: String(m.month),
      income,
      expense,
      net: income - expense,
    };
  });

  return {
    balance: totalIncome - totalExpense,
    totalIncome,
    totalExpense,
    monthIncome,
    monthExpense,
    monthNet: monthIncome - monthExpense,
    depositsTotal: totalIncome,
    recentMonths,
  };
}


export type CategoryMonthlyRow = {
  categoryId: string;
  categoryName: string;
  categoryType: "income" | "expense";
  total: number;
  count: number;
};

export async function getMonthlyCategoryBreakdown(userId: string) {
  const sql = getSql();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const rows = await sql`
    select
      c.id as category_id,
      c.name as category_name,
      c.type as category_type,
      coalesce(sum(t.amount), 0) as total,
      count(t.id)::int as count
    from transactions t
    join categories c on c.id = t.category_id
    where t.user_id = ${userId}
      and t.date >= ${monthStart}::date
      and (t.notes is null or (
        t.notes not ilike '%חיוב זמני%'
        and t.notes not ilike '%temporary charge%'
      ))
    group by c.id, c.name, c.type
    order by total desc
  `;

  const all = (rows as Record<string, unknown>[]).map((r) => ({
    categoryId: String(r.category_id),
    categoryName: String(r.category_name),
    categoryType: r.category_type as "income" | "expense",
    total: Number(r.total),
    count: Number(r.count),
  }));

  return {
    income: all.filter((r) => r.categoryType === "income"),
    expenses: all.filter((r) => r.categoryType === "expense"),
  };
}
export async function getTransactionsForAi(userId: string, limit = 100) {
  const sql = getSql();
  const rows = await sql`
    select t.id, t.amount, t.date, t.notes, t.account_source,
           c.name as category_name, c.type as category_type
    from transactions t
    join categories c on c.id = t.category_id
    where t.user_id = ${userId}
      and (t.notes is null or (
        t.notes not ilike '%חיוב זמני%'
        and t.notes not ilike '%temporary charge%'
      ))
    order by t.date desc
    limit ${limit}
  `;
  return rows as {
    id: string;
    amount: number;
    date: string;
    notes: string | null;
    account_source: string;
    category_name: string;
    category_type: string;
  }[];
}

/** Exported for scripts — keep SQL filter in sync */
export { RELEVANT_WHERE };
