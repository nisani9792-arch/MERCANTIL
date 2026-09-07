"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus } from "lucide-react";
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
      entryKind: "transaction" | "cash_withdrawal";
      paymentMethod: "bank" | "card" | "cash";
    }) => {
      if (payload.id) {
        const res = await mutateLive(`/api/ledger/${payload.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            amount: payload.amount,
            category: payload.category,
            paymentMethod: payload.paymentMethod,
            isVariable: payload.isVariable,
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
            entryKind: payload.entryKind,
            paymentMethod: payload.paymentMethod,
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
  const paidMut = useMutation({
    mutationFn: async (entry: MonthlyLedgerEntry) => {
      const res = await mutateLive(`/api/ledger/${entry.id}`, {
        method: 'PATCH', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({isPaid: !entry.is_paid}),
      });
      if (!res.ok) throw new Error('לא ניתן לעדכן את הרישום');
    }, onSuccess: refetchAll,
  });
  const income = entries.filter((e) => e.type === "income" && e.entry_kind === "transaction");
  const expenses = entries.filter((e) => e.type === "expense" && e.entry_kind === "transaction");
  const withdrawals = entries.filter((e) => e.entry_kind === "cash_withdrawal");

  function openAdd(type: "income" | "expense" | "cash_withdrawal") {
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
      {(saveMut.isError || deleteMut.isError || paidMut.isError) && <p role="alert" className="m3-error">השמירה נכשלה. הנתונים שהזנת נשמרו בטופס, אפשר לנסות שוב.</p>}
      {entries.some(e => !e.is_paid) && <section className="m3-card p-4 space-y-2"><h2 className="font-bold">תכנון שטרם בוצע</h2><p>סמן רק לאחר שהכסף התקבל או שולם.</p>{entries.filter(e => !e.is_paid).map(e => <button disabled={paidMut.isPending} key={e.id} className="m3-btn-primary px-4 py-2 me-2" onClick={() => paidMut.mutate(e)}>סימון {e.name} כבוצע</button>)}</section>}

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
          {withdrawals.length > 0 && (
            <CardSection title="העברות לארנק מזומן">
              {withdrawals.map((e) => (
                <TransactionCard key={e.id} entry={e} onTap={() => openEdit(e)} onDelete={() => deleteMut.mutate(e.id)} />
              ))}
            </CardSection>
          )}
        </>
      )}

      <section className="m3-card sticky bottom-[4.5rem] z-10 grid grid-cols-3 gap-2 p-2 lg:bottom-2">
        <QuickButton label="הוצאה" icon={<Plus className="h-5 w-5" />} tone="expense" onClick={() => openAdd("expense")} />
        <QuickButton label="הכנסה" icon={<Plus className="h-5 w-5" />} tone="income" onClick={() => openAdd("income")} />
        <QuickButton label="משיכת מזומן" icon={<Banknote className="h-5 w-5" />} tone="cash" onClick={() => openAdd("cash_withdrawal")} />
      </section>

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

function QuickButton({ label, icon, tone, onClick }: { label: string; icon: ReactNode; tone: "expense" | "income" | "cash"; onClick: () => void }) {
  const styles = tone === "expense"
    ? "border-error/30 bg-error-container text-error"
    : tone === "income"
      ? "border-success/30 bg-success-container text-success"
      : "border-primary/30 bg-primary-container text-primary";
  return (
    <button type="button" onClick={onClick} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl border px-1 text-xs font-bold ${styles}`}>
      {icon}{label}
    </button>
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
