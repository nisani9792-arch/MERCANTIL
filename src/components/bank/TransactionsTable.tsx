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
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container px-4 py-2">
        <h2 className="text-sm font-bold text-on-surface">{title}</h2>
        <Link
          href="/transactions"
          className="text-xs font-semibold text-primary hover:underline"
        >
          הצג הכל
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-on-surface-variant">
          אין תנועות עדיין.{" "}
          <Link href="/import" className="font-semibold text-primary">
            ייבא מבנק
          </Link>{" "}
          או{" "}
          <Link href="/transactions?action=add" className="font-semibold text-primary">
            הוסף ידנית
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="bank-table w-full min-w-[520px] text-sm">
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
      )}
    </section>
  );
}
