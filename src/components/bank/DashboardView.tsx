"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, CircleCheck, Clock3, Landmark, Plus, WalletCards } from "lucide-react";
import { AiInsightPanel } from "@/components/bank/AiInsightPanel";
import { CashflowChart, CategoryChart, CHART_COLORS } from "@/components/bank/FinancialCharts";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import { MonthlyShareButton } from "@/components/bank/MonthlyShareButton";
import { fetchLive } from "@/lib/api/fetch-live";
import { formatCurrency } from "@/lib/utils/format";
import type { AnalyticsPayload, MonthlyLedgerEntry } from "@/types/ledger";
import { useMonthStore } from "@/stores/useMonthStore";

type LedgerPayload = {
  entries: MonthlyLedgerEntry[];
  summary: { initialized: boolean };
};

export function DashboardView() {
  const monthKey = useMonthStore((s) => s.monthKey);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", monthKey],
    queryFn: () => fetchLive<AnalyticsPayload>(`/api/analytics?month=${monthKey}`),
    staleTime: 0,
  });

  const { data: ledger } = useQuery({
    queryKey: ["ledger", monthKey],
    queryFn: () => fetchLive<LedgerPayload>(`/api/ledger?month=${monthKey}`),
    enabled: Boolean(data?.summary.initialized),
    staleTime: 0,
  });

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">מרכז שליטה פיננסי</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-on-surface sm:text-3xl">מה מצב הכסף שלי?</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 sm:w-64"><MonthNavigator /></div>
          <Link href="/month?action=add" className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-on-primary shadow-elevation-1">
            <Plus className="h-5 w-5" /><span className="hidden sm:inline">תנועה חדשה</span>
          </Link>
        </div>
      </div>

      {isLoading && (
        <p className="text-center text-sm text-on-surface-variant">טוען...</p>
      )}

      {data?.summary.initialized && (
        <>
          <section className="finance-hero overflow-hidden rounded-[28px] p-5 text-white sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
              <div>
                <div className="flex items-center gap-2 text-sm text-white/70"><Landmark className="h-4 w-4" />תחזית לסוף החודש</div>
                <p className="mt-3 text-4xl font-black tracking-tight sm:text-6xl" dir="ltr">{formatCurrency(data.summary.disposableRemaining)}</p>
                <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3 text-sm">
                  <Metric icon={ArrowDownLeft} label="הכנסות מתוכננות" value={data.summary.totalIncome} tone="text-emerald-300" />
                  <Metric icon={ArrowUpRight} label="הוצאות מתוכננות" value={data.summary.totalFixedExpenses + data.summary.totalVariableExpenses} tone="text-sky-300" />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between text-sm"><span className="text-white/70">ביצוע בפועל</span><span className="font-bold">{data.summary.totalIncome > 0 ? Math.min(100, Math.max(0, data.summary.actualExpenses / data.summary.totalIncome * 100)).toFixed(0) : 0}% מההכנסה</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-cyan-400" style={{ width: `${data.summary.totalIncome > 0 ? Math.min(100, data.summary.actualExpenses / data.summary.totalIncome * 100) : 0}%` }} /></div>
                <div className="mt-4 grid grid-cols-2 gap-4"><div><span className="text-xs text-white/60">נטו בפועל</span><p className="mt-1 text-xl font-black" dir="ltr">{formatCurrency(data.summary.actualNet)}</p></div><div><span className="text-xs text-white/60">עוד צפוי לרדת</span><p className="mt-1 text-xl font-black" dir="ltr">{formatCurrency(Math.max(0, data.summary.totalFixedExpenses + data.summary.totalVariableExpenses - data.summary.actualExpenses))}</p></div></div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-12">
            <section className="finance-panel xl:col-span-8">
              <PanelTitle title="תזרים מזומנים" subtitle="הכנסות מול הוצאות — 6 חודשים" />
              <CashflowChart data={data.trend} />
            </section>
            <section className="finance-panel xl:col-span-4">
              <PanelTitle title="הוצאות לפי קטגוריה" subtitle="איפה הכסף מתרכז החודש" />
              <CategoryChart data={data.expenseBreakdown} />
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {data.expenseBreakdown.slice(0, 6).map((item, index) => <div key={item.category} className="flex min-w-0 items-center gap-2 text-xs"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /><span className="truncate text-on-surface-variant">{item.category}</span></div>)}
              </div>
            </section>

            <section className="finance-panel xl:col-span-4">
              <PanelTitle title="הכסף שלי" subtitle="יתרות מחושבות לפי הרישומים" />
              <BalanceRow icon={Landmark} label="תזרים בנקאי בפועל" value={data.summary.actualNet} />
              <BalanceRow icon={WalletCards} label="מזומן בארנק" value={data.summary.cashBalance} accent />
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-surface-container/60 p-3 text-center"><div><p className="text-[11px] text-on-surface-variant">נמשך</p><strong className="text-sm">{formatCurrency(data.summary.cashWithdrawnThisMonth)}</strong></div><div className="border-s border-outline-variant"><p className="text-[11px] text-on-surface-variant">שולם במזומן</p><strong className="text-sm">{formatCurrency(data.summary.cashSpentThisMonth)}</strong></div></div>
            </section>
            <section className="finance-panel xl:col-span-4">
              <PanelTitle title="עוד צפוי החודש" subtitle="רישומים שעדיין לא סומנו כבוצעו" />
              <div className="space-y-1">
                {(ledger?.entries ?? []).filter((entry) => !entry.is_paid && entry.entry_kind === "transaction").slice(0, 5).map((entry) => <div key={entry.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-container/50"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-container text-warning"><Clock3 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{entry.name}</p><p className="text-[11px] text-on-surface-variant">{entry.type === "income" ? "הכנסה צפויה" : "תשלום צפוי"}</p></div><strong className={entry.type === "income" ? "text-success" : "text-on-surface"} dir="ltr">{formatCurrency(entry.amount)}</strong></div>)}
                {!(ledger?.entries ?? []).some((entry) => !entry.is_paid) && <div className="flex h-36 flex-col items-center justify-center text-success"><CircleCheck className="h-8 w-8" /><p className="mt-2 text-sm font-bold">הכול מעודכן</p></div>}
              </div>
              <Link href="/month" className="mt-3 flex items-center justify-between border-t border-outline-variant pt-3 text-sm font-bold text-primary">לכל תנועות החודש <ChevronLeft className="h-4 w-4" /></Link>
            </section>
            <div className="xl:col-span-4"><AiInsightPanel /></div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><MonthlyShareButton summary={data.summary} /><Link href="/month" className="flex min-h-[48px] items-center justify-center rounded-2xl border border-outline-variant px-5 text-sm font-semibold text-primary">עריכת החודש</Link></div>
        </>
      )}

      {!data?.summary.initialized && !isLoading && (
        <section className="m3-card rounded-2xl border-dashed border-primary/40 bg-primary-container/20 p-5 text-center">
          <p className="text-sm text-on-surface-variant">החודש עדיין לא אותחל</p>
          <Link
            href="/month"
            className="m3-btn-primary mt-3 inline-flex min-h-[48px] items-center px-6 py-2"
          >
            פתח חודש מתבנית
          </Link>
        </section>
      )}
    </div>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) { return <div className="mb-3"><h2 className="text-lg font-black text-on-surface">{title}</h2><p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p></div>; }
function Metric({ icon: Icon, label, value, tone }: { icon: typeof ArrowDownLeft; label: string; value: number; tone: string }) { return <div className="flex items-center gap-2"><Icon className={`h-5 w-5 ${tone}`} /><div><p className="text-xs text-white/60">{label}</p><strong dir="ltr">{formatCurrency(value)}</strong></div></div>; }
function BalanceRow({ icon: Icon, label, value, accent }: { icon: typeof Landmark; label: string; value: number; accent?: boolean }) { return <div className="flex items-center gap-3 border-b border-outline-variant py-3 last:border-0"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent ? "bg-primary-container text-primary" : "bg-surface-container text-on-surface-variant"}`}><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-xs text-on-surface-variant">{label}</p><strong className="text-xl" dir="ltr">{formatCurrency(value)}</strong></div></div>; }
