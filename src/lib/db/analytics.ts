import { getSql } from "@/lib/db/client";
import { getMonthSummary } from "@/lib/db/monthly-ledger";
import type {
  AnalyticsPayload,
  ExpenseBreakdownItem,
  HistoricalAverages,
  MonthTrendPoint,
} from "@/types/ledger";

function monthKeysBack(count: number, fromKey: string): string[] {
  const [y, m] = fromKey.split("-").map(Number);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return keys;
}

export async function getSixMonthTrend(
  userId: string,
  anchorMonth: string,
): Promise<MonthTrendPoint[]> {
  const sql = getSql();
  const keys = monthKeysBack(6, anchorMonth);

  const rows = await sql`
    select
      month_key,
      coalesce(sum(case when type = 'income' then amount else 0 end), 0) as income,
      coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as expense
    from monthly_ledger
    where user_id = ${userId}
      and month_key = any(${keys}::text[])
    group by month_key
  `;

  const byKey = new Map<string, { income: number; expense: number }>();
  for (const r of rows as Record<string, unknown>[]) {
    byKey.set(String(r.month_key), {
      income: Number(r.income),
      expense: Number(r.expense),
    });
  }

  return keys.map((monthKey) => {
    const p = byKey.get(monthKey) ?? { income: 0, expense: 0 };
    return {
      monthKey,
      income: p.income,
      expense: p.expense,
      net: p.income - p.expense,
    };
  });
}

export async function getExpenseBreakdown(
  userId: string,
  monthKey: string,
): Promise<ExpenseBreakdownItem[]> {
  const sql = getSql();
  const rows = await sql`
    select coalesce(category, name) as category, sum(amount) as amount
    from monthly_ledger
    where user_id = ${userId}
      and month_key = ${monthKey}
      and type = 'expense'
    group by coalesce(category, name)
    order by amount desc
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    category: String(r.category),
    amount: Number(r.amount),
  }));
}

export async function getHistoricalAverages(
  userId: string,
  anchorMonth: string,
): Promise<HistoricalAverages> {
  const trend = await getSixMonthTrend(userId, anchorMonth);
  const withData = trend.filter((t) => t.income > 0 || t.expense > 0);
  const divisor = withData.length || 1;
  const avgIncome =
    withData.reduce((s, t) => s + t.income, 0) / divisor;
  const avgExpense =
    withData.reduce((s, t) => s + t.expense, 0) / divisor;

  return {
    avgIncome,
    avgExpense,
    avgNet: avgIncome - avgExpense,
    monthsIncluded: withData.length,
  };
}

export async function getAnalytics(
  userId: string,
  monthKey: string,
): Promise<AnalyticsPayload> {
  const [summary, trend, expenseBreakdown, averages] = await Promise.all([
    getMonthSummary(userId, monthKey),
    getSixMonthTrend(userId, monthKey),
    getExpenseBreakdown(userId, monthKey),
    getHistoricalAverages(userId, monthKey),
  ]);

  return { monthKey, summary, trend, expenseBreakdown, averages };
}
