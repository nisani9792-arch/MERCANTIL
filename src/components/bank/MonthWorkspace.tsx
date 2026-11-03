"use client";
/* eslint-disable react-hooks/set-state-in-effect -- deep-link action intentionally opens the requested editor */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, LayoutTemplate, Plus, Search, Library } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  LedgerBottomSheet,
  type LedgerSheetMode,
} from "@/components/bank/LedgerBottomSheet";
import { TransactionCard } from "@/components/bank/TransactionCard";
import { SmartEntryBar } from "@/components/bank/SmartEntryBar";
import Link from "next/link";
import { PageHeading, StatCard, EmptyState } from "@/components/ui/Workspace";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import { filterMonthEntries } from "@/lib/ledger/workspace";
import { fetchLive, mutateLive } from "@/lib/api/fetch-live";
import type { MonthSummary, MonthlyLedgerEntry } from "@/types/ledger";
import { useMonthStore } from "@/stores/useMonthStore";

import { ExpenseCategoryGroups } from "@/components/bank/ExpenseCategoryGroups";

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
  const [view, setView] = useState<"expense" | "income" | "all">("expense");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  useEffect(
    () => () => {
      if (messageTimer.current) window.clearTimeout(messageTimer.current);
    },
    [],
  );

  const { data, isLoading, isError, refetch } = useQuery({
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
        const data = (await res.json().catch(() => ({}))) as {
          entry?: MonthlyLedgerEntry;
          error?: string;
        };
        if (!res.ok || !data.entry)
          throw new Error(data.error || "השמירה לא אושרה על ידי השרת");
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
        const data = (await res.json().catch(() => ({}))) as {
          entry?: MonthlyLedgerEntry;
          error?: string;
        };
        if (!res.ok || !data.entry)
          throw new Error(data.error || "השמירה לא אושרה על ידי השרת");
        return data.entry;
      }
    },
    onSuccess: (savedEntry) => {
      if (savedEntry.entry_kind === "transaction") setView(savedEntry.type);
      setSearch("");
      setStatusFilter("all");
      qc.setQueryData<LedgerResponse>(["ledger", monthKey], (current) => {
        if (!current) return current;
        const exists = current.entries.some(
          (entry) => entry.id === savedEntry.id,
        );
        return {
          ...current,
          entries: exists
            ? current.entries.map((entry) =>
                entry.id === savedEntry.id ? savedEntry : entry,
              )
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
      const result = (await res.json().catch(() => ({}))) as {
        entry?: MonthlyLedgerEntry;
        error?: string;
      };
      if (!res.ok || !result.entry)
        throw new Error(result.error || "אישור הביצוע לא נשמר");
      return result.entry;
    },
    onSuccess: (savedEntry) => {
      qc.setQueryData<LedgerResponse>(["ledger", monthKey], (current) =>
        current
          ? {
              ...current,
              entries: current.entries.map((entry) =>
                entry.id === savedEntry.id ? savedEntry : entry,
              ),
            }
          : current,
      );
      setSheetMode((current) =>
        current?.kind === "edit" && current.entry.id === savedEntry.id
          ? { kind: "edit", entry: savedEntry }
          : current,
      );
      showSaveMessage(
        savedEntry.is_paid ? "סומן כבוצע ונשמר" : "הוחזר למצב מתוכנן",
      );
      void refetchAll();
    },
  });

  const createTemplateMut = useMutation({
    mutationFn: async ({
      entryId,
      frequency,
      dayOfMonth,
    }: {
      entryId: string;
      frequency: "monthly" | "bi-monthly";
      dayOfMonth: number | null;
    }) => {
      const res = await mutateLive(`/api/ledger/${entryId}/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency, dayOfMonth }),
      });
      const result = (await res.json().catch(() => ({}))) as {
        created?: boolean;
        error?: string;
      };
      if (!res.ok || typeof result.created !== "boolean")
        throw new Error(result.error || "יצירת התבנית לא אושרה על ידי השרת");
      return { created: result.created };
    },
    onSuccess: (result) => {
      showSaveMessage(
        result.created
          ? "התבנית נשמרה בספריית הפריטים"
          : "כבר קיימת תבנית עבור תנועה זו",
      );
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
      const result = (await res.json().catch(() => ({}))) as {
        categoryOrder?: string[];
        error?: string;
      };
      if (!res.ok || !Array.isArray(result.categoryOrder))
        throw new Error(result.error || "סדר הקטגוריות לא נשמר");
      return result.categoryOrder;
    },
    onSuccess: (categoryOrder) => {
      qc.setQueryData<LedgerResponse>(["ledger", monthKey], (current) =>
        current ? { ...current, categoryOrder } : current,
      );
    },
  });

  const monthTemplateMut = useMutation({
    mutationFn: async () => {
      const res = await mutateLive("/api/ledger/month-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey }),
      });
      const result = (await res.json().catch(() => ({}))) as {
        created?: number;
        error?: string;
      };
      if (!res.ok || typeof result.created !== "number")
        throw new Error(result.error || "שמירת התבנית נכשלה");
      return result.created;
    },
    onSuccess: (created) => {
      showSaveMessage(
        created
          ? `נוצרו ${created} תבניות לחודשים הבאים`
          : "כל תנועות החודש כבר שמורות כתבנית",
        3000,
      );
      void qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  const entries = data?.entries ?? [];
  const income = entries.filter(
    (e) => e.type === "income" && e.entry_kind === "transaction",
  );
  const expenses = entries.filter(
    (e) => e.type === "expense" && e.entry_kind === "transaction",
  );
  const withdrawals = entries.filter((e) => e.entry_kind === "cash_withdrawal");
  const visible = filterMonthEntries(entries, view, search, statusFilter);

  function openAdd(type: "income" | "expense" | "cash_withdrawal") {
    saveMut.reset();
    setSheetMode({ kind: "add", type });
    setSheetOpen(true);
  }

  function openEdit(entry: MonthlyLedgerEntry) {
    saveMut.reset();
    setSheetMode({ kind: "edit", entry });
    setSheetOpen(true);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "income") setView("income");
    if (params.get("action") === "add") {
      setSheetMode({
        kind: "add",
        type:
          params.get("kind") === "income"
            ? "income"
            : params.get("kind") === "cash"
              ? "cash_withdrawal"
              : "expense",
      });
      setSheetOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return (
    <div className="workspace-page">
      <PageHeading
        title="החודש שלי"
        description="רשימה אחת ברורה. מוסיפים רק את מה שרלוונטי לחודש הזה."
        action={
          <div className="workspace-month-picker">
            <MonthNavigator />
          </div>
        }
      />
      <div className="workspace-toolbar">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="workspace-button workspace-button-primary"
            onClick={() => openAdd(view === "income" ? "income" : "expense")}
          >
            <Plus className="h-4 w-4" />
            {view === "income" ? "הכנסה חדשה" : "הוצאה חדשה"}
          </button>
          <Link href="/library" className="workspace-button">
            <Library className="h-4 w-4" />
            בחירה מהספרייה
          </Link>
          <Link href="/templates" className="workspace-button">טעינת חודש מתבנית</Link>
        </div>
        <span className="workspace-muted hidden sm:inline">
          חודש חדש מתחיל ריק
        </span>
      </div>
      {saveMessage && (
        <p role="status" className="workspace-notice">
          {saveMessage}
        </p>
      )}
      {(saveMut.isError || deleteMut.isError || togglePaidMut.isError) && (
        <p role="alert" className="m3-error">
          {togglePaidMut.error?.message ??
            "השמירה לא אושרה. הפרטים נשארו בטופס ואפשר לנסות שוב."}
        </p>
      )}
      {isError ? (
        <div role="alert" className="workspace-notice">
          לא הצלחנו לטעון את החודש.{" "}
          <button onClick={() => void refetch()} className="underline">
            ניסיון חוזר
          </button>
        </div>
      ) : isLoading ? (
        <p role="status" className="workspace-loading">
          טוען את החודש…
        </p>
      ) : (
        data && (
          <>
            <div className="month-summary grid grid-cols-3 gap-2 sm:gap-3">
              <StatCard tone="income" label="הכנסות" value={data.summary.totalIncome} />
              <StatCard
                label="הוצאות"
                tone="expense"
                value={
                  data.summary.totalFixedExpenses +
                  data.summary.totalVariableExpenses
                }
              />
              <StatCard
                label="יתרה מהזנה"
                value={data.summary.disposableRemaining}
                featured
                note="ללא הערכת המחיה"
              />
            </div>
            <section className="space-y-4">
              <div
                className="workspace-tabs"
                role="tablist"
                aria-label="סוג הרישומים"
              >
                {(
                  [
                    ["expense", "הוצאות", expenses.length],
                    ["income", "הכנסות", income.length],
                    ["all", "הכול", income.length + expenses.length],
                  ] as const
                ).map(([key, label, count]) => (
                  <button
                    key={key}
                    data-flow={key}
                    role="tab"
                    aria-selected={view === key}
                    aria-controls="month-items"
                    id={"month-tab-" + key}
                    onClick={() => setView(key)}
                  >
                    {label}
                    <span className="ms-2 rounded-md bg-surface-container px-1.5 py-0.5 text-[11px]">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="workspace-toolbar">
                <label className="workspace-search min-w-0 flex-1">
                  <Search className="h-4 w-4 shrink-0 text-on-surface-variant" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="חיפוש לפי שם או קטגוריה"
                    aria-label="חיפוש ברישומי החודש"
                  />
                </label>
                <select
                  aria-label="סינון לפי מצב"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="workspace-button"
                >
                  <option value="all">כל המצבים</option>
                  <option value="missing">סכום חסר</option>
                  <option value="pending">טרם בוצע</option>
                  <option value="done">בוצע</option>
                </select>
              </div>
              <div
                id="month-items"
                role="tabpanel"
                aria-labelledby={"month-tab-" + view}
              >
                {visible.length ? (
                  <div className="workspace-list">
                    {visible.map((entry) => (
                      <TransactionCard
                        key={entry.id}
                        entry={entry}
                        busy={togglePaidMut.isPending}
                        onTap={() => openEdit(entry)}
                        onDelete={() => deleteMut.mutate(entry.id)}
                        onTogglePaid={() => togglePaidMut.mutate(entry)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title={
                      data.summary.initialized
                        ? "אין פריטים בתצוגה הזו"
                        : "מתחילים את החודש בנחת"
                    }
                    description={
                      data.summary.initialized
                        ? "אפשר לשנות את הסינון, להוסיף פריט או לבחור מהספרייה."
                        : "בחר מהחודשים הקודמים או הוסף פריט חדש. לא צריך למלא הכול בבת אחת."
                    }
                    action={
                      <Link href="/library" className="workspace-button">
                        <Library className="h-4 w-4" />
                        לספריית הפריטים
                      </Link>
                    }
                  />
                )}
              </div>
              <p className="workspace-muted">
                {visible.length} פריטים בתצוגה · לחיצה על פריט פותחת עריכה.
                סימון ✓ מיועד למעקב ביצוע לפי בחירתך.
              </p>
            </section>
          </>
        )
      )}
      <details className="finance-panel">
        <summary className="cursor-pointer text-sm font-semibold">
          הוספה בשפה חופשית
        </summary>
        <div className="mt-4">
          <SmartEntryBar
            onParsed={(mode) => {
              setSheetMode(mode);
              setSheetOpen(true);
            }}
          />
        </div>
      </details>
      <details className="finance-panel">
        <summary className="cursor-pointer py-2 font-bold">
          כלים מתקדמים
        </summary>
        <div className="mt-4 space-y-4">
          <button
            type="button"
            disabled={monthTemplateMut.isPending || !data?.summary.initialized}
            onClick={() => {
              if (
                window.confirm(
                  "לשמור את כל תנועות החודש כתבניות לחודשים הבאים? התנועות הנוכחיות לא ישתנו.",
                )
              )
                monthTemplateMut.mutate();
            }}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/30 px-3 text-xs font-bold text-primary disabled:opacity-50"
          >
            <LayoutTemplate className="h-4 w-4" />
            {monthTemplateMut.isPending ? "שומר…" : "שמור חודש כתבנית"}
          </button>
          <OpenItemsRollover
            monthKey={monthKey}
            onComplete={(message) => showSaveMessage(message, 3500)}
          />

          <PeriodCorrectionCard
            monthKey={monthKey}
            onComplete={(message) => showSaveMessage(message, 3500)}
          />

          <BankReconciliationPanel monthKey={monthKey} />

          <CashflowCyclePanel monthKey={monthKey} />
        </div>
      </details>
      <details className="finance-panel">
        <summary className="cursor-pointer text-sm font-semibold">
          סידור קטגוריות והעברות מזומן
        </summary>
        <div className="mt-4 space-y-4">
          {categoryOrderMut.isError && (
            <p role="alert" className="text-error">
              סדר הקטגוריות לא נשמר.
            </p>
          )}
          <ExpenseCategoryGroups
            entries={expenses}
            categoryOrder={data?.categoryOrder ?? []}
            onMove={(categoryOrder) => categoryOrderMut.mutate(categoryOrder)}
            onTap={openEdit}
            onDelete={(entry) => deleteMut.mutate(entry.id)}
            onTogglePaid={(entry) => togglePaidMut.mutate(entry)}
          />
          <button
            className="workspace-button"
            onClick={() => openAdd("cash_withdrawal")}
          >
            <Banknote className="h-4 w-4" />
            העברה למזומן
          </button>
          {withdrawals.map((entry) => (
            <TransactionCard
              key={entry.id}
              entry={entry}
              onTap={() => openEdit(entry)}
              onDelete={() => deleteMut.mutate(entry.id)}
              onTogglePaid={() => togglePaidMut.mutate(entry)}
            />
          ))}
        </div>
      </details>
      <LedgerBottomSheet
        open={sheetOpen}
        mode={sheetMode}
        storageScope={monthKey}
        onClose={() => {
          setSheetOpen(false);
          setSheetMode(null);
        }}
        onDelete={
          sheetMode?.kind === "edit"
            ? async () => {
                await deleteMut.mutateAsync(sheetMode.entry.id);
              }
            : undefined
        }
        onTogglePaid={
          sheetMode?.kind === "edit"
            ? async () => {
                await togglePaidMut.mutateAsync(sheetMode.entry);
              }
            : undefined
        }
        onCreateTemplate={
          sheetMode?.kind === "edit"
            ? async ({ frequency, dayOfMonth }) => {
                return createTemplateMut.mutateAsync({
                  entryId: sheetMode.entry.id,
                  frequency,
                  dayOfMonth,
                });
              }
            : undefined
        }
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
