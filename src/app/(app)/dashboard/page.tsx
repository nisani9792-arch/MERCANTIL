import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  getFinancialSummary,
  getMonthlyCategoryBreakdown,
} from "@/lib/db/transactions";
import { BalanceOverview } from "@/components/bank/BalanceOverview";
import { CategoryMonthlyOverview } from "@/components/bank/CategoryMonthlyOverview";

export default async function DashboardPage() {
  if (!isDatabaseConfigured()) redirect("/login?setup=database");

  const session = await getSession();
  if (!session) redirect("/login");

  const [summary, breakdown] = await Promise.all([
    getFinancialSummary(session.userId),
    getMonthlyCategoryBreakdown(session.userId),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BalanceOverview summary={summary} />
      <CategoryMonthlyOverview
        income={breakdown.income}
        expenses={breakdown.expenses}
        monthIncome={summary.monthIncome}
        monthExpense={summary.monthExpense}
      />
    </div>
  );
}
