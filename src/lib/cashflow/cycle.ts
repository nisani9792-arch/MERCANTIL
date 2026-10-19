import type { MonthlyLedgerEntry } from "@/types/ledger";

export type CashflowCycle = {
  startDate: string;
  endDate: string;
  startDay: number;
  confirmedNet: number;
  forecastNet: number;
  safeBalance: number;
  upcoming: MonthlyLedgerEntry[];
  pending: MonthlyLedgerEntry[];
  undated: MonthlyLedgerEntry[];
};

const iso = (date: Date) => date.toISOString().slice(0, 10);

export function cycleBounds(monthKey: string, startDay: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, startDay));
  const end = new Date(Date.UTC(year, month, startDay - 1));
  return { startDate: iso(start), endDate: iso(end) };
}

function signed(entry: MonthlyLedgerEntry) {
  return entry.type === "income" ? entry.amount : -entry.amount;
}

export function buildCashflowCycle(
  entries: MonthlyLedgerEntry[],
  monthKey: string,
  startDay: number,
  today = new Date(),
): CashflowCycle {
  const { startDate, endDate } = cycleBounds(monthKey, startDay);
  const todayKey = iso(today);
  const dated = entries.filter((entry) => entry.due_date && entry.due_date >= startDate && entry.due_date <= endDate);
  const confirmed = dated.filter((entry) => entry.is_paid);
  const pending = dated.filter((entry) => !entry.is_paid).sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  const upcomingLimit = new Date(today);
  upcomingLimit.setDate(upcomingLimit.getDate() + 7);
  const upcomingLimitKey = iso(upcomingLimit);

  return {
    startDate,
    endDate,
    startDay,
    confirmedNet: confirmed.reduce((sum, entry) => sum + signed(entry), 0),
    forecastNet: dated.reduce((sum, entry) => sum + signed(entry), 0),
    safeBalance: confirmed.reduce((sum, entry) => sum + signed(entry), 0),
    upcoming: pending.filter((entry) => entry.due_date! >= todayKey && entry.due_date! <= upcomingLimitKey),
    pending,
    undated: entries.filter((entry) => !entry.due_date && !entry.is_paid),
  };
}
