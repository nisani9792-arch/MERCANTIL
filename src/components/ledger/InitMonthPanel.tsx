"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Loader2, RefreshCw } from "lucide-react";

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
      const data = await res.json().catch(() => ({})) as { created?: number; skipped?: boolean; error?: string; incidentId?: string };
      if (!res.ok) {
        const reference = data.incidentId ? ` (מזהה תקלה: ${data.incidentId})` : "";
        throw new Error(`${data.error || "לא ניתן לפתוח את החודש"}${reference}`);
      }
      return data as { created: number; skipped: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledger", monthKey] });
      qc.invalidateQueries({ queryKey: ["analytics", monthKey] });
      qc.invalidateQueries({ queryKey: ["ai-insights", monthKey] });
    },
  });

  return (
    <section className={initialized ? "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5" : "m3-card m3-expressive-enter overflow-hidden border-dashed border-primary/40 bg-primary-container/30 p-4 text-center"}>
      {initialized ? (
        <div className="min-w-0 text-start">
          <p className="text-xs font-bold text-on-surface">התבנית מסונכרנת לחודש</p>
          <p className="truncate text-[11px] text-on-surface-variant">נוספו רק פריטים חסרים; שינויים בחודש נשמרים.</p>
        </div>
      ) : (
        <>
      <CalendarPlus className="mx-auto h-8 w-8 text-primary" />
      <h3 className="mt-2 font-bold text-on-surface">פתיחת חודש חדש</h3>
      <p className="mt-1 text-sm text-on-surface-variant">
        טעינת פריטים חסרים בלבד. ניתן לשנות שם וסכום בחודש הזה בלי לשנות את התבנית.
      </p>
        </>
      )}
      <button
        type="button"
        disabled={initMut.isPending}
        onClick={() => initMut.mutate()}
        className={initialized ? "flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-primary-container px-3 text-xs font-bold text-primary" : "m3-btn-primary mt-4 inline-flex min-h-[44px] items-center gap-2 px-6 py-2"}
      >
        {initMut.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          initialized ? <RefreshCw className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />
        )}
        {initMut.isPending ? "מסנכרן…" : initialized ? "סנכרון" : "אתחל חודש מתבנית"}
      </button>
      {!initialized && initMut.data?.skipped && (
        <p role="status" className="mt-2 text-sm text-on-surface-variant">אין פריטים חדשים לטעינה. בדוק שיש תבניות פעילות שמתאימות לחודש שנבחר.</p>
      )}
      {initMut.isError && <p role="alert" className={initialized ? "text-xs text-error" : "mt-3 text-sm text-error"}>{initMut.error.message}</p>}
      {initialized && Boolean(initMut.data?.created) && <p role="status" className="basis-full text-xs text-success">נוספו {initMut.data?.created} פריטים חסרים מהתבנית.</p>}
      {!initialized && Boolean(initMut.data?.created) && <p role="status" className="mt-3 text-sm text-success">נוספו {initMut.data?.created} פריטים. אפשר לערוך את סכומיהם בחודש הזה.</p>}
    </section>
  );
}
