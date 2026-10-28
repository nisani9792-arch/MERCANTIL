"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, History, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { fetchLive, mutateLive } from "@/lib/api/fetch-live";
import { formatCurrency } from "@/lib/utils/format";
import { formatMonthLabel } from "@/lib/utils/month";

type HistoryItem = {
  id: string; name: string; type: "income" | "expense"; amount: number;
  amountPending: boolean; isVariable: boolean; category: string;
  lastMonth: string; samples: number; average: number | null; alreadyAdded: boolean;
};
type Props = { monthKey: string; initialized: boolean };

export function InitMonthPanel(props: Props) {
  return <HistoryPicker key={props.monthKey} {...props} />;
}
function HistoryPicker({ monthKey, initialized }: Props) {
  const qc = useQueryClient();
  const [choosing, setChoosing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [message, setMessage] = useState("");
  const history = useQuery({
    queryKey: ["ledger-history", monthKey], enabled: choosing,
    queryFn: () => fetchLive<{ items: HistoryItem[] }>(`/api/ledger/history?month=${monthKey}`),
    staleTime: 0,
  });
  const add = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await mutateLive("/api/ledger/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: monthKey, ids }) });
      const body = await res.json().catch(() => ({})) as { created?: number; error?: string };
      if (!res.ok) throw new Error(body.error || "לא הצלחנו להוסיף את הפריטים. הבחירה נשמרה ואפשר לנסות שוב.");
      return body;
    },
    onSuccess: async (body) => {
      setSelected([]); setChoosing(false);
      setMessage(body.created ? `נוספו ${body.created} פריטים לחודש. אפשר לערוך כל סכום.` : "הפריטים שבחרת כבר נמצאים בחודש.");
      await Promise.all(["ledger", "analytics", "ledger-history", "ai-insights"].map((key) => qc.invalidateQueries({ queryKey: [key, monthKey] })));
    },
  });
  const items = history.data?.items ?? [];
  const visible = items.filter((item) => (filter === "all" || item.type === filter) && (item.name + " " + item.category).toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()));
  const picked = items.filter((item) => selected.includes(item.id) && !item.alreadyAdded);
  const toggle = (id: string) => setSelected((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  return <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-primary-container p-2.5 text-primary"><History className="h-5 w-5" /></span><div><h2 className="font-bold">{initialized ? "מוסיפים רק מה שצריך" : "חודש חדש, דף נקי"}</h2><p className="mt-1 text-xs text-on-surface-variant">בחר מהחודשים הקודמים, או הוסף פריט חדש.</p></div></div>
      <button type="button" aria-expanded={choosing} aria-controls="history-picker" onClick={() => { setChoosing(!choosing); setMessage(""); add.reset(); }} className="m3-btn-primary flex min-h-11 items-center gap-2 px-4"><Plus className="h-4 w-4" />{choosing ? "סגירת הרשימה" : "בחירה מחודשים קודמים"}</button>
    </div>
    {message && <p role="status" className="mt-3 text-sm text-success">{message}</p>}
    {choosing && <div id="history-picker" className="mt-4 space-y-3 border-t border-outline-variant pt-4">
      <div className="flex flex-wrap items-center gap-3"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-outline-variant px-3"><Search className="h-4 w-4 shrink-0 text-on-surface-variant" /><input aria-label="חיפוש בפריטים קודמים" placeholder="חיפוש לפי שם או קטגוריה" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 min-w-0 w-full bg-transparent text-sm outline-none" /></label><button aria-label="סגירת בחירת פריטים" type="button" disabled={add.isPending} onClick={() => setChoosing(false)} className="min-h-11 rounded-xl px-3 text-on-surface-variant"><X className="h-4 w-4" /></button></div>
      <div aria-label="סוג הפריטים" className="flex gap-2">{([['all','הכול'],['income','הכנסות'],['expense','הוצאות']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={"min-h-10 rounded-full px-4 text-xs font-bold " + (filter === value ? "bg-primary-container text-primary" : "bg-surface-container text-on-surface-variant")}>{label}</button>)}</div>
      {history.isPending && <p role="status" className="py-6 text-center text-sm">טוען פריטים קודמים…</p>}
      {history.isError && <div role="alert" className="py-4 text-sm text-error">לא הצלחנו לטעון את ההיסטוריה. <button type="button" className="min-h-11 underline" onClick={() => void history.refetch()}>ניסיון חוזר</button></div>}
      {history.isSuccess && items.length === 0 && <p className="rounded-xl bg-surface-container p-5 text-center text-sm">אין עדיין פריטים מחודשים קודמים. הוסף הכנסה או הוצאה, והיא תהיה זמינה לבחירה בחודש הבא.</p>}
      {history.isSuccess && items.length > 0 && <>
        <p className="text-xs text-on-surface-variant">הוצאות מגיעות עם הסכום האחרון; הכנסות נשארות למילוי החודש. ממוצע מוצג כשיש לפחות 3 חודשי נתונים.</p>
        <div className="max-h-[26rem] overflow-y-auto rounded-xl border border-outline-variant divide-y divide-outline-variant">{visible.map((item) => <label key={item.id} className={"flex min-h-20 cursor-pointer items-center gap-3 p-3 " + (item.alreadyAdded ? "bg-surface-container/50 text-on-surface-variant" : selected.includes(item.id) ? "bg-primary-container/25" : "hover:bg-surface-container/50")}>
          <input type="checkbox" checked={item.alreadyAdded || selected.includes(item.id)} disabled={item.alreadyAdded || add.isPending || (!selected.includes(item.id) && selected.length >= 100)} onChange={() => toggle(item.id)} className="h-5 w-5 shrink-0 accent-primary" />
          <span className="min-w-0 flex-1"><b className="block text-sm">{item.name}</b><span className="mt-1 block text-xs text-on-surface-variant">{item.type === "income" ? "הכנסה" : item.isVariable ? "הוצאה משתנה" : "הוצאה קבועה"} · {formatMonthLabel(item.lastMonth)}</span>{item.samples >= 3 && item.average !== null && <span className="mt-1 block text-xs text-primary">הופיע ב־{item.samples} מתוך 6 חודשים · ממוצע {formatCurrency(item.average)}</span>}</span>
          <span className="shrink-0 text-end text-xs font-bold">{item.alreadyAdded ? <span className="inline-flex items-center gap-1"><Check className="h-4 w-4" />כבר נוסף</span> : item.type === "income" ? "סכום להשלמה" : <span dir="ltr">{formatCurrency(item.amount)}</span>}</span>
        </label>)}{visible.length === 0 && <p className="p-5 text-center text-sm">לא נמצאו פריטים התואמים לחיפוש.</p>}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-3"><span className="text-xs text-on-surface-variant">נבחרו {picked.length} פריטים</span><div className="flex items-center gap-2"><button type="button" disabled={add.isPending || selected.length === 0} onClick={() => setSelected([])} className="min-h-11 px-3 text-xs font-bold text-primary">ניקוי בחירה</button><button type="button" disabled={add.isPending || picked.length === 0} onClick={() => add.mutate(picked.map((item) => item.id))} className="m3-btn-primary min-h-11 px-5">{add.isPending ? "מוסיף…" : "הוספה לחודש"}</button></div></div>
      </>}
      {add.isError && <p role="alert" className="text-sm text-error">{add.error.message}</p>}
    </div>}
  </section>;
}
