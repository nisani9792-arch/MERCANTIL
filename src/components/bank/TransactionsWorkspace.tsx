"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { TransactionsTable } from "@/components/bank/TransactionsTable";
import type { Category } from "@/types";

export function TransactionsWorkspace() {
  const searchParams = useSearchParams();
  const showAdd = searchParams.get("action") === "add";
  const qc = useQueryClient();

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [classifyText, setClassifyText] = useState("");
  const [classifyResult, setClassifyResult] = useState<string | null>(null);

  const { data: txData } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await fetch("/api/transactions?limit=100");
      if (!res.ok) throw new Error("failed");
      return res.json();
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

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          date,
          categoryId,
          notes,
        }),
      });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["ai-insights"] });
      setAmount("");
      setNotes("");
    },
  });

  const classifyMut = useMutation({
    mutationFn: async (apply: boolean) => {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              description: classifyText,
              amount: Number(amount) || 100,
              date,
              apply,
            },
          ],
          autoCreateCategories: true,
        }),
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    onSuccess: (data) => {
      const r = data.results?.[0];
      if (r) {
        setClassifyResult(
          `${r.categoryName} (${r.type}) — ביטחון ${Math.round(r.confidence * 100)}% · ${r.source === "ai" ? "AI" : "כללים"}`,
        );
        const cat = catData?.categories.find(
          (c) => c.name === r.categoryName && c.type === r.type,
        );
        if (cat) setCategoryId(cat.id);
        setNotes(r.cleanedNotes);
      }
      if (data.applied?.length) {
        qc.invalidateQueries({ queryKey: ["transactions"] });
      }
    },
  });

  const categories = catData?.categories ?? [];
  const transactions = txData?.transactions ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-on-surface">תנועות</h1>
        <p className="text-sm text-on-surface-variant">ניהול, סיווג AI ועריכה</p>
      </div>

      {(showAdd || searchParams.get("action") === "classify") && (
        <section className="m3-card p-4">
          <h2 className="text-sm font-bold text-on-surface">
            {showAdd ? "הוספת תנועה" : "סיווג AI"}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              className="m3-input px-3 py-2"
              placeholder="סכום"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              dir="ltr"
            />
            <input
              className="m3-input px-3 py-2"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              dir="ltr"
            />
            <input
              className="m3-input px-3 py-2 sm:col-span-2"
              placeholder="תיאור / הערות (עברית או אנגלית)"
              value={notes || classifyText}
              onChange={(e) => {
                setNotes(e.target.value);
                setClassifyText(e.target.value);
              }}
            />
            <select
              className="m3-input px-3 py-2 sm:col-span-2"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">בחר קטגוריה</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "income" ? "הכנסה" : "הוצאה"})
                </option>
              ))}
            </select>
          </div>
          {classifyResult && (
            <p className="mt-2 text-xs text-secondary">{classifyResult}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => classifyMut.mutate(false)}
              disabled={!classifyText || classifyMut.isPending}
              className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary-container px-4 py-2 text-sm font-semibold text-secondary"
            >
              <Sparkles className="h-4 w-4" />
              סיווג AI
            </button>
            <button
              type="button"
              onClick={() => classifyMut.mutate(true)}
              disabled={!classifyText || classifyMut.isPending}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary"
            >
              סיווג ושמירה
            </button>
            <button
              type="button"
              onClick={() => createMut.mutate()}
              disabled={!amount || !categoryId || createMut.isPending}
              className="m3-btn-primary inline-flex items-center gap-2 px-4 py-2"
            >
              <Plus className="h-4 w-4" />
              שמור
            </button>
          </div>
        </section>
      )}

      <TransactionsTable transactions={transactions} title="כל התנועות" compact={false} />
    </div>
  );
}
