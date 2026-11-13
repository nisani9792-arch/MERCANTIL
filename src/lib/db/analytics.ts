import { currentMonthKey } from "@/lib/utils/month";
import { ensureIncomeAmounts } from "@/lib/db/income-amounts";
import { getSql } from "@/lib/db/client";
import { getMonthlyWorkspace } from "@/lib/db/monthly-ledger";
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
  await ensureIncomeAmounts();
  const sql = getSql();
  const keys = monthKeysBack(6, anchorMonth);

  const rows = await sql`
    select
      month_key, count(*) filter(where amount_pending and entry_kind = 'transaction') as pending_count,
      coalesce(sum(case when type = 'income' and entry_kind = 'transaction' then amount else 0 end), 0) as income,
      coalesce(sum(case when type = 'expense' and entry_kind = 'transaction' then amount else 0 end), 0) as expense
    from monthly_ledger
    where user_id = ${userId}
      and month_key = any(${keys}::text[])
    group by month_key
  `;

  const byKey = new Map<string, { income: number; expense: number; pendingCount: number }>();
  for (const r of rows as Record<string, unknown>[]) {
    byKey.set(String(r.month_key), {
      income: Number(r.income),
      expense: Number(r.expense),
      pendingCount: Number(r.pending_count ?? 0),
    });
  }

  return keys.map((monthKey) => {
    const p = byKey.get(monthKey) ?? { income: 0, expense: 0, pendingCount: 0 };
    return {
      monthKey,
      hasData: byKey.has(monthKey),
      pendingCount: p.pendingCount,
      income: p.income,
      expense: p.expense,
      net: Math.round((p.income - p.expense) * 100) / 100,
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
      and entry_kind = 'transaction'
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
  return getHistoricalAveragesFromTrend(trend);
}

export function getHistoricalAveragesFromTrend(
  trend: MonthTrendPoint[],
): HistoricalAverages {
  const withData = trend.filter((t) => t.monthKey < currentMonthKey() && !t.pendingCount && (t.hasData ?? (t.income > 0 || t.expense > 0)));
  const divisor = withData.length || 1;
  const avgIncome =
    withData.reduce((s, t) => s + t.income, 0) / divisor;
  const avgExpense =
    withData.reduce((s, t) => s + t.expense, 0) / divisor;

  return {
    avgIncome: Math.round(avgIncome * 100) / 100,
    avgExpense: Math.round(avgExpense * 100) / 100,
    avgNet: Math.round((avgIncome - avgExpense) * 100) / 100,
    monthsIncluded: withData.length,
  };
}

export async function getAnalytics(
  userId: string,
  monthKey: string,
): Promise<AnalyticsPayload> {
  const keys=monthKeysBack(6,monthKey);
  const snapshot=await getMonthlyWorkspace(userId,monthKey,keys);
  const summary=snapshot.summary;
  const byMonth=new Map((snapshot.trendRows??[]).map(row=>[String(row.month_key),{income:Number(row.income),expense:Number(row.expense),pendingCount:Number(row.pending_count??0)}]));
  const trend:MonthTrendPoint[]=keys.map(key=>{const point=byMonth.get(key)??{income:0,expense:0,pendingCount:0};return {monthKey:key,hasData:byMonth.has(key),...point,net:Math.round((point.income-point.expense)*100)/100};});
  const byCategory=new Map<string,number>();
  for(const entry of snapshot.entries){if(entry.type==='expense'&&entry.entry_kind==='transaction')byCategory.set(entry.category,(byCategory.get(entry.category)??0)+Math.round(entry.amount*100));}
  const expenseBreakdown:ExpenseBreakdownItem[]=Array.from(byCategory,([category,cents])=>({category,amount:cents/100})).sort((a,b)=>b.amount-a.amount);
  const averages = getHistoricalAveragesFromTrend(trend);

  return { monthKey, summary, trend, expenseBreakdown, averages };
}
