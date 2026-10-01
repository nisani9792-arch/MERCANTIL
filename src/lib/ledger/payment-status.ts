import type { LedgerPaymentStatus, MonthlyLedgerEntry } from "@/types/ledger";

const DAY_MS = 24 * 60 * 60 * 1000;

function asDay(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function paymentStatus(entry: Pick<MonthlyLedgerEntry, "is_paid" | "due_date">, today = new Date()): LedgerPaymentStatus {
  if (entry.is_paid) return "completed";
  if (!entry.due_date) return "planned";

  const due = new Date(`${entry.due_date}T00:00:00`);
  const daysUntilDue = Math.round((asDay(due) - asDay(today)) / DAY_MS);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 7) return "upcoming";
  return "planned";
}

export function statusLabel(status: LedgerPaymentStatus) {
  return {
    completed: "בוצע",
    overdue: "באיחור",
    upcoming: "קרוב",
    planned: "מתוכנן",
  }[status];
}
