"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Loader2 } from "lucide-react";

type InitMonthPanelProps = {
  monthKey: string;
  initialized: boolean;
};

export function InitMonthPanel({ monthKey, initialized }: InitMonthPanelProps) {
  const qc = useQueryClient();

  const initMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ledger/init-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey }),
      });
      if (!res.ok) throw new Error("init failed");
      return res.json() as Promise<{ created: number; skipped: boolean }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledger", monthKey] });
      qc.invalidateQueries({ queryKey: ["ai-insights", monthKey] });
    },
  });

  if (initialized) return null;

  return (
    <section className="m3-card m3-expressive-enter overflow-hidden border-dashed border-primary/40 bg-primary-container/30 p-4 text-center">
      <CalendarPlus className="mx-auto h-8 w-8 text-primary" />
      <h3 className="mt-2 font-bold text-on-surface">פתיחת חודש חדש</h3>
      <p className="mt-1 text-sm text-on-surface-variant">
        טען את כל ההכנסות וההוצאות הקבועות מהתבנית לחודש הנוכחי
      </p>
      <button
        type="button"
        disabled={initMut.isPending}
        onClick={() => initMut.mutate()}
        className="m3-btn-primary mt-4 inline-flex min-h-[44px] items-center gap-2 px-6 py-2"
      >
        {initMut.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CalendarPlus className="h-4 w-4" />
        )}
        אתחל חודש מתבנית
      </button>
      {initMut.data?.skipped && (
        <p className="mt-2 text-xs text-warning">החודש כבר מאותחל</p>
      )}
    </section>
  );
}
