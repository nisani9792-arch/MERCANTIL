"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import { CashflowChart, CategoryChart } from "@/components/bank/FinancialCharts";
import { fetchLive, mutateLive } from "@/lib/api/fetch-live";
import { monthlyPlan } from "@/lib/ledger/planning";
import { formatCurrency } from "@/lib/utils/format";
import type { AnalyticsPayload, MonthlyLedgerEntry } from "@/types/ledger";
import { useMonthStore } from "@/stores/useMonthStore";

export function DashboardView() {
  const month = useMonthStore((s) => s.monthKey);
  const [expanded, setExpanded] = useState(false);
  const analytics = useQuery({ queryKey: ["analytics", month], queryFn: () => fetchLive<AnalyticsPayload>(`/api/analytics?month=${month}`) });
  const ledger = useQuery({ queryKey: ["ledger", month], queryFn: () => fetchLive<{ entries: MonthlyLedgerEntry[] }>(`/api/ledger?month=${month}`) });
  const estimate = useQuery({ queryKey: ["planning", month], queryFn: () => fetchLive<{ amount: number | null }>(`/api/preferences/planning?month=${month}`) });
  const summary = analytics.data?.summary;
  const missing = ledger.data?.entries.filter((e) => e.type === "income" && e.amount_pending) ?? [];
  const ready = analytics.isSuccess && ledger.isSuccess && estimate.isSuccess;
  const plan = ready && summary ? monthlyPlan(summary.totalIncome, summary.totalFixedExpenses, summary.totalVariableExpenses, estimate.data.amount) : null;
  const error = analytics.isError || ledger.isError || estimate.isError;
  return <div className="mx-auto max-w-5xl space-y-5 pb-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-black sm:text-3xl">התכנון שלי</h1><p className="mt-2 text-sm text-on-surface-variant">הקבועים במקום אחד. משלימים מידע בקצב שלך.</p></div><div className="sm:w-64"><MonthNavigator /></div></header>
    {error ? <div role="alert" className="finance-panel"><p>לא הצלחנו לטעון את התכנון. הסכומים יוצגו כשהמידע ייטען.</p><button className="m3-btn-primary mt-3 min-h-11 px-4" onClick={() => { void analytics.refetch(); void ledger.refetch(); void estimate.refetch(); }}>ניסיון חוזר</button></div> : !ready ? <p role="status">טוען את התכנון…</p> : null}
    {ready && summary && plan && <>
      {!summary.initialized ? <section className="finance-panel text-center"><h2 className="font-bold">מתחילים מההכנסות וההוצאות הקבועות</h2><Link className="m3-btn-primary mt-3 inline-flex min-h-12 items-center px-5" href="/month">פתיחת החודש</Link></section> : <>
        <section className="finance-hero rounded-[28px] p-5 text-white sm:p-7"><p className="text-sm text-white/80">{missing.length || estimate.data.amount === null ? "יתרה לתכנון · תמונה חלקית" : "יתרה משוערת לתכנון"}</p><p className="mt-3 text-4xl font-black sm:text-6xl" dir="ltr">{formatCurrency(plan.remaining)}</p><p className="mt-3 text-sm text-white/80">הכנסות שהוזנו, פחות הקבועות והמשתנות בתכנון.</p><div className="mt-5 grid grid-cols-1 gap-4 border-t border-white/20 pt-4 sm:grid-cols-3"><Amount label="הכנסות שהוזנו" value={summary.totalIncome} /><Amount label="התחייבויות קבועות" value={summary.totalFixedExpenses} /><Amount label="משתנות בתכנון" value={plan.variable} /></div><p className="mt-4 text-xs text-white/70">זו אינדיקציה לפי הנתונים שהזנת, לא יתרת חשבון הבנק.</p></section>
        {missing.length > 0 && <section className="finance-panel"><h2 className="font-bold">נותרו {missing.length} הכנסות להשלמה</h2><p className="my-2 text-sm">{missing.map((e) => e.name).join(" · ")}</p><p className="text-sm text-on-surface-variant">הסכומים החסרים אינם אפס. היתרה תתעדכן כשתמלא אותם.</p><Link href="/month" className="mt-3 inline-flex min-h-11 items-center font-bold text-primary">להשלמת הסכומים ←</Link></section>}
        <EstimateEditor key={month} month={month} amount={estimate.data.amount} recorded={summary.totalVariableExpenses} remainder={plan.unrecordedEstimate} />
      </>}
      <nav aria-label="פעולות בתכנון" className="grid gap-3 sm:grid-cols-3"><Link href="/month" className="finance-panel font-bold text-primary">עריכת החודש ←</Link><Link href="/templates" className="finance-panel font-bold text-primary">הקבועים שלי ←</Link><Link href="/finance" className="finance-panel font-bold text-primary">חסכונות וחובות ←</Link></nav>
      {summary.initialized && <section className="finance-panel"><button type="button" aria-expanded={expanded} aria-controls="planning-charts" onClick={() => setExpanded(!expanded)} className="flex min-h-11 w-full items-center justify-between font-bold">מגמות ופירוט הוצאות <span aria-hidden="true">{expanded ? "−" : "+"}</span></button>{expanded && <div id="planning-charts" className="mt-4 grid gap-5 md:grid-cols-2"><div><h2 className="font-bold">הנתונים שהוזנו לאורך החודשים</h2><p className="mb-3 text-xs text-on-surface-variant">ללא הערכת המחיה; חודשים חלקיים אינם בני השוואה מלאה.</p><CashflowChart data={analytics.data.trend} /></div><div><h2 className="mb-3 font-bold">הוצאות שהוזנו לפי קטגוריה</h2><CategoryChart data={analytics.data.expenseBreakdown} /></div></div>}</section>}
    </>}
  </div>;
}
function Amount({ label, value }: { label: string; value: number }) {
  return <div><p className="text-xs text-white/75">{label}</p><strong className="mt-1 block text-xl" dir="ltr">{formatCurrency(value)}</strong></div>;
}
function EstimateEditor({ month, amount, recorded, remainder }: { month: string; amount: number | null; recorded: number; remainder: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const qc = useQueryClient();
  const save = useMutation({ mutationFn: async () => {
    const input = draft ?? (amount === null ? "" : String(amount));
    const value = input.trim() === "" ? null : Number(input);
    if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error("יש להזין סכום חיובי או להשאיר ריק");
    const res = await mutateLive("/api/preferences/planning", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, amount: value }) });
    if (!res.ok) throw new Error("ההערכה לא נשמרה. בדוק את הסכום ונסה שוב.");
    return res.json() as Promise<{ amount: number | null }>;
  }, onSuccess: (value) => { qc.setQueryData(["planning", month], value); setDraft(null); } });
  return <section className="finance-panel"><h2 className="text-lg font-bold">הערכה למחיה וקניות</h2><p className="mt-1 text-sm text-on-surface-variant">סכום כללי לכל ההוצאות המשתנות בחודש הזה. אין צורך להזין כל קנייה.</p>
    <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}><label className="min-w-0 flex-1 text-sm">הערכה חודשית בש״ח — אופציונלי<input disabled={save.isPending} value={draft ?? (amount === null ? "" : String(amount))} onChange={(e) => { setDraft(e.target.value); save.reset(); }} type="number" inputMode="decimal" min="0" max="999999999" step="0.01" placeholder="טרם הוזנה הערכה" className="mt-1 block min-h-12 w-full rounded-xl border border-outline-variant bg-surface px-3" /></label><button disabled={save.isPending} className="m3-btn-primary min-h-12 px-5">{save.isPending ? "שומר…" : "שמירת הערכה"}</button></form>
    <p className="mt-3 text-xs text-on-surface-variant">{amount === null ? "טרם הוזנה הערכה. כרגע נספרות רק ההוצאות המשתנות שהזנת." : `הוזנו ${formatCurrency(recorded)} בהוצאות משתנות; עוד ${formatCurrency(remainder)} נכללים בהערכה. אם ההוצאות שהזנת עוברות את ההערכה, הסכום הגבוה קובע.`}</p><p className="mt-2 text-xs text-on-surface-variant">כל ההוצאות שמסומנות ״משתנות״ נכללות בהערכה הזו, ללא תוספת כפולה. ריק פירושו לא ידוע; 0 הוא הערכה מפורשת.</p>
    {save.isError && <p role="alert" className="mt-2 text-error">{save.error.message}</p>}{save.isSuccess && <p role="status" className="mt-2 text-success">ההערכה נשמרה</p>}
  </section>;
}
