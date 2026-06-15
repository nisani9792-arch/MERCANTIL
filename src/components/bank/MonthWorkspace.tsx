"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { InitMonthPanel } from "@/components/ledger/InitMonthPanel";
import {
  LedgerBottomSheet,
  type LedgerSheetMode,
} from "@/components/bank/LedgerBottomSheet";
import { TransactionCard } from "@/components/bank/TransactionCard";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import { fetchLive, mutateLive } from "@/lib/api/fetch-live";
import type { MonthlyLedgerEntry } from "@/types/ledger";
import { useMonthStore } from "@/stores/useMonthStore";

type LedgerResponse = {
  entries: MonthlyLedgerEntry[];
  summary: { initialized: boolean };
  monthKey: string;
};

export function MonthWorkspace() {
  const monthKey = useMonthStore((s) => s.monthKey);
  const [sheetMode, setSheetMode] = useState<LedgerSheetMode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ledger", monthKey],
    queryFn: () => fetchLive<LedgerResponse>(`/api/ledger?month=${monthKey}`),
    staleTime: 0,
  });

  async function refetchAll() {
    await Promise.all([
      qc.refetchQueries({ queryKey: ["ledger", monthKey] }),
      qc.refetchQueries({ queryKey: ["analytics", monthKey] }),
      qc.refetchQueries({ queryKey: ["ai-insights", monthKey] }),
    ]);
  }

  const saveMut = useMutation({
    mutationFn: async (payload: {
      id?: string;
      name: string;
      amount: number;
      type: "income" | "expense";
      category: string;
      isVariable: boolean;
    }) => {
      if (payload.id) {
        const res = await mutateLive(`/api/ledger/${payload.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            amount: payload.amount,
            category: payload.category,
          }),
        });
        if (!res.ok) throw new Error("patch failed");
      } else {
        const res = await mutateLive("/api/ledger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthKey,
            name: payload.name,
            type: payload.type,
            amount: payload.amount,
            category: payload.category,
            isVariable: payload.isVariable,
          }),
        });
        if (!res.ok) throw new Error("post failed");
      }
    },
    onSuccess: async () => {
      setSheetOpen(false);
      setSheetMode(null);
      await refetchAll();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await mutateLive(`/api/ledger/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: refetchAll,
  });

  const entries = data?.entries ?? [];
  const income = entries.filter((e) => e.type === "income");
  const expenses = entries.filter((e) => e.type === "expense");

  function openAdd(type: "income" | "expense") {
    setSheetMode({ kind: "add", type });
    setSheetOpen(true);
  }

  function openEdit(entry: MonthlyLedgerEntry) {
    setSheetMode({ kind: "edit", entry });
    setSheetOpen(true);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-24">
      <MonthNavigator />

      <InitMonthPanel
        monthKey={monthKey}
        initialized={data?.summary.initialized ?? false}
      />

      {isLoading && (
        <p className="text-center text-sm text-on-surface-variant">טוען...</p>
      )}

      {data?.summary.initialized && (
        <>
          <CardSection title="הכנסות">
            {income.map((e) => (
              <TransactionCard
                key={e.id}
                entry={e}
                onTap={() => openEdit(e)}
                onDelete={() => deleteMut.mutate(e.id)}
              />
            ))}
          </CardSection>

          <CardSection title="הוצאות">
            {expenses.map((e) => (
              <TransactionCard
                key={e.id}
                entry={e}
                onTap={() => openEdit(e)}
                onDelete={() => deleteMut.mutate(e.id)}
              />
            ))}
          </CardSection>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openAdd("income")}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-success/30 bg-success-container font-semibold text-success"
            >
              <Plus className="h-5 w-5" />
              הכנסה
            </button>
            <button
              type="button"
              onClick={() => openAdd("expense")}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-error/30 bg-error-container font-semibold text-error"
            >
              <Plus className="h-5 w-5" />
              הוצאה
            </button>
          </div>
        </>
      )}

      <LedgerBottomSheet
        open={sheetOpen}
        mode={sheetMode}
        onClose={() => {
          setSheetOpen(false);
          setSheetMode(null);
        }}
        saving={saveMut.isPending}
        onSave={(d) =>
          saveMut.mutate({
            id: sheetMode?.kind === "edit" ? sheetMode.entry.id : undefined,
            ...d,
          })
        }
      />
    </div>
  );
}

function CardSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-bold text-on-surface-variant">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
