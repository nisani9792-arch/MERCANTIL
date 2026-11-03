"use client";
import { useQuery } from "@tanstack/react-query";
import {
  PageHeading,
  SectionHeading,
  EmptyState,
  StatCard,
} from "@/components/ui/Workspace";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import {
  CashflowChart,
  CategoryChart,
} from "@/components/bank/FinancialCharts";
import { fetchLive } from "@/lib/api/fetch-live";
import { useMonthStore } from "@/stores/useMonthStore";
import type { AnalyticsPayload } from "@/types/ledger";
export default function TrendsPage() {
  const month = useMonthStore((s) => s.monthKey);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["analytics", month],
    queryFn: () => fetchLive<AnalyticsPayload>("/api/analytics?month=" + month),
  });
  const count = data?.trend.filter((p) => p.hasData !== false).length ?? 0;
  return (
    <div className="workspace-page">
      <PageHeading
        title="מגמות לאורך זמן"
        description="ככל שמצטברים נתונים, קל יותר לזהות מה חוזר ומה משתנה."
        action={
          <div className="workspace-month-picker">
            <MonthNavigator />
          </div>
        }
      />
      {isPending ? (
        <p role="status" className="workspace-loading">
          טוען מגמות…
        </p>
      ) : isError ? (
        <div role="alert" className="workspace-notice">
          לא הצלחנו לטעון.{" "}
          <button onClick={() => void refetch()} className="underline">
            ניסיון חוזר
          </button>
        </div>
      ) : (
        data && (
          <>
            {count >= 3 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard
                  label="ממוצע הכנסות שהוזנו"
                  value={data.averages.avgIncome}
                />
                <StatCard
                  label="ממוצע הוצאות שהוזנו"
                  value={data.averages.avgExpense}
                />
                <StatCard
                  label="נטו ממוצע ברישומים"
                  value={data.averages.avgNet}
                />
              </div>
            ) : (
              <EmptyState
                title="התמונה נבנית עם הזמן"
                description={
                  "יש כרגע " +
                  count +
                  " חודשים עם רישומים. ממוצעים יוצגו כשיצטברו לפחות 3 חודשים."
                }
              />
            )}
            <section className="finance-panel">
              <SectionHeading
                title="ההכנסות וההוצאות לאורך החודשים"
                description="חודשים ריקים אינם נספרים כאפס"
              />
              <CashflowChart data={data.trend} />
            </section>
            <section className="finance-panel">
              <SectionHeading title="חלוקת ההוצאות בחודש הנבחר" />
              <CategoryChart data={data.expenseBreakdown} />
            </section>
            <p className="workspace-muted">
              המגמות מתייחסות לרישומים שהזנת, כולל תכנון. חודשים שמולאו חלקית
              יכולים להשפיע על הממוצע; הסכומים אינם כוללים את הערכת המחיה.
            </p>
          </>
        )
      )}
    </div>
  );
}
