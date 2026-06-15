"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { TransactionWithCategory } from "@/types";
import { cn } from "@/lib/utils/cn";

type TransactionsTableProps = {
  transactions: TransactionWithCategory[];
  title?: string;
  showAiBadge?: boolean;
  compact?: boolean;
};

export function TransactionsTable({
  transactions,
  title = "תנועות אחרונות",
  showAiBadge = true,
  compact = false,
}: TransactionsTableProps) {
  return (
    <section className="m3-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container px-3 py-2 sm:px-4">
        <h2 className="text-sm font-bold text-on-surface">{title}</h2>
        <Link
          href="/transactions"
          className="min-h-[44px] content-center text-xs font-semibold text-primary hover:underline"
        >
          הצג הכל
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-on-surface-variant">
          אין תנועות עדיין.{" "}
          <Link href="/transactions?action=add" className="font-semibold text-primary">
            הוסף ידנית
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="divide-y divide-outline-variant md:hidden">
            {transactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                tx={tx}
                compact={compact}
                showAiBadge={showAiBadge}
              />
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="bank-table w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant">
                  <th className="px-4 py-2 text-start font-semibold">תאריך</th>
                  <th className="px-4 py-2 text-start font-semibold">תיאור</th>
                  {!compact && (
                    <th className="px-4 py-2 text-start font-semibold">קטגוריה</th>
                  )}
                  <th className="px-4 py-2 text-end font-semibold">זכות/חובה</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isIncome = tx.category?.type === "income";
                  const signed = isIncome ? tx.amount : -tx.amount;
                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-outline-variant/60 transition-colors hover:bg-surface-container-low"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 text-on-surface-variant">
                        {formatDate(tx.date)}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2.5">
                        <span className="text-on-surface">
                          {tx.notes || tx.account_source}
                        </span>
                        {showAiBadge && tx.account_source === "ייבוא AI" && (
                          <Sparkles className="ms-1 inline h-3 w-3 text-secondary" />
                        )}
                      </td>
                      {!compact && (
                        <td className="px-4 py-2.5">
                          <span className="rounded-full bg-primary-container px-2 py-0.5 text-xs font-medium text-primary">
                            {tx.category?.name}
                          </span>
                        </td>
                      )}
                      <td
                        className={cn(
                          "whitespace-nowrap px-4 py-2.5 text-end font-semibold tabular-nums",
                          signed >= 0 ? "text-success" : "text-error",
                        )}
                        dir="ltr"
                      >
                        {formatCurrency(signed)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function TransactionCard({
  tx,
  compact,
  showAiBadge,
}: {
  tx: TransactionWithCategory;
  compact: boolean;
  showAiBadge: boolean;
}) {
  const isIncome = tx.category?.type === "income";
  const signed = isIncome ? tx.amount : -tx.amount;

  return (
    <li className="flex items-start gap-3 px-3 py-3 active:bg-surface-container-low">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-on-surface">
          {tx.notes || tx.account_source}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
          <span>{formatDate(tx.date)}</span>
          {!compact && tx.category?.name && (
            <span className="rounded-full bg-primary-container px-2 py-0.5 font-medium text-primary">
              {tx.category.name}
            </span>
          )}
          {showAiBadge && tx.account_source === "ייבוא AI" && (
            <Sparkles className="h-3 w-3 text-secondary" />
          )}
        </div>
      </div>
      <p
        className={cn(
          "shrink-0 text-sm font-bold tabular-nums",
          signed >= 0 ? "text-success" : "text-error",
        )}
        dir="ltr"
      >
        {formatCurrency(signed)}
      </p>
    </li>
  );
}
