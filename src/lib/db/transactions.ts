import { getSql } from "@/lib/db/client";
import type { Transaction, TransactionWithCategory } from "@/types";

export async function listTransactions(
  userId: string,
  limit = 50,
): Promise<TransactionWithCategory[]> {
  const sql = getSql();
  const rows = await sql`
    select
      t.id, t.user_id, t.amount, t.date, t.category_id,
      t.account_source, t.notes, t.import_hash,
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
      ${input.accountSource ?? "כללי"},
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

export type FinancialSummary = {
  balance: number;
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  depositsTotal: number;
};

export async function getFinancialSummary(
  userId: string,
): Promise<FinancialSummary> {
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
  `;

  const r = rows[0] as Record<string, number>;
  const totalIncome = Number(r.total_income);
  const totalExpense = Number(r.total_expense);
  const monthIncome = Number(r.month_income);
  const monthExpense = Number(r.month_expense);

  return {
    balance: totalIncome - totalExpense,
    monthIncome,
    monthExpense,
    monthNet: monthIncome - monthExpense,
    depositsTotal: totalIncome,
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
