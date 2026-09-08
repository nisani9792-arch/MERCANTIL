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
      if (!res.ok) throw new Error("לא ניתן לפתוח את החודש. נסה שוב; אם התקלה חוזרת יש לבדוק את חיבור השרת.");
      return res.json() as Promise<{ created: number; skipped: boolean }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledger", monthKey] });
      qc.invalidateQueries({ queryKey: ["analytics", monthKey] });
      qc.invalidateQueries({ queryKey: ["ai-insights", monthKey] });
    },
  });

  return (
    <section className="m3-card m3-expressive-enter overflow-hidden border-dashed border-primary/40 bg-primary-container/30 p-4 text-center">
      <CalendarPlus className="mx-auto h-8 w-8 text-primary" />
      <h3 className="mt-2 font-bold text-on-surface">{initialized ? "השלמת פריטים מהתבנית" : "פתיחת חודש חדש"}</h3>
      <p className="mt-1 text-sm text-on-surface-variant">
        טעינת פריטים חסרים בלבד. ניתן לשנות שם וסכום בחודש הזה בלי לשנות את התבנית.
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
        {initMut.isPending ? "טוען פריטים…" : initialized ? "הוסף פריטים חסרים מהתבנית" : "אתחל חודש מתבנית"}
      </button>
      {initMut.data?.skipped && (
        <p role="status" className="mt-2 text-sm text-on-surface-variant">אין פריטים חדשים לטעינה. בדוק שיש תבניות פעילות שמתאימות לחודש שנבחר.</p>
      )}
      {initMut.isError && <p role="alert" className="mt-3 text-sm text-error">{initMut.error.message}</p>}
      {Boolean(initMut.data?.created) && <p role="status" className="mt-3 text-sm text-success">נוספו {initMut.data?.created} פריטים. אפשר לערוך את סכומיהם בחודש הזה.</p>}
    </section>
  );
}
