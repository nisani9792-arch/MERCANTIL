"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils/format";
import { TransactionListEditor } from "@/components/bank/TransactionListEditor";
import type { Category, CategoryType } from "@/types";

type Suggestion = {
  categoryId: string;
  categoryName: string;
  amount?: number;
  recurringDayOfMonth?: number;
  matchedPattern: string;
};

export function TransactionsWorkspace() {
  const qc = useQueryClient();
  const [entryType, setEntryType] = useState<CategoryType>("expense");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [recurringDay, setRecurringDay] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [learned, setLearned] = useState(false);
  const skipSuggest = useRef(false);

  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{ categories: Category[] }>;
    },
  });

  const categories = catData?.categories ?? [];
  const filteredCats = categories.filter((c) => c.type === entryType);

  useEffect(() => {
    if (skipSuggest.current || notes.trim().length < 2) {
      setSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      const params = new URLSearchParams({
        notes: notes.trim(),
        type: entryType,
      });
      const res = await fetch(`/api/learning/suggest?${params}`);
      if (!res.ok) return;
      const data = (await res.json()) as { suggestion: Suggestion | null };
      if (!data.suggestion) {
        setSuggestion(null);
        return;
      }
      setSuggestion(data.suggestion);
      setCategoryId(data.suggestion.categoryId);
      if (data.suggestion.amount && !amount) {
        setAmount(String(data.suggestion.amount));
      }
      if (data.suggestion.recurringDayOfMonth && !recurringDay) {
        setRecurringDay(String(data.suggestion.recurringDayOfMonth));
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [notes, entryType, amount, recurringDay]);

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          date,
          categoryId,
          notes: notes.trim() || undefined,
          recurringDayOfMonth: recurringDay ? Number(recurringDay) : undefined,
          isFixedRecurring: !!recurringDay,
        }),
      });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      skipSuggest.current = true;
      setNotes("");
      setAmount("");
      setRecurringDay("");
      setCategoryId("");
      setSuggestion(null);
      setLearned(true);
      setTimeout(() => {
        skipSuggest.current = false;
        setLearned(false);
      }, 2500);
    },
  });

  const dayNum = recurringDay ? Number(recurringDay) : null;
  const dayValid = dayNum == null || (dayNum >= 1 && dayNum <= 31);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-bold text-on-surface">רישום חדש</h1>
        <p className="text-sm text-on-surface-variant">
          כתוב מה הוצאת או קיבלת — המערכת תזכור לפעם הבאה
        </p>
      </div>

      <section className="m3-card p-4">
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-container-low p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setEntryType(t);
                setCategoryId("");
                setSuggestion(null);
              }}
              className={`min-h-[44px] rounded-lg py-2 text-sm font-semibold transition-colors ${
                entryType === t
                  ? t === "expense"
                    ? "bg-error/15 text-error"
                    : "bg-success/15 text-success"
                  : "text-on-surface-variant"
              }`}
            >
              {t === "expense" ? "הוצאה" : "הכנסה"}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          <div>
            <label className="m3-label">מה זה?</label>
            <input
              className="m3-input mt-1 w-full px-3 py-2.5"
              placeholder="למשל: שכירות, נטפליקס, משכורת..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoFocus
            />
          </div>

          {suggestion && (
            <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-on-surface">
              <Brain className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                זכרתי: <strong>{suggestion.categoryName}</strong>
                {suggestion.recurringDayOfMonth
                  ? ` · יום ${suggestion.recurringDayOfMonth} בחודש`
                  : ""}
                {suggestion.amount
                  ? ` · ${formatCurrency(suggestion.amount)}`
                  : ""}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="m3-label">כמה? (₪)</label>
              <input
                className="m3-input mt-1 w-full px-3 py-2.5"
                placeholder="4500"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className="m3-label">תאריך</label>
              <input
                className="m3-input mt-1 w-full px-3 py-2.5"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="m3-label">ביום כמה בחודש זה חוזר?</label>
            <input
              className="m3-input mt-1 w-full px-3 py-2.5"
              placeholder="למשל: 1 לשכירות, 10 למשכורת (אופציונלי)"
              type="number"
              min={1}
              max={31}
              inputMode="numeric"
              value={recurringDay}
              onChange={(e) => setRecurringDay(e.target.value)}
              dir="ltr"
            />
            <p className="mt-1 text-[11px] text-on-surface-variant">
              השאר ריק אם זו הוצאה חד-פעמית
            </p>
          </div>

          <div>
            <label className="m3-label">קטגוריה</label>
            <select
              className="m3-input mt-1 w-full px-3 py-2.5"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">בחר קטגוריה...</option>
              {filteredCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => createMut.mutate()}
          disabled={
            !amount || !categoryId || !dayValid || createMut.isPending
          }
          className="m3-btn-primary mt-4 flex w-full min-h-[48px] items-center justify-center gap-2 py-2.5"
        >
          <Plus className="h-4 w-4" />
          {createMut.isPending ? "שומר..." : "שמור ולמד"}
        </button>

        {learned && (
          <p className="mt-2 text-center text-sm text-success">
            נשמר — המערכת למדה ✓
          </p>
        )}
      </section>

      <TransactionListEditor />
    </div>
  );
}
