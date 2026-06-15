"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ExpenseDoughnut } from "@/components/dashboard/ExpenseDoughnut";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { SmartInsightsPanel } from "@/components/dashboard/SmartInsightsPanel";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import type { AnalyticsPayload } from "@/types/ledger";
import { useMonthStore } from "@/stores/useMonthStore";

export function DashboardView() {
  const monthKey = useMonthStore((s) => s.monthKey);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", monthKey],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?month=${monthKey}`);
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<AnalyticsPayload>;
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          תקציב חודשי
        </h1>
        <p className="text-sm text-on-surface-variant">
          פשוט, חכם, ומותאם למובייל
        </p>
      </div>

      <MonthNavigator />

      {isLoading && (
        <p className="text-center text-sm text-on-surface-variant">טוען...</p>
      )}

      {data && (
        <>
          <MetricCards summary={data.summary} averages={data.averages} />
          <IncomeExpenseChart data={data.trend} />
          <ExpenseDoughnut data={data.expenseBreakdown} />
          <SmartInsightsPanel />
        </>
      )}

      {!data?.summary.initialized && !isLoading && (
        <section className="m3-card rounded-2xl border-dashed border-primary/40 bg-primary-container/20 p-5 text-center">
          <p className="text-sm text-on-surface-variant">
            החודש עדיין לא אותחל
          </p>
          <Link
            href="/month"
            className="m3-btn-primary mt-3 inline-flex min-h-[48px] items-center px-6 py-2"
          >
            פתח חודש מתבנית
          </Link>
        </section>
      )}
    </div>
  );
}
