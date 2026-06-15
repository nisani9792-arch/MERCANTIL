import { formatCurrency } from "@/lib/utils/format";
import type { FixedRecurringAverages } from "@/lib/db/transactions";

type FixedCashflowCardProps = {
  averages: FixedRecurringAverages;
  currency?: string;
};

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", {
    month: "short",
    year: "2-digit",
  }).format(new Date(y, m - 1, 1));
}

export function FixedCashflowCard({
  averages,
  currency = "ILS",
}: FixedCashflowCardProps) {
  const maxVal = Math.max(
    ...averages.monthlyTrend.flatMap((m) => [m.income, m.expense]),
    1,
  );

  const cards = [
    {
      label: "ממוצע הכנסות קבועות",
      value: averages.avgIncome,
      tone: "text-success",
    },
    {
      label: "ממוצע הוצאות קבועות",
      value: averages.avgExpense,
      tone: "text-error",
    },
    {
      label: "נטו קבוע (ממוצע)",
      value: averages.avgNet,
      tone: averages.avgNet >= 0 ? "text-success" : "text-error",
    },
  ];

  return (
    <section className="m3-card overflow-hidden">
      <div className="border-b border-outline-variant bg-surface-container px-3 py-2 sm:px-4">
        <h2 className="text-sm font-bold text-on-surface">
          תזרים קבוע — ממוצע 6 חודשים
        </h2>
        <p className="text-xs text-on-surface-variant">
          רק פריטים מסומנים כקבועים וחוזרים
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-3 sm:p-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5"
          >
            <p className="text-[11px] font-semibold text-on-surface-variant">
              {card.label}
            </p>
            <p className={`mt-0.5 text-base font-bold sm:text-lg ${card.tone}`}>
              {formatCurrency(card.value, currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-outline-variant px-3 py-3 sm:px-4">
        <p className="mb-2 text-xs font-semibold text-on-surface-variant">
          לפי חודש
        </p>
        <div className="space-y-2">
          {averages.monthlyTrend.map((m) => (
            <div key={m.month} className="flex items-center gap-2 text-xs">
              <span className="w-14 shrink-0 text-on-surface-variant">
                {monthLabel(m.month)}
              </span>
              <div className="flex flex-1 gap-1">
                <div
                  className="h-2 rounded-sm bg-success/70"
                  style={{ width: `${(m.income / maxVal) * 50}%`, minWidth: m.income ? 4 : 0 }}
                  title={`הכנסות: ${formatCurrency(m.income, currency)}`}
                />
                <div
                  className="h-2 rounded-sm bg-error/70"
                  style={{ width: `${(m.expense / maxVal) * 50}%`, minWidth: m.expense ? 4 : 0 }}
                  title={`הוצאות: ${formatCurrency(m.expense, currency)}`}
                />
              </div>
              <span
                className={`w-20 shrink-0 text-left font-medium ${m.net >= 0 ? "text-success" : "text-error"}`}
                dir="ltr"
              >
                {formatCurrency(m.net, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
