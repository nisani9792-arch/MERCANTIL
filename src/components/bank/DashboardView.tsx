"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AiInsightPanel } from "@/components/bank/AiInsightPanel";
import { BudgetStrip } from "@/components/bank/BudgetStrip";
import { DisposableIncomeHero } from "@/components/bank/DisposableIncomeHero";
import { ExpenseOverviewList } from "@/components/bank/ExpenseOverviewList";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import { fetchLive } from "@/lib/api/fetch-live";
import type { AnalyticsPayload, MonthlyLedgerEntry } from "@/types/ledger";
import { useMonthStore } from "@/stores/useMonthStore";

type LedgerPayload = {
  entries: MonthlyLedgerEntry[];
  summary: { initialized: boolean };
};

export function DashboardView() {
  const monthKey = useMonthStore((s) => s.monthKey);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", monthKey],
    queryFn: () => fetchLive<AnalyticsPayload>(`/api/analytics?month=${monthKey}`),
    staleTime: 0,
  });

  const { data: ledger } = useQuery({
    queryKey: ["ledger", monthKey],
    queryFn: () => fetchLive<LedgerPayload>(`/api/ledger?month=${monthKey}`),
    enabled: Boolean(data?.summary.initialized),
    staleTime: 0,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-4">
      <MonthNavigator />

      {isLoading && (
        <p className="text-center text-sm text-on-surface-variant">טוען...</p>
      )}

      {data?.summary.initialized && (
        <>
          <DisposableIncomeHero summary={data.summary} />
          <BudgetStrip summary={data.summary} />
          <ExpenseOverviewList
            entries={ledger?.entries ?? []}
            totalIncome={data.summary.totalIncome}
          />
          <AiInsightPanel />
          <Link
            href="/month"
            className="flex min-h-[48px] items-center justify-center rounded-2xl border border-outline-variant text-sm font-semibold text-primary"
          >
            עריכת החודש
          </Link>
        </>
      )}

      {!data?.summary.initialized && !isLoading && (
        <section className="m3-card rounded-2xl border-dashed border-primary/40 bg-primary-container/20 p-5 text-center">
          <p className="text-sm text-on-surface-variant">החודש עדיין לא אותחל</p>
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
