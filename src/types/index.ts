export type User = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  default_currency: string;
  locale: string;
  created_at: string;
  updated_at: string;
};

export type CategoryType = "income" | "expense";

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  type: CategoryType;
  icon: string;
  sort_order: number;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  category_id: string;
  account_source: string;
  notes: string | null;
  import_hash: string | null;
  is_fixed_recurring: boolean;
  recurring_day_of_month: number | null;
  created_at: string;
  updated_at: string;
};

export type TransactionWithCategory = Transaction & {
  category: Pick<Category, "name" | "type" | "icon"> | null;
};
