import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  getFinancialSummary,
  listTransactions,
} from "@/lib/db/transactions";
import { BalanceOverview } from "@/components/bank/BalanceOverview";
import { TransactionsTable } from "@/components/bank/TransactionsTable";
import { AiInsightPanel } from "@/components/bank/AiInsightPanel";

export default async function DashboardPage() {
  if (!isDatabaseConfigured()) redirect("/login?setup=database");

  const session = await getSession();
  if (!session) redirect("/login");

  const [summary, transactions] = await Promise.all([
    getFinancialSummary(session.userId),
    listTransactions(session.userId, 6),
  ]);

  return (
    <div className="space-y-4 lg:space-y-5">
      <BalanceOverview summary={summary} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:gap-5">
        <TransactionsTable transactions={transactions} />
        <AiInsightPanel />
      </div>
    </div>
  );
}
