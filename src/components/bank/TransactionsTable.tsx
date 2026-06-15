"use client";

import { TransactionCard } from "@/components/bank/TransactionCard";
import type { MonthlyLedgerEntry } from "@/types/ledger";

type TransactionsTableProps = {
  entries: MonthlyLedgerEntry[];
  title?: string;
  onTap?: (entry: MonthlyLedgerEntry) => void;
  onDelete?: (id: string) => void;
};

export function TransactionsTable({
  entries,
  title = "רישומי חודש",
  onTap,
  onDelete,
}: TransactionsTableProps) {
  return (
    <section className="m3-card overflow-hidden">
      <div className="border-b border-outline-variant bg-surface-container px-3 py-2 sm:px-4">
        <h2 className="text-sm font-bold text-on-surface">{title}</h2>
      </div>

      {entries.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-on-surface-variant">
          אין רישומים לחודש זה
        </div>
      ) : (
        <ul className="space-y-2 p-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <TransactionCard
                entry={entry}
                onTap={() => onTap?.(entry)}
                onDelete={() => onDelete?.(entry.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
