import { formatCurrency } from "@/lib/utils/format";
import Link from "next/link";
import type { CategoryMonthlyRow } from "@/lib/db/transactions";
import { cn } from "@/lib/utils/cn";

type CategoryMonthlyOverviewProps = {
  income: CategoryMonthlyRow[];
  expenses: CategoryMonthlyRow[];
  monthIncome: number;
  monthExpense: number;
};

export function CategoryMonthlyOverview({
  income,
  expenses,
  monthIncome,
  monthExpense,
}: CategoryMonthlyOverviewProps) {
  return (
    <div className="space-y-4">
      <CategorySection
        title="הכנסות החודש"
        type="income"
        rows={income}
        total={monthIncome}
      />
      <CategorySection
        title="הוצאות קבועות / חודשיות"
        type="expense"
        rows={expenses}
        total={monthExpense}
      />
    </div>
  );
}

function CategorySection({
  title,
  type,
  rows,
  total,
}: {
  title: string;
  type: "income" | "expense";
  rows: CategoryMonthlyRow[];
  total: number;
}) {
  const isIncome = type === "income";

  return (
    <section className="m3-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container px-3 py-2 sm:px-4">
        <h2 className="text-sm font-bold text-on-surface">{title}</h2>
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            isIncome ? "text-success" : "text-error",
          )}
          dir="ltr"
        >
          {formatCurrency(total)}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-on-surface-variant">
          עדיין אין רישום החודש.{" "}
          <Link href="/transactions?action=add" className="font-semibold text-primary">
            הוסף ידנית
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant">
          {rows.map((row) => {
            const pct = total > 0 ? Math.round((row.total / total) * 100) : 0;
            return (
              <li key={row.categoryId} className="px-3 py-3 sm:px-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-on-surface">
                    {row.categoryName}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-bold tabular-nums",
                      isIncome ? "text-success" : "text-error",
                    )}
                    dir="ltr"
                  >
                    {formatCurrency(row.total)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isIncome ? "bg-success/70" : "bg-error/60",
                    )}
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-on-surface-variant">
                  {pct}% מה{type === "income" ? "הכנסות" : "ההוצאות"} · {row.count}{" "}
                  {row.count === 1 ? "רישום" : "רישומים"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
