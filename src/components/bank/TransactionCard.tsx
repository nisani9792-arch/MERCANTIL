"use client";

import { Banknote, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyLedgerEntry } from "@/types/ledger";
import { cn } from "@/lib/utils/cn";

type TransactionCardProps = {
  entry: MonthlyLedgerEntry;
  onTap: () => void;
  onDelete: () => void;
};

export function TransactionCard({ entry, onTap, onDelete }: TransactionCardProps) {
  const isIncome = entry.type === "income";
  const isWithdrawal = entry.entry_kind === "cash_withdrawal";

  return (
    <article
      className="m3-tx-card grid min-h-[72px] grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest px-3 py-3 shadow-elevation-1 sm:flex sm:gap-3 sm:px-4"
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold",
          isWithdrawal ? "bg-primary-container text-primary" : isIncome ? "bg-success-container text-success" : "bg-error-container text-error",
        )}
      >
        {isWithdrawal ? <Banknote className="h-5 w-5" /> : isIncome ? "↑" : "↓"}
      </div>
      <button type="button" onClick={onTap} className="min-w-0 text-start sm:flex-1" aria-label={`עריכת ${entry.name}`}>
        <p className="truncate text-base font-semibold text-on-surface">{entry.name}</p>
        <p className="text-xs text-on-surface-variant">
          {isWithdrawal ? "העברה בנק ← מזומן" : `${entry.is_variable ? "משתנה" : "קבוע"} · ${entry.payment_method === "cash" ? "מזומן" : entry.payment_method === "card" ? "אשראי" : "בנק"}`}
        </p>
      </button>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button type="button" onClick={onTap} className={cn(
          "shrink-0 rounded-lg px-1.5 py-1 text-sm font-black sm:text-base",
          isWithdrawal ? "text-primary" : isIncome ? "text-success" : "text-on-surface",
        )} dir="ltr" aria-label={`עריכת סכום ${formatCurrency(entry.amount)}`}>
          {formatCurrency(entry.amount)}
        </button>
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onTap(); }} className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary-container sm:flex" aria-label="ערוך שם ופרטים"><Pencil className="h-4 w-4" /></button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
            if (window.confirm('למחוק את הרישום?')) onDelete();
        }}
        className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-error sm:flex"
        aria-label="מחק"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </article>
  );
}
