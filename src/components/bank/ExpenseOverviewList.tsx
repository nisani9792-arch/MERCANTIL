"use client";

import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyLedgerEntry } from "@/types/ledger";
import { cn } from "@/lib/utils/cn";

type ExpenseOverviewListProps = {
  entries: MonthlyLedgerEntry[];
  totalIncome: number;
};

export function ExpenseOverviewList({ entries, totalIncome }: ExpenseOverviewListProps) {
  const income = entries.filter((e) => e.type === "income");
  const expenses = [...entries.filter((e) => e.type === "expense")].sort(
    (a, b) => b.amount - a.amount,
  );

  return (
    <section className="m3-card overflow-hidden">
      <div className="border-b border-outline-variant px-4 py-3">
        <h2 className="text-sm font-bold text-on-surface">תמונת מצב — הכנסות והוצאות</h2>
      </div>
      <ul className="divide-y divide-outline-variant/60">
        {income.map((e) => (
          <LineRow
            key={e.id}
            name={e.name}
            amount={e.amount}
            badge="הכנסה"
            badgeTone="bg-success-container text-success"
            pct={totalIncome > 0 ? (e.amount / totalIncome) * 100 : 0}
            positive
          />
        ))}
        {expenses.map((e) => (
          <LineRow
            key={e.id}
            name={e.name}
            amount={e.amount}
            badge={e.is_variable ? "משתנה" : "קבוע"}
            badgeTone={
              e.is_variable
                ? "bg-warning-container text-warning"
                : "bg-surface-container text-on-surface-variant"
            }
            pct={totalIncome > 0 ? (e.amount / totalIncome) * 100 : 0}
          />
        ))}
      </ul>
    </section>
  );
}

function LineRow({
  name,
  amount,
  badge,
  badgeTone,
  pct,
  positive,
}: {
  name: string;
  amount: number;
  badge: string;
  badgeTone: string;
  pct: number;
  positive?: boolean;
}) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-on-surface">{name}</p>
            <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold", badgeTone)}>
              {badge}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container">
            <div
              className={cn("h-full rounded-full", positive ? "bg-success" : "bg-error/70")}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
        <p
          className={cn("shrink-0 text-sm font-bold", positive ? "text-success" : "text-on-surface")}
          dir="ltr"
        >
          {formatCurrency(amount)}
        </p>
      </div>
      <p className="mt-1 text-[10px] text-on-surface-variant" dir="ltr">
        {pct.toFixed(0)}% מההכנסה
      </p>
    </li>
  );
}
