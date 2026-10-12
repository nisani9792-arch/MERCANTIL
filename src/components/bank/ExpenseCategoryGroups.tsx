"use client";

import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useCallback, useMemo } from "react";
import { TransactionCard } from "@/components/bank/TransactionCard";
import { EXPENSE_CATEGORIES } from "@/lib/constants/budget";
import { inferExpenseCategory } from "@/lib/ai/smart-category";
import type { MonthlyLedgerEntry } from "@/types/ledger";

const currency = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" });

type Props = {
  entries: MonthlyLedgerEntry[];
  categoryOrder: string[];
  onMove: (categoryOrder: string[]) => void;
  onTap: (entry: MonthlyLedgerEntry) => void;
  onDelete: (entry: MonthlyLedgerEntry) => void;
  onTogglePaid: (entry: MonthlyLedgerEntry) => void;
};

function categoryFor(entry: MonthlyLedgerEntry) {
  if (EXPENSE_CATEGORIES.includes(entry.category as typeof EXPENSE_CATEGORIES[number])) return entry.category;
  return inferExpenseCategory(`${entry.category} ${entry.name}`).category;
}

export function ExpenseCategoryGroups({ entries, categoryOrder, onMove, onTap, onDelete, onTogglePaid }: Props) {
  const { groups, order } = useMemo(() => {
    const grouped = new Map<string, MonthlyLedgerEntry[]>();
    for (const entry of entries) {
      const category = categoryFor(entry);
      grouped.set(category, [...(grouped.get(category) ?? []), entry]);
    }
    const known = EXPENSE_CATEGORIES.filter((category) => grouped.has(category));
    const custom = [...grouped.keys()]
      .filter((category) => !EXPENSE_CATEGORIES.includes(category as typeof EXPENSE_CATEGORIES[number]))
      .sort((a, b) => a.localeCompare(b, "he"));
    const defaults = [...known, ...custom];
    const persisted = categoryOrder.filter((category) => grouped.has(category));
    return { groups: grouped, order: [...persisted, ...defaults.filter((category) => !persisted.includes(category))] };
  }, [categoryOrder, entries]);

  const move = useCallback((source: string, target: string) => {
    if (source === target) return;
    const next = order.filter((category) => category !== source);
    const targetIndex = next.indexOf(target);
    if (targetIndex < 0) return;
    next.splice(targetIndex, 0, source);
    onMove(next);
  }, [onMove, order]);

  return <div className="space-y-3">
    {order.map((category, index) => {
      const items = groups.get(category) ?? [];
      const total = items.reduce((sum, entry) => sum + entry.amount, 0);
      return <section key={category} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", category)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); move(event.dataTransfer.getData("text/plain"), category); }} className="overflow-hidden rounded-2xl border border-error/15 bg-surface-container-low/40 shadow-sm transition-shadow motion-safe:hover:shadow-md">
        <div className="flex items-center gap-1.5 border-b border-outline-variant/60 px-2 py-2.5">
          <GripVertical className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
          <h3 className="min-w-0 flex-1 text-sm font-black text-on-surface">{category}</h3>
          <strong className="text-sm text-error" dir="ltr">{currency.format(total)}</strong>
          <button type="button" disabled={index === 0} onClick={() => move(category, order[index - 1])} className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-30" aria-label={`העבר את ${category} למעלה`}><ChevronUp className="h-4 w-4" /></button>
          <button type="button" disabled={index === order.length - 1} onClick={() => move(category, order[index + 1])} className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-30" aria-label={`העבר את ${category} למטה`}><ChevronDown className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2 p-2">{items.map((entry) => <TransactionCard key={entry.id} entry={entry} onTap={() => onTap(entry)} onDelete={() => onDelete(entry)} onTogglePaid={() => onTogglePaid(entry)} />)}</div>
      </section>;
    })}
  </div>;
}
