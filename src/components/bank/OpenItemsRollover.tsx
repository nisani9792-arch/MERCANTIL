"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, CalendarClock } from "lucide-react";
import { fetchLive, mutateLive } from "@/lib/api/fetch-live";
import { formatMonthLabel } from "@/lib/utils/month";
import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyLedgerEntry } from "@/types/ledger";

type RolloverPreview = {
  sourceMonthKey: string;
  entries: MonthlyLedgerEntry[];
};

type RolloverResult = {
  sourceMonthKey: string;
  moved: MonthlyLedgerEntry[];
  movedCount: number;
};

export function OpenItemsRollover({ monthKey, onComplete }: { monthKey: string; onComplete: (message: string) => void }) {
  const queryClient = useQueryClient();
  const preview = useQuery({
    queryKey: ["ledger-rollover", monthKey],
    queryFn: () => fetchLive<RolloverPreview>(`/api/ledger/rollover?targetMonthKey=${monthKey}`),
    staleTime: 0,
  });
  const move = useMutation({
    mutationFn: async () => {
      const response = await mutateLive("/api/ledger/rollover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetMonthKey: monthKey }),
      });
      const result = await response.json().catch(() => ({})) as Partial<RolloverResult> & { error?: string };
      if (!response.ok || typeof result.movedCount !== "number") {
        throw new Error(result.error || "לא ניתן היה להעביר את התנועות");
      }
      return result as RolloverResult;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ledger", monthKey] }),
        queryClient.invalidateQueries({ queryKey: ["ledger", result.sourceMonthKey] }),
        queryClient.invalidateQueries({ queryKey: ["analytics", monthKey] }),
        queryClient.invalidateQueries({ queryKey: ["analytics", result.sourceMonthKey] }),
        queryClient.invalidateQueries({ queryKey: ["cashflow-cycle", monthKey] }),
        queryClient.invalidateQueries({ queryKey: ["ledger-rollover", monthKey] }),
      ]);
      onComplete(result.movedCount === 1 ? "תנועה פתוחה הועברה לחודש הנוכחי" : `${result.movedCount} תנועות פתוחות הועברו לחודש הנוכחי`);
    },
  });

  const entries = preview.data?.entries ?? [];
  if (!entries.length) return null;

  const sourceLabel = formatMonthLabel(preview.data?.sourceMonthKey ?? "");
  return (
    <section className="rounded-2xl border border-warning/30 bg-warning-container/35 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning"><CalendarClock className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">פעולות פתוחות מ־{sourceLabel}</p>
          <p className="mt-1 text-xs leading-5 text-on-surface-variant">{entries.length} תנועות עדיין לא סומנו כבוצעו. פעולות שבוצעו נשארות בהיסטוריה ולא יזוזו.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {entries.slice(0, 3).map((entry) => <span key={entry.id} className="max-w-full truncate rounded-lg bg-surface/80 px-2 py-1 text-xs font-semibold">{entry.name} · {formatCurrency(entry.amount)}</span>)}
        {entries.length > 3 && <span className="rounded-lg bg-surface/80 px-2 py-1 text-xs font-semibold">+{entries.length - 3} נוספות</span>}
      </div>
      {move.isError && <p role="alert" className="mt-3 text-xs font-bold text-error">{move.error.message}</p>}
      <button
        type="button"
        disabled={move.isPending}
        onClick={() => {
          if (window.confirm(`להעביר ${entries.length} תנועות פתוחות מ־${sourceLabel} לחודש הנוכחי? פעולות שבוצעו לא ישתנו.`)) move.mutate();
        }}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-on-surface px-4 text-sm font-black text-surface transition-transform active:scale-[.98] disabled:opacity-60"
      >
        <ArrowRightLeft className="h-4 w-4" />{move.isPending ? "מעביר בבטחה…" : "העבר פעולות פתוחות לחודש"}
      </button>
    </section>
  );
}
