export type LedgerItemType = "income" | "expense";
export type LedgerEntryKind = "transaction" | "cash_withdrawal";
export type PaymentMethod = "bank" | "card" | "cash";

export type RecurringFrequency = "monthly" | "bi-monthly";

export type FixedTemplate = {
  id: string;
  user_id: string;
  name: string;
  type: LedgerItemType;
  amount: number;
  frequency: RecurringFrequency;
  day_of_month: number | null;
  is_active: boolean;
  is_variable: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** @deprecated use FixedTemplate */
export type RecurringTemplate = FixedTemplate;

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
  is_paid: boolean;
  entry_kind: LedgerEntryKind;
  payment_method: PaymentMethod;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MonthSummary = {
  monthKey: string;
  totalIncome: number;
  totalFixedExpenses: number;
  fixedExpensesPaid: number;
  totalVariableExpenses: number;
  remainingForVariable: number;
  disposableRemaining: number;
  netAfterAll: number;
  actualIncome: number;
  actualExpenses: number;
  actualNet: number;
  cashBalance: number;
  cashWithdrawnThisMonth: number;
  cashSpentThisMonth: number;
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
