import { formatCurrency } from "@/lib/utils/format";
import type { MonthSummary } from "@/types/ledger";

type BudgetSummaryCardProps = {
  summary: MonthSummary;
};

export function BudgetSummaryCard({ summary }: BudgetSummaryCardProps) {
  const monthLabel = new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${summary.monthKey}-01`));

  const cards = [
    {
      label: "סה״כ הכנסות",
      value: summary.totalIncome,
      tone: "text-success",
    },
    {
      label: "הוצאות קבועות",
      value: summary.totalFixedExpenses,
      tone: "text-error",
    },
    {
      label: "נשאר למשתנה",
      value: summary.remainingForVariable,
      tone:
        summary.remainingForVariable >= 0 ? "text-primary" : "text-error",
      highlight: true,
    },
  ];

  return (
    <section className="m3-card-gold m3-expressive-enter overflow-hidden">
      <div className="border-b border-outline-variant bg-surface-container px-4 py-3">
        <h2 className="text-sm font-bold text-on-surface">תקציב החודש</h2>
        <p className="text-xs text-on-surface-variant">{monthLabel}</p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border px-3 py-3 transition-transform duration-300 hover:scale-[1.02] ${
              card.highlight
                ? "border-primary/30 bg-primary-container"
                : "border-outline-variant bg-surface-container-low"
            }`}
          >
            <p className="text-[11px] font-semibold text-on-surface-variant">
              {card.label}
            </p>
            <p className={`mt-1 text-xl font-bold tracking-tight ${card.tone}`}>
              {formatCurrency(card.value)}
            </p>
          </div>
        ))}
      </div>
      {summary.totalVariableExpenses > 0 && (
        <p className="border-t border-outline-variant px-4 py-2 text-xs text-on-surface-variant">
          הוצאות משתנות עד כה:{" "}
          <span className="font-semibold text-on-surface">
            {formatCurrency(summary.totalVariableExpenses)}
          </span>
          {" · "}
          נטו אחרי הכל:{" "}
          <span
            className={
              summary.netAfterAll >= 0 ? "text-success" : "text-error"
            }
          >
            {formatCurrency(summary.netAfterAll)}
          </span>
        </p>
      )}
    </section>
  );
}
