export function formatCurrency(
  amount: number,
  currency = "ILS",
  locale = "he-IL",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string, locale = "he-IL"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function shortUserId(id: string): string {
  return id.replace(/-/g, "").slice(0, 9).toUpperCase();
}
