"use client";

import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyLedgerEntry } from "@/types/ledger";

type LedgerRowProps = {
  entry: MonthlyLedgerEntry;
  onAmountChange: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
};

export function LedgerRow({
  entry,
  onAmountChange,
  onDelete,
  disabled,
}: LedgerRowProps) {
  const isIncome = entry.type === "income";

  return (
    <li className="m3-ledger-row flex items-center gap-2 border-b border-outline-variant px-3 py-2.5 last:border-0 sm:px-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-on-surface">
          {entry.name}
        </p>
        <p className="text-[10px] text-on-surface-variant">
          {entry.is_variable
            ? "משתנה"
            : entry.is_from_template
              ? "מתבנית"
              : "קבוע"}
        </p>
      </div>
      <input
        type="number"
        className="m3-input w-24 px-2 py-1.5 text-sm"
        value={entry.amount}
        disabled={disabled}
        onChange={(e) => onAmountChange(entry.id, Number(e.target.value))}
        dir="ltr"
      />
      <span
        className={`hidden w-20 text-left text-xs font-semibold sm:block ${isIncome ? "text-success" : "text-error"}`}
        dir="ltr"
      >
        {formatCurrency(entry.amount)}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDelete(entry.id)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
        aria-label="מחק"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
