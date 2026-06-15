"use client";

import { Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyLedgerEntry } from "@/types/ledger";
import { cn } from "@/lib/utils/cn";

type FixedExpenseListProps = {
  entries: MonthlyLedgerEntry[];
  onMarkPaid: (id: string, isPaid: boolean) => void;
  pending?: boolean;
};

export function FixedExpenseList({
  entries,
  onMarkPaid,
  pending,
}: FixedExpenseListProps) {
  const fixed = entries.filter((e) => e.type === "expense" && !e.is_variable);

  if (fixed.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-bold text-on-surface-variant">
        הוצאות קבועות — החודש
      </h2>
      <ul className="space-y-2">
        {fixed.map((entry) => (
          <li
            key={entry.id}
            className={cn(
              "flex min-h-[56px] items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-elevation-1",
              entry.is_paid
                ? "border-success/30 bg-success-container/20"
                : "border-outline-variant bg-surface-container-lowest",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-on-surface">
                {entry.name}
              </p>
              <p className="text-xs text-on-surface-variant" dir="ltr">
                {formatCurrency(entry.amount)}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => onMarkPaid(entry.id, !entry.is_paid)}
              className={cn(
                "flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold",
                entry.is_paid
                  ? "bg-success text-on-primary"
                  : "border border-primary/40 bg-primary-container text-primary",
              )}
            >
              <Check className="h-4 w-4" />
              {entry.is_paid ? "שולם" : "סמן שולם"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
