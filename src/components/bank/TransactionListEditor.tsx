"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Category, TransactionWithCategory } from "@/types";

export function TransactionListEditor() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await fetch("/api/transactions?limit=100");
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{ transactions: TransactionWithCategory[] }>;
    },
  });

  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{ categories: Category[] }>;
    },
  });

  const patchMut = useMutation({
    mutationFn: async ({
      id,
      categoryId,
      isFixedRecurring,
    }: {
      id: string;
      categoryId?: string;
      isFixedRecurring?: boolean;
    }) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, isFixedRecurring }),
      });
      if (!res.ok) throw new Error("patch failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const transactions = data?.transactions ?? [];
  const categories = catData?.categories ?? [];

  if (isLoading) {
    return (
      <p className="text-center text-sm text-on-surface-variant">טוען...</p>
    );
  }

  if (!transactions.length) {
    return (
      <p className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
        אין רישומים עדיין
      </p>
    );
  }

  return (
    <section className="m3-card overflow-hidden">
      <div className="border-b border-outline-variant bg-surface-container px-3 py-2 sm:px-4">
        <h2 className="text-sm font-bold text-on-surface">רישומים אחרונים</h2>
        <p className="text-xs text-on-surface-variant">
          עריכת קטגוריה או סימון קבוע — המערכת לומדת מהתיקונים
        </p>
      </div>

      <ul className="divide-y divide-outline-variant">
        {transactions.map((tx) => {
          const isIncome = tx.category?.type === "income";
          const sameTypeCats = categories.filter(
            (c) => c.type === tx.category?.type,
          );

          return (
            <li
              key={tx.id}
              className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-on-surface">
                  {tx.notes || tx.account_source}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {formatDate(tx.date)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="m3-input max-w-[140px] px-2 py-1.5 text-xs"
                  value={tx.category_id}
                  disabled={patchMut.isPending}
                  onChange={(e) =>
                    patchMut.mutate({ id: tx.id, categoryId: e.target.value })
                  }
                >
                  {sameTypeCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  title="קבוע וחוזר"
                  disabled={patchMut.isPending}
                  onClick={() =>
                    patchMut.mutate({
                      id: tx.id,
                      isFixedRecurring: !tx.is_fixed_recurring,
                    })
                  }
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                    tx.is_fixed_recurring
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-outline-variant text-on-surface-variant"
                  }`}
                >
                  <Pin className="h-4 w-4" />
                </button>

                <span
                  className={`min-w-[80px] text-left text-sm font-bold ${isIncome ? "text-success" : "text-error"}`}
                  dir="ltr"
                >
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
