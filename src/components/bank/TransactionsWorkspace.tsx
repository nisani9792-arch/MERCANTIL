"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/types";

export function TransactionsWorkspace() {
  const searchParams = useSearchParams();
  const showAdd = searchParams.get("action") !== "list";
  const qc = useQueryClient();

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{ categories: Category[] }>;
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          date,
          categoryId,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setAmount("");
      setNotes("");
      setCategoryId("");
    },
  });

  const categories = catData?.categories ?? [];
  const expenseCats = categories.filter((c) => c.type === "expense");
  const incomeCats = categories.filter((c) => c.type === "income");

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-bold text-on-surface">הוספת רישום חודשי</h1>
        <p className="text-sm text-on-surface-variant">
          הכנסה או הוצאה קבועה — לפי קטגוריה, פעם בחודש
        </p>
      </div>

      {showAdd && (
        <section className="m3-card p-4">
          <div className="grid gap-3">
            <div>
              <label className="m3-label">קטגוריה</label>
              <select
                className="m3-input mt-1 w-full px-3 py-2.5"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">בחר קטגוריה...</option>
                <optgroup label="הוצאות">
                  {expenseCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="הכנסות">
                  {incomeCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="m3-label">סכום (₪)</label>
              <input
                className="m3-input mt-1 w-full px-3 py-2.5"
                placeholder="למשל: 4500"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className="m3-label">חודש (תאריך)</label>
              <input
                className="m3-input mt-1 w-full px-3 py-2.5"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className="m3-label">הערה (אופציונלי)</label>
              <input
                className="m3-input mt-1 w-full px-3 py-2.5"
                placeholder="למשל: שכירות, משכורת..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => createMut.mutate()}
            disabled={!amount || !categoryId || createMut.isPending}
            className="m3-btn-primary mt-4 flex w-full min-h-[48px] items-center justify-center gap-2 py-2.5"
          >
            <Plus className="h-4 w-4" />
            {createMut.isPending ? "שומר..." : "שמור"}
          </button>
          {createMut.isSuccess && (
            <p className="mt-2 text-center text-sm text-success">נשמר ✓</p>
          )}
        </section>
      )}

      <p className="text-center text-xs text-on-surface-variant">
        חזרה ל
        <a href="/dashboard" className="mx-1 font-semibold text-primary">
          סיכום החודש
        </a>
        לראות לפי קטגוריות
      </p>
    </div>
  );
}
