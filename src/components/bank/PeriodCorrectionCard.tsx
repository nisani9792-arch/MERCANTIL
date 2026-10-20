"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarSync } from "lucide-react";
import { fetchLive, mutateLive } from "@/lib/api/fetch-live";
import { formatMonthLabel, previousMonthKey } from "@/lib/utils/month";
import type { MonthlyLedgerEntry } from "@/types/ledger";

type Preview = { sourceMonthKey: string; entries: MonthlyLedgerEntry[] };

export function PeriodCorrectionCard({ monthKey, onComplete }: { monthKey: string; onComplete: (message: string) => void }) {
  const queryClient = useQueryClient();
  const preview = useQuery({
    queryKey: ["ledger-period-correction", monthKey],
    queryFn: () => fetchLive<Preview>(`/api/ledger/period-correction?targetMonthKey=${monthKey}`),
    staleTime: 0,
  });
  const move = useMutation({
    mutationFn: async () => {
      const response = await mutateLive("/api/ledger/period-correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceMonthKey: previousMonthKey(monthKey), targetMonthKey: monthKey }),
      });
      const result = await response.json().catch(() => ({})) as { movedCount?: number; skippedTemplateDuplicates?: number; error?: string };
      if (!response.ok || typeof result.movedCount !== "number") throw new Error(result.error || "תיקון התקופה נכשל");
      return result;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ledger", monthKey] }),
        queryClient.invalidateQueries({ queryKey: ["ledger", previousMonthKey(monthKey)] }),
        queryClient.invalidateQueries({ queryKey: ["analytics", monthKey] }),
        queryClient.invalidateQueries({ queryKey: ["ledger-period-correction", monthKey] }),
      ]);
      onComplete(result.skippedTemplateDuplicates ? `${result.movedCount} רשומות הועברו; ${result.skippedTemplateDuplicates} כפילויות תבנית נשארו לבחינה` : `${result.movedCount} רשומות הועברו לתקופת ${formatMonthLabel(monthKey)}`);
    },
  });
  const entries = preview.data?.entries ?? [];
  if (!entries.length) return null;
  const source = preview.data?.sourceMonthKey ?? previousMonthKey(monthKey);
  return <section className="rounded-2xl border border-primary/25 bg-primary-container/35 p-4">
    <div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary"><CalendarSync className="h-5 w-5" /></div><div><p className="text-sm font-black">תיקון תקופה: {formatMonthLabel(source)} ← {formatMonthLabel(monthKey)}</p><p className="mt-1 text-xs leading-5 text-on-surface-variant">זוהו {entries.length} רשומות. פעולה זו מעבירה את כולן — גם כאלה שסומנו כבוצעו — ושומרת את סטטוס התשלום והיסטוריית השינוי.</p></div></div>
    {move.isError && <p role="alert" className="mt-3 text-xs font-bold text-error">{move.error.message}</p>}
    <button type="button" disabled={move.isPending} onClick={() => { if (window.confirm(`להעביר את כל ${entries.length} הרשומות מ־${formatMonthLabel(source)} אל ${formatMonthLabel(monthKey)}?`)) move.mutate(); }} className="mt-4 min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-black text-on-primary transition-transform active:scale-[.98] disabled:opacity-60">{move.isPending ? "מתקן נתונים…" : `העבר את כל ${entries.length} הרשומות`}</button>
  </section>;
}
