"use client";

import { Check, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyLedgerEntry } from "@/types/ledger";
import { cn } from "@/lib/utils/cn";

type TransactionCardProps = {
  entry: MonthlyLedgerEntry;
  onTap: () => void;
  onDelete: () => void;
  onMarkPaid?: () => void;
};

export function TransactionCard({
  entry,
  onTap,
  onDelete,
  onMarkPaid,
}: TransactionCardProps) {
  const isIncome = entry.type === "income";
  const isFixedExpense = entry.type === "expense" && !entry.is_variable;

  return (
    <article
      className={cn(
        "m3-tx-card flex min-h-[80px] items-center gap-2 rounded-2xl border px-3 py-3 shadow-elevation-1 transition-transform active:scale-[0.98] sm:gap-3 sm:px-4",
        entry.is_paid
          ? "border-success/30 bg-success-container/30"
          : "border-outline-variant bg-surface-container-lowest",
      )}
      onClick={onTap}
      onKeyDown={(e) => e.key === "Enter" && onTap()}
      role="button"
      tabIndex={0}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold",
          isIncome ? "bg-success-container text-success" : "bg-error-container text-error",
        )}
      >
        {isIncome ? "↑" : "↓"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-on-surface">{entry.name}</p>
        <p className="text-xs text-on-surface-variant">
          {entry.is_variable ? "משתנה" : "קבוע"}
          {entry.is_paid ? " · שולם" : ""}
        </p>
      </div>
      <p
        className={cn(
          "shrink-0 text-base font-bold sm:text-lg",
          isIncome ? "text-success" : "text-on-surface",
        )}
        dir="ltr"
      >
        {formatCurrency(entry.amount)}
      </p>
      {isFixedExpense && onMarkPaid && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMarkPaid();
          }}
          className={cn(
            "flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold",
            entry.is_paid
              ? "bg-success text-on-primary"
              : "border border-outline-variant bg-surface-container text-on-surface-variant",
          )}
          aria-label={entry.is_paid ? "שולם" : "סמן כשולם"}
        >
          <Check className="h-4 w-4" />
          <span className="hidden min-[380px]:inline">
            {entry.is_paid ? "שולם" : "שולם?"}
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-error"
        aria-label="מחק"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </article>
  );
}
