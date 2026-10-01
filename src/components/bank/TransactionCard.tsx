"use client";

import { Banknote, Check, Clock3, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyLedgerEntry } from "@/types/ledger";
import { cn } from "@/lib/utils/cn";
import { paymentStatus, statusLabel } from "@/lib/ledger/payment-status";

type TransactionCardProps = {
  entry: MonthlyLedgerEntry;
  onTap: () => void;
  onDelete: () => void;
  onTogglePaid?: () => void;
};

export function TransactionCard({ entry, onTap, onDelete, onTogglePaid }: TransactionCardProps) {
  const isIncome = entry.type === "income";
  const isWithdrawal = entry.entry_kind === "cash_withdrawal";
  const status = paymentStatus(entry);
  const completed = status === "completed";

  return (
    <article
      className={cn("m3-tx-card grid min-h-[72px] grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border bg-surface-container-lowest px-3 py-3 shadow-elevation-1 sm:flex sm:gap-3 sm:px-4", isIncome ? "border-success/30 shadow-[0_6px_20px_rgba(46,125,50,.10)]" : "border-error/25 shadow-[0_6px_20px_rgba(186,26,26,.08)]")}
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
        <p className={cn("mt-1 text-xs font-bold", completed ? "text-success" : status === "overdue" ? "text-error" : "text-primary")}>
          {statusLabel(status)}{entry.due_date ? ` · ${new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" }).format(new Date(`${entry.due_date}T00:00:00`))}` : ""}
        </p>
      </button>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {onTogglePaid && <button type="button" onClick={(e) => { e.stopPropagation(); onTogglePaid(); }} className={cn("flex h-10 min-w-10 items-center justify-center rounded-xl border px-2 text-xs font-bold", completed ? "border-success/40 bg-success-container text-success" : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary")} aria-label={completed ? `ביטול אישור ביצוע עבור ${entry.name}` : `אישור ביצוע עבור ${entry.name}`} title={completed ? "סמן כטרם בוצע" : "אישור ביצוע"}>
          {completed ? <Check className="h-5 w-5" /> : status === "overdue" ? <Clock3 className="h-5 w-5" /> : <RotateCcw className="h-4 w-4" />}
        </button>}
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
