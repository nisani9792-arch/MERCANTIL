"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  CircleAlert,
  CalendarDays,
  Library,
} from "lucide-react";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import {
  PageHeading,
  StatCard,
  SectionHeading,
  EmptyState,
} from "@/components/ui/Workspace";
import {
  CashflowChart,
  CategoryChart,
} from "@/components/bank/FinancialCharts";
import { fetchLive, mutateLive } from "@/lib/api/fetch-live";
import { monthlyPlan } from "@/lib/ledger/planning";
import { formatCurrency } from "@/lib/utils/format";
import type { AnalyticsPayload, MonthlyLedgerEntry } from "@/types/ledger";
import { useMonthStore } from "@/stores/useMonthStore";
export function DashboardView() {
  const month = useMonthStore((s) => s.monthKey);
  const analytics = useQuery({
    queryKey: ["analytics", month],
    queryFn: () => fetchLive<AnalyticsPayload>("/api/analytics?month=" + month),
  });
  const ledger = useQuery({
    queryKey: ["ledger", month],
    queryFn: () =>
      fetchLive<{ entries: MonthlyLedgerEntry[] }>(
        "/api/ledger?month=" + month,
      ),
  });
  const estimate = useQuery({
    queryKey: ["planning", month],
    queryFn: () =>
      fetchLive<{ amount: number | null }>(
        "/api/preferences/planning?month=" + month,
      ),
  });
  const summary = analytics.data?.summary;
  const ready = analytics.isSuccess && ledger.isSuccess && estimate.isSuccess;
  const missing =
    ledger.data?.entries.filter(
      (e) => e.amount_pending,
    ) ?? [];
  const plan =
    ready && summary
      ? monthlyPlan(
          summary.totalIncome,
          summary.totalFixedExpenses,
          summary.totalVariableExpenses,
          estimate.data.amount,
        )
      : null;
  return (
    <div className="workspace-page">
      <PageHeading
        eyebrow="עושים סדר, חודש אחרי חודש"
        title="מבט על"
        description="ההכנסות, ההתחייבויות ומה שנשאר בתכנון שלך."
        action={
          <div className="workspace-month-picker">
            <MonthNavigator />
          </div>
        }
      />
      {analytics.isError || ledger.isError || estimate.isError ? (
        <div role="alert" className="workspace-notice">
          לא הצלחנו לטעון את הנתונים.{" "}
          <button
            onClick={() => {
              void analytics.refetch();
              void ledger.refetch();
              void estimate.refetch();
            }}
            className="underline"
          >
            ניסיון חוזר
          </button>
        </div>
      ) : !ready ? (
        <p className="workspace-loading" role="status">
          טוען את תמונת החודש…
        </p>
      ) : null}
      {ready && summary && plan && (
        <>
          {summary.initialized ? (
            <>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                  label="יתרה משוערת לתכנון"
                  value={plan.remaining}
                  featured
                  note={missing.length ? "התכנון חלקי — יש סכומים להשלמה" : "הכנסות פחות הוצאות בתכנון"}
                />
                <StatCard
                  label="הכנסות שהוזנו"
                  tone="income"
                  value={summary.totalIncome}
                  note={
                    missing.some((e) => e.type === "income") ? "יש סכומים להשלמה" : "לפי הרישומים שלך"
                  }
                />
                <StatCard
                  label="הוצאות קבועות"
                  tone="expense"
                  value={summary.totalFixedExpenses}
                  note="חשבונות והתחייבויות"
                />
                <StatCard
                  label="הוצאות משתנות בתכנון"
                  tone="expense"
                  value={plan.variable}
                  note={
                    estimate.data.amount === null
                      ? "ללא הערכת מחיה"
                      : "כולל הערכת המחיה"
                  }
                />
              </div>
              {missing.length > 0 && (
                <Link
                  href={missing.every((e) => e.type === "income") ? "/month?view=income" : "/month"}
                  className="workspace-notice flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-2">
                    <CircleAlert className="h-4 w-4 shrink-0" />
                    {missing.length === 1
                      ? "נותר סכום אחד להשלמה"
                      : missing.length + " סכומים להשלמה"}
                  </span>
                  <span className="shrink-0 text-xs font-bold">להשלמה ←</span>
                </Link>
              )}
            </>
          ) : (
            <EmptyState
              title="החודש מתחיל בדף נקי"
              description="בחר פריטים מהחודשים הקודמים או הוסף הכנסה והוצאה חדשה. שום דבר לא נוסף אוטומטית."
              action={
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <Link
                    href="/library"
                    className="workspace-button workspace-button-primary"
                  >
                    <Library className="h-4 w-4" />
                    בחירה מהספרייה
                  </Link>
                  <Link href="/month?action=add" className="workspace-button">
                    <Plus className="h-4 w-4" />
                    פריט חדש
                  </Link>
                </div>
              }
            />
          )}
          <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            <section className="finance-panel min-w-0">
              <SectionHeading
                title="הכנסות מול הוצאות"
                description="החודשים שבהם הזנת נתונים"
                href="/trends"
                linkText="כל המגמות"
              />
              <CashflowChart data={analytics.data.trend} />
            </section>
            <section className="finance-panel min-w-0">
              <SectionHeading
                title="לאן מתוכנן הכסף?"
                description="הוצאות החודש לפי קטגוריה"
              />
              <CategoryChart data={analytics.data.expenseBreakdown} />
            </section>
          </div>
          <div className="workspace-shortcuts grid gap-3 sm:grid-cols-2">
            <Link
              href="/month"
              className="finance-panel flex items-center gap-4"
            >
              <span className="rounded-xl bg-primary-container p-3 text-primary">
                <CalendarDays className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <b className="block text-sm">החודש שלי</b>
                <span className="mt-1 block text-xs text-on-surface-variant">
                  לעבור על הרשימה ולעדכן סכומים
                </span>
              </span>
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Link>
            <Link
              href="/library"
              className="finance-panel flex items-center gap-4"
            >
              <span className="rounded-xl bg-surface-container p-3 text-primary">
                <Library className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <b className="block text-sm">ספריית הפריטים</b>
                <span className="mt-1 block text-xs text-on-surface-variant">
                  להוסיף מההיסטוריה בלי להקליד מחדש
                </span>
              </span>
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Link>
          </div>
          {summary.initialized && (
            <details className="finance-panel">
              <summary className="cursor-pointer text-sm font-semibold">
                הערכה חודשית למחיה וקניות{" "}
                <span className="ms-2 font-normal text-on-surface-variant">
                  {estimate.data.amount === null
                    ? "אופציונלי"
                    : formatCurrency(estimate.data.amount)}
                </span>
              </summary>
              <div className="mt-5 border-t border-outline-variant pt-4">
                <EstimateEditor
                  key={month}
                  month={month}
                  amount={estimate.data.amount}
                  recorded={summary.totalVariableExpenses}
                  remainder={plan.unrecordedEstimate}
                />
              </div>
            </details>
          )}
          <p className="workspace-muted">
            התמונה מבוססת על מה שהזנת. סכומים חסרים אינם אפס, והיתרה היא כלי
            לתכנון. התרשימים מציגים רישומים בלבד, ללא הערכת המחיה.
          </p>
        </>
      )}
    </div>
  );
}
function EstimateEditor({
  month,
  amount,
  recorded,
  remainder,
}: {
  month: string;
  amount: number | null;
  recorded: number;
  remainder: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async () => {
      const input = draft ?? (amount === null ? "" : String(amount));
      const value = input.trim() === "" ? null : Number(input);
      if (value !== null && (!Number.isFinite(value) || value < 0))
        throw new Error("יש להזין סכום חיובי או להשאיר ריק");
      const res = await mutateLive("/api/preferences/planning", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, amount: value }),
      });
      if (!res.ok) throw new Error("ההערכה לא נשמרה. בדוק את הסכום ונסה שוב.");
      return res.json() as Promise<{ amount: number | null }>;
    },
    onSuccess: (value) => {
      qc.setQueryData(["planning", month], value);
      setDraft(null);
    },
  });
  return (
    <section>
      <p className="mt-1 text-sm text-on-surface-variant">
        סכום כללי לכל ההוצאות המשתנות בחודש הזה. אין צורך להזין כל קנייה.
      </p>
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label className="min-w-0 flex-1 text-sm">
          הערכה חודשית בש״ח — אופציונלי
          <input
            disabled={save.isPending}
            value={draft ?? (amount === null ? "" : String(amount))}
            onChange={(e) => {
              setDraft(e.target.value);
              save.reset();
            }}
            type="number"
            inputMode="decimal"
            min="0"
            max="999999999"
            step="0.01"
            placeholder="טרם הוזנה הערכה"
            className="mt-1 block min-h-12 w-full rounded-xl border border-outline-variant bg-surface px-3"
          />
        </label>
        <button
          disabled={save.isPending}
          className="m3-btn-primary min-h-12 px-5"
        >
          {save.isPending ? "שומר…" : "שמירת הערכה"}
        </button>
      </form>
      <p className="mt-3 text-xs text-on-surface-variant">
        {amount === null
          ? "טרם הוזנה הערכה. כרגע נספרות רק ההוצאות המשתנות שהזנת."
          : `הוזנו ${formatCurrency(recorded)} בהוצאות משתנות; עוד ${formatCurrency(remainder)} נכללים בהערכה. אם ההוצאות שהזנת עוברות את ההערכה, הסכום הגבוה קובע.`}
      </p>
      <p className="mt-2 text-xs text-on-surface-variant">
        כל ההוצאות שמסומנות ״משתנות״ נכללות בהערכה הזו, ללא תוספת כפולה. ריק
        פירושו לא ידוע; 0 הוא הערכה מפורשת.
      </p>
      {save.isError && (
        <p role="alert" className="mt-2 text-error">
          {save.error.message}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="mt-2 text-success">
          ההערכה נשמרה
        </p>
      )}
    </section>
  );
}
