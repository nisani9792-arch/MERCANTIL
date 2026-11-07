import { currentDateKey } from "@/lib/utils/month";
import type { LedgerPaymentStatus, MonthlyLedgerEntry } from "@/types/ledger";

const DAY_MS = 24 * 60 * 60 * 1000;

export function paymentStatus(entry: Pick<MonthlyLedgerEntry, "is_paid" | "due_date">, today = new Date()): LedgerPaymentStatus {
  if (entry.is_paid) return "completed";
  if (!entry.due_date) return "planned";

  const due = Date.parse(`${entry.due_date}T00:00:00Z`);
  const daysUntilDue = Math.round((due - Date.parse(`${currentDateKey(today)}T00:00:00Z`)) / DAY_MS);
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
