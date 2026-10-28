"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { InitMonthPanel } from "@/components/ledger/InitMonthPanel";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import { CashflowChart, CategoryChart } from "@/components/bank/FinancialCharts";
import { fetchLive, mutateLive } from "@/lib/api/fetch-live";
import { monthlyPlan } from "@/lib/ledger/planning";
import { formatCurrency } from "@/lib/utils/format";
import type { AnalyticsPayload, MonthlyLedgerEntry } from "@/types/ledger";
import { useMonthStore } from "@/stores/useMonthStore";

export function DashboardView() {
  const month = useMonthStore((s) => s.monthKey);
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
      {!summary.initialized ? <InitMonthPanel monthKey={month} initialized={false} /> : <>
        <section aria-label="סיכום התכנון" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Amount label="יתרה לתכנון" value={plan.remaining} featured />
          <Amount label="הכנסות שהוזנו" value={summary.totalIncome} />
          <Amount label="התחייבויות קבועות" value={summary.totalFixedExpenses} />
          <Amount label="משתנות בתכנון" value={plan.variable} />
        </section>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
          <p>{missing.length || estimate.data.amount === null ? "תמונה חלקית · לפי הסכומים שהוזנו" : "הערכה לפי התכנון החודשי"} · לא יתרת בנק</p>
          {missing.length > 0 && <Link href="/month" className="inline-flex min-h-10 items-center font-bold text-primary">{missing.length === 1 ? "הכנסה אחת להשלמה" : missing.length + " הכנסות להשלמה"} ←</Link>}
        </div>
        <details className="finance-panel"><summary className="cursor-pointer py-2 text-sm font-bold">הערכה למחיה וקניות <span className="font-normal text-on-surface-variant">· {estimate.data.amount === null ? "לא הוגדרה" : formatCurrency(estimate.data.amount)}</span></summary><div className="border-t border-outline-variant pt-4"><EstimateEditor key={month} month={month} amount={estimate.data.amount} recorded={summary.totalVariableExpenses} remainder={plan.unrecordedEstimate} /></div></details>
      </>}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="finance-panel min-w-0"><h2 className="text-lg font-bold">הכנסות מול הוצאות</h2><p className="mb-4 mt-1 text-xs text-on-surface-variant">רק חודשים עם רישומים מוצגים</p><CashflowChart data={analytics.data.trend} /></section>
          <section className="finance-panel min-w-0"><h2 className="text-lg font-bold">חלוקת ההוצאות</h2><p className="mb-4 mt-1 text-xs text-on-surface-variant">לפי הקטגוריות שהזנת החודש</p><CategoryChart data={analytics.data.expenseBreakdown} /></section>
        </div>
        <p className="text-xs text-on-surface-variant">נצברו {analytics.data.trend.filter((point) => point.hasData !== false).length} חודשים עם נתונים. ממוצעים לפי פריט מופיעים ברשימת ההיסטוריה אחרי 3 חודשי רישום. התרשימים מציגים רישומים בלבד, ללא הערכת המחיה. חודשים חלקיים עשויים להשתנות.</p>
      <nav aria-label="פעולות בתכנון" className="flex flex-wrap gap-2"><Link href="/month" className="inline-flex min-h-11 items-center rounded-xl border border-outline-variant px-4 text-sm font-bold text-primary">עריכת החודש ←</Link><Link href="/templates" className="inline-flex min-h-11 items-center rounded-xl border border-outline-variant px-4 text-sm font-bold text-primary">הקבועים שלי ←</Link><Link href="/finance" className="inline-flex min-h-11 items-center rounded-xl border border-outline-variant px-4 text-sm font-bold text-primary">חסכונות וחובות ←</Link></nav>
    </>}
  </div>;
}
function Amount({ label, value, featured = false }: { label: string; value: number; featured?: boolean }) {
  return <div className={"min-w-0 rounded-2xl border p-4 " + (featured ? "finance-hero border-transparent text-white" : "border-outline-variant bg-surface-container-lowest text-on-surface")}><p className={"text-xs " + (featured ? "text-white/80" : "text-on-surface-variant")}>{label}</p><strong className="mt-2 block break-words text-xl font-black sm:text-2xl" dir="ltr">{formatCurrency(value)}</strong></div>;
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
  return <section><p className="mt-1 text-sm text-on-surface-variant">סכום כללי לכל ההוצאות המשתנות בחודש הזה. אין צורך להזין כל קנייה.</p>
    <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}><label className="min-w-0 flex-1 text-sm">הערכה חודשית בש״ח — אופציונלי<input disabled={save.isPending} value={draft ?? (amount === null ? "" : String(amount))} onChange={(e) => { setDraft(e.target.value); save.reset(); }} type="number" inputMode="decimal" min="0" max="999999999" step="0.01" placeholder="טרם הוזנה הערכה" className="mt-1 block min-h-12 w-full rounded-xl border border-outline-variant bg-surface px-3" /></label><button disabled={save.isPending} className="m3-btn-primary min-h-12 px-5">{save.isPending ? "שומר…" : "שמירת הערכה"}</button></form>
    <p className="mt-3 text-xs text-on-surface-variant">{amount === null ? "טרם הוזנה הערכה. כרגע נספרות רק ההוצאות המשתנות שהזנת." : `הוזנו ${formatCurrency(recorded)} בהוצאות משתנות; עוד ${formatCurrency(remainder)} נכללים בהערכה. אם ההוצאות שהזנת עוברות את ההערכה, הסכום הגבוה קובע.`}</p><p className="mt-2 text-xs text-on-surface-variant">כל ההוצאות שמסומנות ״משתנות״ נכללות בהערכה הזו, ללא תוספת כפולה. ריק פירושו לא ידוע; 0 הוא הערכה מפורשת.</p>
    {save.isError && <p role="alert" className="mt-2 text-error">{save.error.message}</p>}{save.isSuccess && <p role="status" className="mt-2 text-success">ההערכה נשמרה</p>}
  </section>;
}
