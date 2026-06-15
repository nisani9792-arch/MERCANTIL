export const EXPENSE_CATEGORIES = [
  "מזון",
  "קניות",
  "מסעדות",
  "דיור",
  "תחבורה",
  "מנויים",
  "ילדים",
  "פנאי",
  "בריאות",
  "אחר",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CHART_COLORS = [
  "#2d6a3e",
  "#b8860b",
  "#5c6b3a",
  "#4a7c9e",
  "#c97b4a",
  "#7b5ea7",
  "#3d8b7a",
  "#b54a4a",
  "#6b7280",
  "#d4af37",
];
