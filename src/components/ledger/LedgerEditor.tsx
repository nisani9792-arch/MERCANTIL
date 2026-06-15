"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { InitMonthPanel } from "@/components/ledger/InitMonthPanel";
import { LedgerRow } from "@/components/ledger/LedgerRow";
import { MonthPicker } from "@/components/ledger/MonthPicker";
import { currentMonthKey } from "@/lib/utils/month";
import type { MonthSummary, MonthlyLedgerEntry } from "@/types/ledger";

type LedgerResponse = {
  entries: MonthlyLedgerEntry[];
  summary: MonthSummary;
  monthKey: string;
};

export function LedgerEditor() {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [varName, setVarName] = useState("");
  const [varAmount, setVarAmount] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ledger", monthKey],
    queryFn: async () => {
      const res = await fetch(`/api/ledger?month=${monthKey}`);
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<LedgerResponse>;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ledger", monthKey] });
    qc.invalidateQueries({ queryKey: ["ai-insights", monthKey] });
  };

  const patchMut = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const res = await fetch(`/api/ledger/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("patch failed");
    },
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ledger/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: invalidate,
  });

  const addVarMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthKey,
          name: varName.trim(),
          type: "expense",
          amount: Number(varAmount),
          isVariable: true,
        }),
      });
      if (!res.ok) throw new Error("add failed");
    },
    onSuccess: () => {
      setVarName("");
      setVarAmount("");
      invalidate();
    },
  });

  const entries = data?.entries ?? [];
  const summary = data?.summary;
  const income = entries.filter((e) => e.type === "income");
  const fixed = entries.filter((e) => e.type === "expense" && !e.is_variable);
  const variable = entries.filter((e) => e.is_variable);
  const busy = patchMut.isPending || deleteMut.isPending || addVarMut.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-on-surface">ניהול החודש</h1>
        <p className="text-sm text-on-surface-variant">
          ערוך סכומים, הוסף הוצאות משתנות, או מחק פריטים
        </p>
      </div>

      <MonthPicker monthKey={monthKey} onChange={setMonthKey} />

      <InitMonthPanel
        monthKey={monthKey}
        initialized={summary?.initialized ?? false}
      />

      {isLoading && (
        <p className="text-center text-sm text-on-surface-variant">טוען...</p>
      )}

      {summary?.initialized && (
        <>
          <LedgerSection
            title="הכנסות"
            entries={income}
            onAmountChange={(id, amount) => patchMut.mutate({ id, amount })}
            onDelete={(id) => deleteMut.mutate(id)}
            disabled={busy}
          />
          <LedgerSection
            title="הוצאות קבועות"
            entries={fixed}
            onAmountChange={(id, amount) => patchMut.mutate({ id, amount })}
            onDelete={(id) => deleteMut.mutate(id)}
            disabled={busy}
          />
          <LedgerSection
            title="הוצאות משתנות"
            entries={variable}
            onAmountChange={(id, amount) => patchMut.mutate({ id, amount })}
            onDelete={(id) => deleteMut.mutate(id)}
            disabled={busy}
          />

          <section className="m3-card overflow-hidden p-4">
            <h3 className="text-sm font-bold text-on-surface">
              הוספת הוצאה משתנה
            </h3>
            <p className="text-xs text-on-surface-variant">
              מזון, קניות, מסעדות וכו׳
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="m3-input min-w-[140px] flex-1 px-3 py-2"
                placeholder="מה קנית?"
                value={varName}
                onChange={(e) => setVarName(e.target.value)}
              />
              <input
                className="m3-input w-28 px-3 py-2"
                placeholder="₪"
                type="number"
                value={varAmount}
                onChange={(e) => setVarAmount(e.target.value)}
                dir="ltr"
              />
              <button
                type="button"
                disabled={!varName.trim() || !varAmount || addVarMut.isPending}
                onClick={() => addVarMut.mutate()}
                className="m3-btn-primary flex min-h-[44px] items-center gap-2 px-4 py-2"
              >
                <Plus className="h-4 w-4" />
                הוסף
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function LedgerSection({
  title,
  entries,
  onAmountChange,
  onDelete,
  disabled,
}: {
  title: string;
  entries: MonthlyLedgerEntry[];
  onAmountChange: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}) {
  if (!entries.length) return null;
  return (
    <section className="m3-card overflow-hidden">
      <div className="border-b border-outline-variant bg-surface-container px-4 py-2">
        <h3 className="text-sm font-bold text-on-surface">{title}</h3>
      </div>
      <ul>
        {entries.map((entry) => (
          <LedgerRow
            key={entry.id}
            entry={entry}
            onAmountChange={onAmountChange}
            onDelete={onDelete}
            disabled={disabled}
          />
        ))}
      </ul>
    </section>
  );
}
