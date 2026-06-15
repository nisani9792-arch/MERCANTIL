import { formatCurrency } from "@/lib/utils/format";
import type { FinancialSummary } from "@/lib/db/transactions";

type BalanceOverviewProps = {
  summary: FinancialSummary;
  currency?: string;
};

export function BalanceOverview({ summary, currency = "ILS" }: BalanceOverviewProps) {
  const monthLabel = new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  const cards = [
    {
      label: "הכנסות החודש",
      value: summary.monthIncome,
      tone: "text-success",
      sub: monthLabel,
    },
    {
      label: "הוצאות החודש",
      value: summary.monthExpense,
      tone: "text-error",
      sub: "ללא חיובים זמניים",
    },
    {
      label: "נטו החודש",
      value: summary.monthNet,
      tone: summary.monthNet >= 0 ? "text-success" : "text-error",
      sub: "כמה נשאר / חסר",
    },
  ];

  return (
    <section className="m3-card overflow-hidden">
      <div className="border-b border-outline-variant bg-surface-container px-3 py-2 sm:px-4">
        <h2 className="text-sm font-bold text-on-surface">משק בית — סיכום חודשי</h2>
        <p className="text-xs text-on-surface-variant">
          ממוקד בהכנסות והוצאות משמעותיות
        </p>
      </div>
      <div className="grid gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3 sm:border-0 sm:bg-transparent sm:p-0">
          <p className="text-xs text-on-surface-variant sm:text-sm">מאזן כולל</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl lg:text-4xl">
            {formatCurrency(summary.balance, currency)}
          </p>
          <p className="mt-1 text-[11px] text-on-surface-variant sm:mt-2 sm:text-xs">
            הכנסות מצטברות: {formatCurrency(summary.totalIncome, currency)}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5 sm:py-3"
            >
              <p className="text-[11px] font-semibold text-on-surface-variant sm:text-xs">
                {card.label}
              </p>
              <p className={`mt-0.5 text-base font-bold sm:mt-1 sm:text-lg ${card.tone}`}>
                {formatCurrency(card.value, currency)}
              </p>
              <p className="text-[10px] text-on-surface-variant">{card.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
