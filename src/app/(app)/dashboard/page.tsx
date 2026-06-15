import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  getFinancialSummary,
  getFixedRecurringAverages,
  getMonthlyCategoryBreakdown,
} from "@/lib/db/transactions";
import { BalanceOverview } from "@/components/bank/BalanceOverview";
import { BrainDumpPanel } from "@/components/bank/BrainDumpPanel";
import { CategoryMonthlyOverview } from "@/components/bank/CategoryMonthlyOverview";
import { FixedCashflowCard } from "@/components/bank/FixedCashflowCard";

export default async function DashboardPage() {
  if (!isDatabaseConfigured()) redirect("/login?setup=database");

  const session = await getSession();
  if (!session) redirect("/login");

  const [summary, breakdown, fixedAvg] = await Promise.all([
    getFinancialSummary(session.userId),
    getMonthlyCategoryBreakdown(session.userId),
    getFixedRecurringAverages(session.userId),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BalanceOverview summary={summary} />
      <FixedCashflowCard averages={fixedAvg} />
      <BrainDumpPanel />
      <CategoryMonthlyOverview
        income={breakdown.income}
        expenses={breakdown.expenses}
        monthIncome={summary.monthIncome}
        monthExpense={summary.monthExpense}
      />
    </div>
  );
}
