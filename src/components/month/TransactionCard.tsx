"use client";

import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyLedgerEntry } from "@/types/ledger";

type TransactionCardProps = {
  entry: MonthlyLedgerEntry;
  onTap: () => void;
  onDelete: () => void;
};

export function TransactionCard({ entry, onTap, onDelete }: TransactionCardProps) {
  const isIncome = entry.type === "income";

  return (
    <article
      className="m3-tx-card flex min-h-[72px] items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-elevation-1 transition-transform active:scale-[0.98]"
      onClick={onTap}
      onKeyDown={(e) => e.key === "Enter" && onTap()}
      role="button"
      tabIndex={0}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${
          isIncome ? "bg-success-container text-success" : "bg-error-container text-error"
        }`}
      >
        {isIncome ? "↑" : "↓"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-on-surface">{entry.name}</p>
        <p className="text-xs text-on-surface-variant">
          {entry.category}
          {entry.is_variable ? " · משתנה" : ""}
        </p>
      </div>
      <p
        className={`shrink-0 text-base font-bold ${isIncome ? "text-success" : "text-on-surface"}`}
        dir="ltr"
      >
        {formatCurrency(entry.amount)}
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-error"
        aria-label="מחק"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </article>
  );
}
