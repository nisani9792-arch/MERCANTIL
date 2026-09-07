"use client";

import { Banknote, CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyLedgerEntry } from "@/types/ledger";
import { cn } from "@/lib/utils/cn";

type TransactionCardProps = {
  entry: MonthlyLedgerEntry;
  onTap: () => void;
  onDelete: () => void;
  onTogglePaid?: () => void;
};

export function TransactionCard({ entry, onTap, onDelete, onTogglePaid }: TransactionCardProps) {
  const isIncome = entry.type === "income";
  const isWithdrawal = entry.entry_kind === "cash_withdrawal";

  return (
    <article
      className="m3-tx-card flex min-h-[72px] items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-3 py-3 shadow-elevation-1 transition-transform active:scale-[0.98] sm:px-4"
      onClick={onTap}
      onKeyDown={(e) => e.key === "Enter" && onTap()}
      role="button"
      tabIndex={0}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold",
          isWithdrawal ? "bg-primary-container text-primary" : isIncome ? "bg-success-container text-success" : "bg-error-container text-error",
        )}
      >
        {isWithdrawal ? <Banknote className="h-5 w-5" /> : isIncome ? "↑" : "↓"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-on-surface">{entry.name}</p>
        <p className="text-xs text-on-surface-variant">
          {isWithdrawal ? "העברה בנק ← מזומן" : `${entry.is_variable ? "משתנה" : "קבוע"} · ${entry.payment_method === "cash" ? "מזומן" : entry.payment_method === "card" ? "אשראי" : "בנק"}`}
        </p>
      </div>
      <p
        className={cn(
          "shrink-0 text-base font-bold",
          isWithdrawal ? "text-primary" : isIncome ? "text-success" : "text-on-surface",
        )}
        dir="ltr"
      >
        {formatCurrency(entry.amount)}
      </p>
      {onTogglePaid && <button type="button" onClick={(e) => { e.stopPropagation(); onTogglePaid(); }} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${entry.is_paid ? "bg-success-container text-success" : "bg-surface-container text-on-surface-variant"}`} aria-label={entry.is_paid ? "סומן כבוצע" : "סמן כבוצע"}>{entry.is_paid ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</button>}
      <button type="button" onClick={(e) => { e.stopPropagation(); onTap(); }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary-container" aria-label="ערוך שם ופרטים"><Pencil className="h-4 w-4" /></button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
            if (window.confirm('למחוק את הרישום?')) onDelete();
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-error"
        aria-label="מחק"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </article>
  );
}
