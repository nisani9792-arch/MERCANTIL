import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getMonthSummary } from "@/lib/db/monthly-ledger";
import { seedDefaultTemplates } from "@/lib/db/recurring-templates";
import { currentMonthKey } from "@/lib/utils/month";
import { AiInsightsPanel } from "@/components/ledger/AiInsightsPanel";
import { BudgetSummaryCard } from "@/components/ledger/BudgetSummaryCard";

export default async function DashboardPage() {
  if (!isDatabaseConfigured()) redirect("/login?setup=database");

  const session = await getSession();
  if (!session) redirect("/login");

  await seedDefaultTemplates(session.userId);
  const monthKey = currentMonthKey();
  const summary = await getMonthSummary(session.userId, monthKey);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BudgetSummaryCard summary={summary} />
      <AiInsightsPanel monthKey={monthKey} />
      {!summary.initialized && (
        <section className="m3-card m3-expressive-enter rounded-xl border-dashed border-primary/30 bg-primary-container/20 p-4 text-center text-sm text-on-surface-variant">
          החודש עדיין לא אותחל.{" "}
          <a href="/month" className="font-semibold text-primary underline">
            לחץ כאן לפתיחת חודש
          </a>
        </section>
      )}
    </div>
  );
}
