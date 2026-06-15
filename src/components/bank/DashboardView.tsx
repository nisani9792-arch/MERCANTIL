"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AiInsightPanel } from "@/components/bank/AiInsightPanel";
import { DisposableIncomeHero } from "@/components/bank/DisposableIncomeHero";
import { FixedExpenseList } from "@/components/bank/FixedExpenseList";
import { FixedExpenseProgress } from "@/components/bank/FixedExpenseProgress";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import type { AnalyticsPayload } from "@/types/ledger";
import { useMonthStore } from "@/stores/useMonthStore";

export function DashboardView() {
  const monthKey = useMonthStore((s) => s.monthKey);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", monthKey],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?month=${monthKey}`);
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<AnalyticsPayload>;
    },
  });

  const ledgerQuery = useQuery({
    queryKey: ["ledger", monthKey],
    queryFn: async () => {
      const res = await fetch(`/api/ledger?month=${monthKey}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    enabled: Boolean(data?.summary.initialized),
  });

  const markPaidMut = useMutation({
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
      const res = await fetch(`/api/ledger/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid }),
      });
      if (!res.ok) throw new Error("mark paid failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledger", monthKey] });
      qc.invalidateQueries({ queryKey: ["analytics", monthKey] });
      qc.invalidateQueries({ queryKey: ["ai-insights", monthKey] });
      qc.invalidateQueries({ queryKey: ["smart-insights", monthKey] });
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          תקציב חודשי
        </h1>
        <p className="text-sm text-on-surface-variant">
          כמה נשאר לך להוצאות משתנות?
        </p>
      </div>

      <MonthNavigator />

      {isLoading && (
        <p className="text-center text-sm text-on-surface-variant">טוען...</p>
      )}

      {data?.summary.initialized && (
        <>
          <DisposableIncomeHero summary={data.summary} />
          <FixedExpenseProgress summary={data.summary} />
          <FixedExpenseList
            entries={ledgerQuery.data?.entries ?? []}
            onMarkPaid={(id, isPaid) => markPaidMut.mutate({ id, isPaid })}
            pending={markPaidMut.isPending}
          />
          <AiInsightPanel />
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
