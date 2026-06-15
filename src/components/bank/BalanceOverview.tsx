import { formatCurrency } from "@/lib/utils/format";
import type { FinancialSummary } from "@/lib/db/transactions";

type BalanceOverviewProps = {
  summary: FinancialSummary;
  currency?: string;
};

export function BalanceOverview({ summary, currency = "ILS" }: BalanceOverviewProps) {
  const tiles = [
    {
      label: "כרטיסי אשראי",
      value: summary.monthExpense * 0.12,
      sub: "חיוב קרוב",
    },
    {
      label: "הלוואות",
      value: 0,
      sub: "יתרה",
    },
    {
      label: "תיק ני״ע",
      value: 0,
      sub: "שווי",
    },
    {
      label: "פיקדונות וחסכונות",
      value: summary.depositsTotal,
      sub: "יתרה",
    },
  ];

  return (
    <section className="m3-card overflow-hidden">
      <div className="border-b border-outline-variant bg-surface-container px-4 py-2">
        <h2 className="text-sm font-bold text-on-surface">מצב חשבון</h2>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-sm text-on-surface-variant">יתרה בחשבון</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-primary lg:text-4xl">
            {formatCurrency(summary.balance, currency)}
          </p>
          <p className="mt-2 text-xs text-on-surface-variant">
            נטו החודש:{" "}
            <span className={summary.monthNet >= 0 ? "text-success" : "text-error"}>
              {formatCurrency(summary.monthNet, currency)}
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 transition-colors hover:border-primary/20"
            >
              <p className="text-[10px] font-semibold text-on-surface-variant sm:text-xs">
                {tile.label}
              </p>
              <p className="mt-0.5 text-sm font-bold text-on-surface">
                {formatCurrency(tile.value, currency)}
              </p>
              <p className="text-[10px] text-on-surface-variant">{tile.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
