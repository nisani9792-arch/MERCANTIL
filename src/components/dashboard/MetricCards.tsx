"use client";

import { formatCurrency } from "@/lib/utils/format";
import type { MonthSummary } from "@/types/ledger";
import type { HistoricalAverages } from "@/types/ledger";

type MetricCardsProps = {
  summary: MonthSummary;
  averages: HistoricalAverages;
};

export function MetricCards({ summary, averages }: MetricCardsProps) {
  const totalExpenses =
    summary.totalFixedExpenses + summary.totalVariableExpenses;

  const cards = [
    {
      label: "הכנסות",
      value: summary.totalIncome,
      tone: "text-success",
    },
    {
      label: "הוצאות",
      value: totalExpenses,
      tone: "text-error",
    },
    {
      label: "יתרה",
      value: summary.netAfterAll,
      tone: summary.netAfterAll >= 0 ? "text-primary" : "text-error",
      highlight: true,
    },
    {
      label: "ממוצע חודשי",
      value: averages.avgNet,
      tone: averages.avgNet >= 0 ? "text-on-surface" : "text-error",
      sub: `${averages.monthsIncluded} חודשים`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border px-3 py-3 transition-transform active:scale-[0.98] ${
            card.highlight
              ? "border-primary/30 bg-primary-container"
              : "border-outline-variant bg-surface-container-lowest"
          }`}
        >
          <p className="text-[11px] font-semibold text-on-surface-variant">
            {card.label}
          </p>
          <p className={`mt-1 text-lg font-bold ${card.tone}`}>
            {formatCurrency(card.value)}
          </p>
          {"sub" in card && card.sub && (
            <p className="text-[10px] text-on-surface-variant">{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
