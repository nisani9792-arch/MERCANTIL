"use client";

import { CalendarRange, CircleAlert, WalletCards } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLive, mutateLive } from "@/lib/api/fetch-live";
import { formatCurrency } from "@/lib/utils/format";
import type { CashflowCycle } from "@/lib/cashflow/cycle";

export function CashflowCyclePanel({ monthKey }: { monthKey: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["cashflow-cycle", monthKey],
    queryFn: () => fetchLive<{ cycle: CashflowCycle }>(`/api/cashflow/cycle?month=${monthKey}`),
  });
  const saveStart = useMutation({
    mutationFn: async (cycleStartDay: number) => {
      const response = await mutateLive("/api/cashflow/cycle", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cycleStartDay }) });
      if (!response.ok) throw new Error("שמירת המחזור נכשלה");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cashflow-cycle", monthKey] }),
  });
  const cycle = data?.cycle;
  if (!cycle) return null;
  const label = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" });
  return <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-container/55 to-surface p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-primary"><CalendarRange className="h-4 w-4" /><p className="text-xs font-black uppercase tracking-wider">מחזור תזרים</p></div><h2 className="mt-1 text-lg font-black">{label.format(new Date(`${cycle.startDate}T00:00:00`))} — {label.format(new Date(`${cycle.endDate}T00:00:00`))}</h2></div><label className="text-xs font-bold text-on-surface-variant">מתחיל ב־<select value={cycle.startDay} disabled={saveStart.isPending} onChange={(event) => saveStart.mutate(Number(event.target.value))} className="ms-1 rounded-lg border border-outline-variant bg-surface px-1 py-1 text-on-surface">{[1, 5, 10, 15, 20, 25, 28].map((day) => <option key={day} value={day}>{day}</option>)}</select></label></div>
    <div className="mt-4 grid grid-cols-3 gap-2"><Metric label="בוצע" value={cycle.confirmedNet} /><Metric label="צפי למחזור" value={cycle.forecastNet} emphasis /><Metric label="ממתין" value={cycle.forecastNet - cycle.confirmedNet} /></div>
    <div className="mt-4 space-y-2">{cycle.upcoming.slice(0, 3).map((entry) => <div key={entry.id} className="flex items-center gap-2 rounded-xl bg-surface/80 px-3 py-2"><WalletCards className="h-4 w-4 text-primary" /><span className="min-w-0 flex-1 truncate text-sm font-bold">{entry.name}</span><span className={entry.type === "income" ? "text-success" : "text-error"} dir="ltr">{entry.amount_pending ? "טרם הוזן סכום" : `${entry.type === "income" ? "+" : "−"}${formatCurrency(entry.amount)}`}</span></div>)}{cycle.undated.length > 0 && <p className="flex items-center gap-1 text-xs font-semibold text-warning"><CircleAlert className="h-3.5 w-3.5" />{cycle.undated.length} תנועות ללא תאריך אינן כלולות בתחזית</p>}{!cycle.upcoming.length && <p className="text-sm text-on-surface-variant">אין חיובים או הכנסות מתוכננים לשבוע הקרוב.</p>}</div>
  </section>;
}

function Metric({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return <div className={`rounded-2xl p-2.5 ${emphasis ? "bg-primary text-on-primary" : "bg-surface/80"}`}><p className={`text-[10px] font-bold ${emphasis ? "text-on-primary/75" : "text-on-surface-variant"}`}>{label}</p><strong className="mt-1 block text-sm" dir="ltr">{value >= 0 ? "+" : "−"}{formatCurrency(Math.abs(value))}</strong></div>;
}
