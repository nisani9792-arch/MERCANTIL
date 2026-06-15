import type { LedgerItemType, RecurringFrequency } from "@/types/ledger";

export type DefaultTemplateSeed = {
  name: string;
  type: LedgerItemType;
  amount: number;
  frequency: RecurringFrequency;
  day_of_month: number | null;
  sort_order: number;
};

export const DEFAULT_RECURRING_TEMPLATES: DefaultTemplateSeed[] = [
  { name: "אייל (Eyal)", type: "income", amount: 5024, frequency: "monthly", day_of_month: 10, sort_order: 1 },
  { name: "Jusic", type: "income", amount: 9277, frequency: "monthly", day_of_month: 10, sort_order: 2 },
  { name: "שכירות", type: "expense", amount: 2500, frequency: "monthly", day_of_month: 1, sort_order: 10 },
  { name: "הלוואת רכב", type: "expense", amount: 5000, frequency: "monthly", day_of_month: 5, sort_order: 11 },
  { name: "חשמל / מים", type: "expense", amount: 834, frequency: "bi-monthly", day_of_month: 15, sort_order: 12 },
  { name: "מטפלת", type: "expense", amount: 900, frequency: "monthly", day_of_month: 1, sort_order: 13 },
  { name: "הוט מובייל", type: "expense", amount: 26, frequency: "monthly", day_of_month: 20, sort_order: 14 },
  { name: "פלאפון", type: "expense", amount: 61, frequency: "monthly", day_of_month: 20, sort_order: 15 },
  { name: "רמי לוי", type: "expense", amount: 27, frequency: "monthly", day_of_month: null, sort_order: 16 },
  { name: "Spotify", type: "expense", amount: 24.9, frequency: "monthly", day_of_month: 1, sort_order: 17 },
  { name: "Google / Gemini", type: "expense", amount: 19.9, frequency: "monthly", day_of_month: 1, sort_order: 18 },
  { name: "דלק", type: "expense", amount: 255, frequency: "monthly", day_of_month: null, sort_order: 19 },
];
