"use client";
/* eslint-disable react-hooks/set-state-in-effect -- deep-link action intentionally opens the requested editor */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { InitMonthPanel } from "@/components/ledger/InitMonthPanel";
import {
  LedgerBottomSheet,
  type LedgerSheetMode,
} from "@/components/bank/LedgerBottomSheet";
import { TransactionCard } from "@/components/bank/TransactionCard";
import { SmartEntryBar } from "@/components/bank/SmartEntryBar";
import { BudgetStrip } from "@/components/bank/BudgetStrip";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import { fetchLive, mutateLive } from "@/lib/api/fetch-live";
import type { MonthSummary, MonthlyLedgerEntry } from "@/types/ledger";
import { useMonthStore } from "@/stores/useMonthStore";

type LedgerResponse = {
  entries: MonthlyLedgerEntry[];
  summary: MonthSummary;
  monthKey: string;
};

export function MonthWorkspace() {
  const monthKey = useMonthStore((s) => s.monthKey);
  const [sheetMode, setSheetMode] = useState<LedgerSheetMode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
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
        const data = await res.json().catch(() => ({})) as { entry?: MonthlyLedgerEntry; error?: string };
        if (!res.ok || !data.entry) throw new Error(data.error || "השמירה לא אושרה על ידי השרת");
        return data.entry;
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
        const data = await res.json().catch(() => ({})) as { entry?: MonthlyLedgerEntry; error?: string };
        if (!res.ok || !data.entry) throw new Error(data.error || "השמירה לא אושרה על ידי השרת");
        return data.entry;
      }
    },
    onSuccess: async (savedEntry) => {
      qc.setQueryData<LedgerResponse>(["ledger", monthKey], (current) => {
        if (!current) return current;
        const exists = current.entries.some((entry) => entry.id === savedEntry.id);
        return {
          ...current,
          entries: exists
            ? current.entries.map((entry) => entry.id === savedEntry.id ? savedEntry : entry)
            : [...current.entries, savedEntry],
        };
      });
      setSheetOpen(false);
      setSheetMode(null);
      setSaveMessage("השינויים נשמרו בהצלחה");
      window.setTimeout(() => setSaveMessage(""), 2500);
      await refetchAll();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await mutateLive(`/api/ledger/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: async () => {
      setSheetOpen(false);
      setSheetMode(null);
      await refetchAll();
    },
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "add") {
      openAdd(params.get("kind") === "income" ? "income" : params.get("kind") === "cash" ? "cash_withdrawal" : "expense");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">ניהול שוטף</p><h1 className="mt-1 text-2xl font-black">תנועות החודש</h1></div><div className="sm:w-72"><MonthNavigator /></div></div>
      <SmartEntryBar onParsed={(mode) => { setSheetMode(mode); setSheetOpen(true); }} />
      {saveMessage && <p role="status" className="rounded-xl bg-success-container px-4 py-3 text-sm font-bold text-success">{saveMessage}</p>}
      {(saveMut.isError || deleteMut.isError || paidMut.isError) && <p role="alert" className="m3-error">השמירה נכשלה. הנתונים שהזנת נשמרו בטופס, אפשר לנסות שוב.</p>}
      <InitMonthPanel
        monthKey={monthKey}
        initialized={data?.summary.initialized ?? false}
      />

      {data?.summary.initialized && <BudgetStrip summary={data.summary} />}

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
                onTogglePaid={() => paidMut.mutate(e)}
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
                onTogglePaid={() => paidMut.mutate(e)}
              />
            ))}
          </CardSection>
          {withdrawals.length > 0 && (
            <CardSection title="העברות לארנק מזומן">
              {withdrawals.map((e) => (
                <TransactionCard key={e.id} entry={e} onTap={() => openEdit(e)} onDelete={() => deleteMut.mutate(e.id)} onTogglePaid={() => paidMut.mutate(e)} />
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
        storageScope={monthKey}
        onClose={() => {
          setSheetOpen(false);
          setSheetMode(null);
        }}
        onDelete={sheetMode?.kind === "edit" ? async () => {
          await deleteMut.mutateAsync(sheetMode.entry.id);
        } : undefined}
        saving={saveMut.isPending}
        error={saveMut.isError ? saveMut.error.message : undefined}
        onSave={async (d) => {
          await saveMut.mutateAsync({
            id: sheetMode?.kind === "edit" ? sheetMode.entry.id : undefined,
            ...d,
          });
        }}
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
