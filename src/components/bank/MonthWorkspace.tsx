"use client";
/* eslint-disable react-hooks/set-state-in-effect -- deep-link action intentionally opens the requested editor */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CalendarClock, LayoutTemplate, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { paymentStatus } from "@/lib/ledger/payment-status";
import { ExpenseCategoryGroups } from "@/components/bank/ExpenseCategoryGroups";
import { CardSection, QuickButton } from "@/components/bank/MonthWorkspacePrimitives";
import { BankReconciliationPanel } from "@/components/bank/BankReconciliationPanel";
import { CashflowCyclePanel } from "@/components/bank/CashflowCyclePanel";
import { OpenItemsRollover } from "@/components/bank/OpenItemsRollover";
import { PeriodCorrectionCard } from "@/components/bank/PeriodCorrectionCard";

type LedgerResponse = {
  entries: MonthlyLedgerEntry[];
  summary: MonthSummary;
  monthKey: string;
  categoryOrder: string[];
};

export function MonthWorkspace() {
  const monthKey = useMonthStore((s) => s.monthKey);
  const [sheetMode, setSheetMode] = useState<LedgerSheetMode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const messageTimer = useRef<number | null>(null);
  const qc = useQueryClient();

  const showSaveMessage = useCallback((message: string, duration = 2500) => {
    if (messageTimer.current) window.clearTimeout(messageTimer.current);
    setSaveMessage(message);
    messageTimer.current = window.setTimeout(() => {
      setSaveMessage("");
      messageTimer.current = null;
    }, duration);
  }, []);

  useEffect(() => () => {
    if (messageTimer.current) window.clearTimeout(messageTimer.current);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["ledger", monthKey],
    queryFn: () => fetchLive<LedgerResponse>(`/api/ledger?month=${monthKey}`),
    staleTime: 0,
  });

  async function refetchAll() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["ledger-history", monthKey] }),
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
      amountPending: boolean;
      type: "income" | "expense";
      category: string;
      isVariable: boolean;
      entryKind: "transaction" | "cash_withdrawal";
      paymentMethod: "bank" | "card" | "cash";
      dueDate: string | null;
    }) => {
      if (payload.id) {
        const res = await mutateLive(`/api/ledger/${payload.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            amount: payload.amount,
            amountPending: payload.amountPending,
            category: payload.category,
            paymentMethod: payload.paymentMethod,
            isVariable: payload.isVariable,
            dueDate: payload.dueDate,
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
            amountPending: payload.amountPending,
            category: payload.category,
            isVariable: payload.isVariable,
            entryKind: payload.entryKind,
            paymentMethod: payload.paymentMethod,
            dueDate: payload.dueDate,
          }),
        });
        const data = await res.json().catch(() => ({})) as { entry?: MonthlyLedgerEntry; error?: string };
        if (!res.ok || !data.entry) throw new Error(data.error || "השמירה לא אושרה על ידי השרת");
        return data.entry;
      }
    },
    onSuccess: (savedEntry) => {
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
      showSaveMessage("השינויים נשמרו בהצלחה");
      // A secondary chart/AI refresh must never turn a successful database
      // write into a false "save failed" state.
      void Promise.allSettled([
        qc.refetchQueries({ queryKey: ["ledger", monthKey] }),
        qc.invalidateQueries({ queryKey: ["analytics", monthKey] }),
        qc.invalidateQueries({ queryKey: ["ai-insights", monthKey] }),
        qc.invalidateQueries({ queryKey: ["cashflow-cycle", monthKey] }),
      ]);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await mutateLive(`/api/ledger/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => {
      setSheetOpen(false);
      setSheetMode(null);
      void refetchAll();
    },
  });

  const togglePaidMut = useMutation({
    mutationFn: async (entry: MonthlyLedgerEntry) => {
      const res = await mutateLive(`/api/ledger/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: !entry.is_paid }),
      });
      const result = await res.json().catch(() => ({})) as { entry?: MonthlyLedgerEntry; error?: string };
      if (!res.ok || !result.entry) throw new Error(result.error || "אישור הביצוע לא נשמר");
      return result.entry;
    },
    onSuccess: (savedEntry) => {
      qc.setQueryData<LedgerResponse>(["ledger", monthKey], (current) => current ? { ...current, entries: current.entries.map((entry) => entry.id === savedEntry.id ? savedEntry : entry) } : current);
      setSheetMode((current) => current?.kind === "edit" && current.entry.id === savedEntry.id ? { kind: "edit", entry: savedEntry } : current);
      showSaveMessage(savedEntry.is_paid ? "סומן כבוצע ונשמר" : "הוחזר למצב מתוכנן");
      void refetchAll();
    },
  });

  const createTemplateMut = useMutation({
    mutationFn: async ({ entryId, frequency, dayOfMonth }: { entryId: string; frequency: "monthly" | "bi-monthly"; dayOfMonth: number | null }) => {
      const res = await mutateLive(`/api/ledger/${entryId}/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency, dayOfMonth }),
      });
      const result = await res.json().catch(() => ({})) as { created?: boolean; error?: string };
      if (!res.ok || typeof result.created !== "boolean") throw new Error(result.error || "יצירת התבנית לא אושרה על ידי השרת");
      return { created: result.created };
    },
    onSuccess: (result) => {
      showSaveMessage(result.created ? "התבנית נשמרה בספריית הפריטים" : "כבר קיימת תבנית עבור תנועה זו");
      void qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  const categoryOrderMut = useMutation({
    mutationFn: async (categoryOrder: string[]) => {
      const res = await mutateLive("/api/ledger/category-order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey, categoryOrder }),
      });
      const result = await res.json().catch(() => ({})) as { categoryOrder?: string[]; error?: string };
      if (!res.ok || !Array.isArray(result.categoryOrder)) throw new Error(result.error || "סדר הקטגוריות לא נשמר");
      return result.categoryOrder;
    },
    onSuccess: (categoryOrder) => {
      qc.setQueryData<LedgerResponse>(["ledger", monthKey], (current) => current ? { ...current, categoryOrder } : current);
    },
  });

  const monthTemplateMut = useMutation({
    mutationFn: async () => {
      const res = await mutateLive("/api/ledger/month-template", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthKey }) });
      const result = await res.json().catch(() => ({})) as { created?: number; error?: string };
      if (!res.ok || typeof result.created !== "number") throw new Error(result.error || "שמירת התבנית נכשלה");
      return result.created;
    },
    onSuccess: (created) => {
      showSaveMessage(created ? `נוצרו ${created} תבניות לחודשים הבאים` : "כל תנועות החודש כבר שמורות כתבנית", 3000);
      void qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  const entries = data?.entries ?? [];
  const income = entries.filter((e) => e.type === "income" && e.entry_kind === "transaction");
  const expenses = entries.filter((e) => e.type === "expense" && e.entry_kind === "transaction");
  const withdrawals = entries.filter((e) => e.entry_kind === "cash_withdrawal");
  const upcoming = entries.filter((e) => e.entry_kind === "transaction" && e.type === "expense" && paymentStatus(e) === "upcoming");

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">התכנון החודשי</p><h1 className="mt-1 text-2xl font-black">החודש שלי</h1></div><div className="flex gap-2 sm:w-auto"><div className="min-w-0 flex-1 sm:w-72"><MonthNavigator /></div></div></div>
      <details className="rounded-2xl border border-outline-variant p-3"><summary className="cursor-pointer py-1 text-sm font-bold text-on-surface-variant">הוספה בטקסט חופשי</summary><div className="mt-3"><SmartEntryBar onParsed={(mode) => { setSheetMode(mode); setSheetOpen(true); }} /></div></details>
      {saveMessage && <p role="status" className="rounded-xl bg-success-container px-4 py-3 text-sm font-bold text-success">{saveMessage}</p>}
      {(saveMut.isError || deleteMut.isError) && <p role="alert" className="m3-error">השמירה לא אושרה. הנתונים נשארו בטופס — נסה שוב.</p>}
      {categoryOrderMut.isError && <p role="alert" className="m3-error">סדר הקטגוריות לא נשמר. אפשר לנסות לגרור שוב.</p>}
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
          {upcoming.length > 0 && <CardSection title="הוצאות קרובות · 7 ימים" icon={<CalendarClock className="h-4 w-4" />}>
            {upcoming.map((e) => <TransactionCard key={e.id} entry={e} onTap={() => openEdit(e)} onDelete={() => deleteMut.mutate(e.id)} onTogglePaid={() => togglePaidMut.mutate(e)} />)}
          </CardSection>}
          <CardSection title="הכנסות">
            {income.map((e) => (
              <TransactionCard
                key={e.id}
                entry={e}
                onTap={() => openEdit(e)}
                onDelete={() => deleteMut.mutate(e.id)}
                onTogglePaid={() => togglePaidMut.mutate(e)}
              />
            ))}
          </CardSection>

          <CardSection title="הוצאות">
            <ExpenseCategoryGroups
              entries={expenses}
              categoryOrder={data?.categoryOrder ?? []}
              onMove={(categoryOrder) => categoryOrderMut.mutate(categoryOrder)}
              onTap={openEdit}
              onDelete={(entry) => deleteMut.mutate(entry.id)}
              onTogglePaid={(entry) => togglePaidMut.mutate(entry)}
            />
          </CardSection>
          {withdrawals.length > 0 && (
            <CardSection title="העברות לארנק מזומן">
              {withdrawals.map((e) => (
                <TransactionCard key={e.id} entry={e} onTap={() => openEdit(e)} onDelete={() => deleteMut.mutate(e.id)} onTogglePaid={() => togglePaidMut.mutate(e)} />
              ))}
            </CardSection>
          )}
        </>
      )}

      <details className="finance-panel"><summary className="cursor-pointer py-2 font-bold">כלים נוספים</summary><div className="mt-4 space-y-4"><button type="button" disabled={monthTemplateMut.isPending || !data?.summary.initialized} onClick={() => { if (window.confirm("לשמור את כל תנועות החודש כתבניות לחודשים הבאים? התנועות הנוכחיות לא ישתנו.")) monthTemplateMut.mutate(); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/30 px-3 text-xs font-bold text-primary disabled:opacity-50"><LayoutTemplate className="h-4 w-4" />{monthTemplateMut.isPending ? "שומר…" : "שמור חודש כתבנית"}</button>
      <OpenItemsRollover monthKey={monthKey} onComplete={(message) => showSaveMessage(message, 3500)} />

      <PeriodCorrectionCard monthKey={monthKey} onComplete={(message) => showSaveMessage(message, 3500)} />

      <BankReconciliationPanel monthKey={monthKey} />

      <CashflowCyclePanel monthKey={monthKey} />
      </div></details>

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
        onTogglePaid={sheetMode?.kind === "edit" ? async () => {
          await togglePaidMut.mutateAsync(sheetMode.entry);
        } : undefined}
        onCreateTemplate={sheetMode?.kind === "edit" ? async ({ frequency, dayOfMonth }) => {
          return createTemplateMut.mutateAsync({ entryId: sheetMode.entry.id, frequency, dayOfMonth });
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
