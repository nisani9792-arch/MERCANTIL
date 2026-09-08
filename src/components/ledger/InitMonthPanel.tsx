"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Check, Loader2, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { RecurringTemplate } from "@/types/ledger";
import { formatCurrency } from "@/lib/utils/format";

type InitMonthPanelProps = { monthKey: string; initialized: boolean };

export function InitMonthPanel({ monthKey, initialized }: InitMonthPanelProps) {
  const qc = useQueryClient();
  const [choosing, setChoosing] = useState(false);
  const { data } = useQuery({ queryKey: ["templates"], queryFn: async () => {
    const res = await fetch("/api/templates", { cache: "no-store" });
    if (!res.ok) throw new Error("failed");
    return res.json() as Promise<{ templates: RecurringTemplate[] }>;
  }});
  const active = (data?.templates ?? []).filter((item) => item.is_active);
  const [selected, setSelected] = useState<string[]>([]);
  const initMut = useMutation({
    mutationFn: async (templateIds: string[]) => {
      const res = await fetch("/api/ledger/init-month", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthKey, templateIds }) });
      const result = await res.json().catch(() => ({})) as { created?: number; error?: string; incidentId?: string };
      if (!res.ok) throw new Error(`${result.error || "לא ניתן לפתוח את החודש"}${result.incidentId ? ` (${result.incidentId})` : ""}`);
      return result;
    },
    onSuccess: () => { setChoosing(false); qc.invalidateQueries({ queryKey: ["ledger", monthKey] }); qc.invalidateQueries({ queryKey: ["analytics", monthKey] }); },
  });
  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]);

  if (initialized) return <section className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3"><Check className="h-5 w-5 text-success" /><p className="text-sm text-on-surface-variant">החודש נפתח. אפשר לשנות כל סכום בלי לגעת בספריית הפריטים.</p></section>;

  return <section className="m3-card overflow-hidden border-dashed border-primary/40 bg-primary-container/25 p-4">
    <div className="text-center"><CalendarPlus className="mx-auto h-8 w-8 text-primary" /><h3 className="mt-2 font-bold">פתיחת חודש גמישה</h3><p className="mt-1 text-sm text-on-surface-variant">בחר רק את הפריטים שרלוונטיים החודש. אחר כך ניתן לערוך סכום ושם רק בחודש הזה.</p></div>
    {!choosing ? <button type="button" onClick={() => { setSelected(active.map((item) => item.id)); setChoosing(true); }} className="m3-btn-primary mx-auto mt-4 flex min-h-12 items-center gap-2 px-5"><SlidersHorizontal className="h-4 w-4" />בחירת פריטים לחודש</button> : <div className="mt-4 space-y-2 border-t border-primary/15 pt-3">
      <div className="flex items-center justify-between"><strong className="text-sm">מה נכנס לתכנון?</strong><button type="button" onClick={() => setSelected(selected.length === active.length ? [] : active.map((item) => item.id))} className="text-xs font-bold text-primary">{selected.length === active.length ? "נקה בחירה" : "בחר הכול"}</button></div>
      <div className="max-h-56 space-y-1 overflow-y-auto">{active.map((item) => <button key={item.id} type="button" onClick={() => toggle(item.id)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-start hover:bg-surface-container"><span className={`flex h-5 w-5 items-center justify-center rounded-md border ${selected.includes(item.id) ? "border-primary bg-primary text-on-primary" : "border-outline"}`}>{selected.includes(item.id) && <Check className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{item.name}</b><small className="text-on-surface-variant">{item.type === "income" ? "הכנסה" : item.is_variable ? "משתנה" : "קבועה"}</small></span><strong dir="ltr" className="text-sm">{formatCurrency(item.amount)}</strong></button>)}</div>
      <button type="button" disabled={initMut.isPending || selected.length === 0} onClick={() => initMut.mutate(selected)} className="m3-btn-primary min-h-12 w-full">{initMut.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : `פתח חודש עם ${selected.length} פריטים`}</button>
    </div>}
    {initMut.isError && <p role="alert" className="mt-3 text-sm text-error">{initMut.error.message}</p>}
  </section>;
}
