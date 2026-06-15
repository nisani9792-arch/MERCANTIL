"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Category, CategoryType } from "@/types";
import { cn } from "@/lib/utils/cn";

export function CategoryManager() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [aiHint, setAiHint] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("failed");
      return (await res.json()) as { categories: Category[] };
    },
  });

  const createMut = useMutation({
    mutationFn: async (payload: { name: string; type: CategoryType }) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setName("");
      setAiHint("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  async function handleAiSuggest() {
    const desc = aiHint || name;
    if (!desc) return;
    setSuggesting(true);
    try {
      const res = await fetch("/api/ai/suggest-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc, type }),
      });
      const json = (await res.json()) as {
        suggestion: { name: string; reason: string };
      };
      setName(json.suggestion.name);
      setAiHint(json.suggestion.reason);
    } finally {
      setSuggesting(false);
    }
  }

  const categories = data?.categories ?? [];
  const system = categories.filter((c) => !c.user_id);
  const custom = categories.filter((c) => c.user_id);

  return (
    <div className="space-y-6">
      <section className="m3-card p-4">
        <h2 className="text-sm font-bold text-on-surface">יצירת קטגוריה</h2>
        <p className="mt-1 text-xs text-on-surface-variant">
          קטגוריות גמישות — AI יכול להציע שם על בסיס תיאור הוצאה
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="m3-label">שם קטגוריה</label>
            <input
              className="m3-input mt-1 w-full px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="למשל: מנויים דיגיטליים"
            />
          </div>
          <div>
            <label className="m3-label">סוג</label>
            <select
              className="m3-input mt-1 w-full px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as CategoryType)}
            >
              <option value="expense">הוצאה</option>
              <option value="income">הכנסה</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="m3-label">רמז ל-AI (אופציונלי)</label>
          <input
            className="m3-input mt-1 w-full px-3 py-2"
            value={aiHint}
            onChange={(e) => setAiHint(e.target.value)}
            placeholder="Netflix, חניה, קофה..."
          />
        </div>
        {aiHint && !name && (
          <p className="mt-2 text-xs text-secondary">{aiHint}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => createMut.mutate({ name, type })}
            disabled={!name || createMut.isPending}
            className="m3-btn-primary inline-flex items-center gap-2 px-4 py-2"
          >
            <Plus className="h-4 w-4" />
            הוסף
          </button>
          <button
            type="button"
            onClick={handleAiSuggest}
            disabled={suggesting}
            className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary-container px-4 py-2 text-sm font-semibold text-secondary"
          >
            <Sparkles className="h-4 w-4" />
            {suggesting ? "מציע..." : "הצעה מ-AI"}
          </button>
        </div>
      </section>

      <CategoryList
        title="קטגוריות מותאמות"
        items={custom}
        empty="עדיין לא יצרת קטגוריות מותאמות"
        onDelete={(id) => deleteMut.mutate(id)}
        canDelete
        loading={isLoading}
      />
      <CategoryList
        title="קטגוריות מערכת"
        items={system}
        empty=""
        loading={isLoading}
      />
    </div>
  );
}

function CategoryList({
  title,
  items,
  empty,
  onDelete,
  canDelete,
  loading,
}: {
  title: string;
  items: Category[];
  empty: string;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
  loading?: boolean;
}) {
  return (
    <section className="m3-card overflow-hidden">
      <div className="border-b border-outline-variant bg-surface-container px-4 py-2">
        <h2 className="text-sm font-bold text-on-surface">{title}</h2>
      </div>
      {loading ? (
        <p className="p-4 text-sm text-on-surface-variant">טוען...</p>
      ) : items.length === 0 ? (
        empty && <p className="p-4 text-sm text-on-surface-variant">{empty}</p>
      ) : (
        <ul className="divide-y divide-outline-variant">
          {items.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-surface-container-low"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    cat.type === "income"
                      ? "bg-success-container text-success"
                      : "bg-error-container text-error",
                  )}
                >
                  {cat.type === "income" ? "הכנסה" : "הוצאה"}
                </span>
                <span className="text-sm font-medium text-on-surface">{cat.name}</span>
              </div>
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(cat.id)}
                  className="rounded-full p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error"
                  aria-label="מחק"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
