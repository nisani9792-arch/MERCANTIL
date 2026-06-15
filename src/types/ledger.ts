export type LedgerItemType = "income" | "expense";

export type RecurringFrequency = "monthly" | "bi-monthly";

export type RecurringTemplate = {
  id: string;
  user_id: string;
  name: string;
  type: LedgerItemType;
  amount: number;
  frequency: RecurringFrequency;
  day_of_month: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MonthlyLedgerEntry = {
  id: string;
  user_id: string;
  month_key: string;
  name: string;
  type: LedgerItemType;
  amount: number;
  category: string;
  is_from_template: boolean;
  template_id: string | null;
  is_variable: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MonthSummary = {
  monthKey: string;
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  remainingForVariable: number;
  netAfterAll: number;
  entryCount: number;
  initialized: boolean;
};

export type MonthTrendPoint = {
  monthKey: string;
  income: number;
  expense: number;
  net: number;
};

export type ExpenseBreakdownItem = {
  category: string;
  amount: number;
};

export type HistoricalAverages = {
  avgIncome: number;
  avgExpense: number;
  avgNet: number;
  monthsIncluded: number;
};

export type AnalyticsPayload = {
  monthKey: string;
  summary: MonthSummary;
  trend: MonthTrendPoint[];
  expenseBreakdown: ExpenseBreakdownItem[];
  averages: HistoricalAverages;
};
