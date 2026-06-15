"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import type { RecurringTemplate } from "@/types/ledger";

export function TemplateList() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");

  const { data, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{ templates: RecurringTemplate[] }>;
    },
  });

  const patchMut = useMutation({
    mutationFn: async ({
      id,
      amount: amt,
    }: {
      id: string;
      amount: number;
    }) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      if (!res.ok) throw new Error("patch failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, amount: Number(amount) }),
      });
      if (!res.ok) throw new Error("add failed");
    },
    onSuccess: () => {
      setName("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  const templates = data?.templates ?? [];
  const income = templates.filter((t) => t.type === "income");
  const expenses = templates.filter((t) => t.type === "expense");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-on-surface">תבניות קבועות</h1>
        <p className="text-sm text-on-surface-variant">
          ההכנסות וההוצאות שחוזרות כל חודש — נטענות באתחול חודש
        </p>
      </div>

      {isLoading && (
        <p className="text-center text-sm text-on-surface-variant">טוען...</p>
      )}

      <TemplateGroup
        title="הכנסות"
        items={income}
        onAmountChange={(id, amt) => patchMut.mutate({ id, amount: amt })}
      />
      <TemplateGroup
        title="הוצאות"
        items={expenses}
        onAmountChange={(id, amt) => patchMut.mutate({ id, amount: amt })}
      />

      <section className="m3-card p-4">
        <h3 className="text-sm font-bold">הוספת תבנית</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <select
            className="m3-input px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as "income" | "expense")}
          >
            <option value="expense">הוצאה</option>
            <option value="income">הכנסה</option>
          </select>
          <input
            className="m3-input px-3 py-2 sm:col-span-2"
            placeholder="שם"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="m3-input px-3 py-2"
            placeholder="סכום"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            dir="ltr"
          />
        </div>
        <button
          type="button"
          disabled={!name.trim() || !amount || addMut.isPending}
          onClick={() => addMut.mutate()}
          className="m3-btn-primary mt-3 flex min-h-[44px] items-center gap-2 px-4 py-2"
        >
          <Plus className="h-4 w-4" />
          הוסף תבנית
        </button>
      </section>
    </div>
  );
}

function TemplateGroup({
  title,
  items,
  onAmountChange,
}: {
  title: string;
  items: RecurringTemplate[];
  onAmountChange: (id: string, amount: number) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="m3-card overflow-hidden">
      <div className="border-b border-outline-variant bg-surface-container px-4 py-2">
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <ul>
        {items.map((t) => (
          <li
            key={t.id}
            className="m3-ledger-row flex items-center gap-3 border-b border-outline-variant px-4 py-2.5 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-[10px] text-on-surface-variant">
                {t.frequency === "bi-monthly" ? "דו-חודשי" : "חודשי"}
                {t.day_of_month ? ` · יום ${t.day_of_month}` : ""}
              </p>
            </div>
            <input
              type="number"
              className="m3-input w-24 px-2 py-1.5 text-sm"
              value={t.amount}
              onChange={(e) => onAmountChange(t.id, Number(e.target.value))}
              dir="ltr"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
