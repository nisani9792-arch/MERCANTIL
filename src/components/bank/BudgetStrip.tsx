"use client";

import { formatCurrency } from "@/lib/utils/format";
import type { MonthSummary } from "@/types/ledger";
import { cn } from "@/lib/utils/cn";

type BudgetStripProps = {
  summary: MonthSummary;
};

export function BudgetStrip({ summary }: BudgetStripProps) {
  const items = [
    { label: "הכנסה", value: summary.totalIncome, tone: "text-success" },
    { label: "קבוע", value: summary.totalFixedExpenses, tone: "text-on-surface" },
    { label: "משתנה", value: summary.totalVariableExpenses, tone: "text-on-surface-variant" },
    {
      label: "נשאר",
      value: summary.disposableRemaining,
      tone: summary.disposableRemaining >= 0 ? "text-primary" : "text-error",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-outline-variant bg-surface-container-lowest px-2 py-2.5 text-center"
        >
          <p className="text-[10px] font-semibold text-on-surface-variant">{item.label}</p>
          <p className={cn("mt-0.5 text-sm font-bold", item.tone)} dir="ltr">
            {formatCurrency(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
