"use client";

import { formatCurrency } from "@/lib/utils/format";
import type { MonthSummary } from "@/types/ledger";
import { cn } from "@/lib/utils/cn";

type FixedExpenseProgressProps = {
  summary: MonthSummary;
};

export function FixedExpenseProgress({ summary }: FixedExpenseProgressProps) {
  const income = summary.totalIncome;
  const paid = summary.fixedExpensesPaid;
  const totalFixed = summary.totalFixedExpenses;

  const paidPct = income > 0 ? Math.min(100, (paid / income) * 100) : 0;
  const fixedBudgetPct = income > 0 ? Math.min(100, (totalFixed / income) * 100) : 0;

  return (
    <section className="m3-card rounded-2xl p-4">
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-on-surface">הוצאות קבועות ששולמו</h2>
          <p className="text-xs text-on-surface-variant">מתוך סך ההכנסות החודשיות</p>
        </div>
        <p className="text-lg font-bold text-primary" dir="ltr">
          {paidPct.toFixed(0)}%
        </p>
      </div>

      <div className="relative h-4 overflow-hidden rounded-full bg-surface-container">
        <div
          className="absolute inset-y-0 start-0 rounded-full bg-outline-variant/40"
          style={{ width: `${fixedBudgetPct}%` }}
          aria-hidden
        />
        <div
          className={cn(
            "absolute inset-y-0 start-0 rounded-full transition-all duration-500",
            paid >= totalFixed ? "bg-success" : "bg-primary",
          )}
          style={{ width: `${paidPct}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-on-surface-variant">
        <span dir="ltr">
          שולם {formatCurrency(paid)} / {formatCurrency(totalFixed)}
        </span>
        <span dir="ltr">הכנסות {formatCurrency(income)}</span>
      </div>
    </section>
  );
}
