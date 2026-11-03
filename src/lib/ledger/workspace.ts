import type { MonthlyLedgerEntry } from "@/types/ledger";
import type { FinancialSnapshotItem } from "@/lib/db/financial-snapshot";

export function filterMonthEntries(
  entries: MonthlyLedgerEntry[],
  view: "expense" | "income" | "all",
  search: string,
  status: string,
  categoryOrder: string[] = [],
) {
  const term = search.trim().toLocaleLowerCase();
  const order = new Map(categoryOrder.map((name, index) => [name, index]));
  return entries
    .filter(
      (entry) =>
        entry.entry_kind === "transaction" &&
        (view === "all" || entry.type === view) &&
        (entry.name + " " + entry.category)
          .toLocaleLowerCase()
          .includes(term) &&
        (status === "all" ||
          (status === "missing"
            ? entry.amount_pending
            : status === "done"
              ? entry.is_paid
              : !entry.is_paid)),
    )
    .sort(
      (a, b) =>
        (order.get(a.category) ?? categoryOrder.length) -
          (order.get(b.category) ?? categoryOrder.length) ||
        a.category.localeCompare(b.category, "he") ||
        a.name.localeCompare(b.name, "he"),
    );
}

/** Unknown balances stay unknown; inactive records do not inflate a summary. */
export function snapshotTotal(
  items: FinancialSnapshotItem[],
  kinds: readonly string[],
): number | null {
  const known = items.filter(
    (item) =>
      item.is_active && kinds.includes(item.kind) && item.amount !== null,
  );
  return known.length
    ? known.reduce((sum, item) => sum + Math.round(item.amount! * 100), 0) / 100
    : null;
}
