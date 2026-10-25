import { getSql } from "@/lib/db/client";
import { ensureIncomeAmounts } from "@/lib/db/income-amounts";
import type { LedgerItemType, MonthlyLedgerEntry } from "@/types/ledger";

export type ReconciliationCandidate = Pick<MonthlyLedgerEntry, "id" | "name" | "amount" | "type" | "category" | "due_date">;

export type BankReconciliationItem = {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: LedgerItemType;
  category: string;
  candidates: ReconciliationCandidate[];
};

let reconciliationSchemaReady: Promise<void> | null = null;

/** Additive, idempotent migration for bank-to-plan reconciliation. */
export function ensureReconciliationSchema() {
  if (!reconciliationSchemaReady) {
    const sql = getSql();
    reconciliationSchemaReady = (async () => {
      await sql`alter table transactions add column if not exists monthly_ledger_entry_id uuid references monthly_ledger (id) on delete set null`;
      await sql`alter table transactions add column if not exists reconciliation_status text not null default 'not_applicable'`;
      await sql`alter table transactions add column if not exists reconciled_at timestamptz`;
      await sql`create index if not exists transactions_user_reconciliation_idx on transactions (user_id, reconciliation_status, date desc)`;
      await sql`create unique index if not exists transactions_monthly_ledger_reconciliation_uidx on transactions (monthly_ledger_entry_id) where monthly_ledger_entry_id is not null`;
    })().catch((error) => {
      reconciliationSchemaReady = null;
      throw error;
    });
  }
  return reconciliationSchemaReady;
}

export async function listBankReconciliationItems(userId: string, monthKey: string): Promise<BankReconciliationItem[]> {
  await ensureIncomeAmounts();
  await ensureReconciliationSchema();
  const sql = getSql();
  const [transactionRows, ledgerRows] = await Promise.all([
    sql`
      select t.id, t.amount, t.date, t.notes, t.account_source, c.name as category_name, c.type as category_type
      from transactions t
      join categories c on c.id = t.category_id
      where t.user_id = ${userId}
        and t.reconciliation_status = 'unmatched'
        and to_char(t.date, 'YYYY-MM') = ${monthKey}
      order by t.date desc, t.created_at desc
      limit 50
    `,
    sql`
      select l.id, l.name, l.amount, l.type, l.category, l.due_date
      from monthly_ledger l
      where l.user_id = ${userId}
        and l.month_key = ${monthKey}
        and l.entry_kind = 'transaction'
        and l.is_paid = false
        and l.amount_pending = false
        and not exists (
          select 1 from transactions t
          where t.monthly_ledger_entry_id = l.id and t.reconciliation_status = 'matched'
        )
    `,
  ]);

  const candidates = (ledgerRows as Record<string, unknown>[]).map((row) => ({
    id: String(row.id), name: String(row.name), amount: Number(row.amount), type: row.type as LedgerItemType,
    category: String(row.category ?? row.name), due_date: row.due_date ? String(row.due_date).slice(0, 10) : null,
  }));

  return (transactionRows as Record<string, unknown>[]).map((row) => {
    const type = row.category_type as LedgerItemType;
    const amount = Number(row.amount);
    const category = String(row.category_name);
    return {
      id: String(row.id), amount, type, category,
      date: String(row.date).slice(0, 10),
      description: String(row.notes ?? row.account_source),
      candidates: candidates
        .filter((item) => item.type === type)
        .sort((a, b) => Math.abs(a.amount - amount) - Math.abs(b.amount - amount))
        .slice(0, 4),
    };
  });
}

export async function reconcileBankTransaction(userId: string, transactionId: string, ledgerEntryId: string) {
  await ensureIncomeAmounts();
  await ensureReconciliationSchema();
  const sql = getSql();
  const rows = await sql`
    with source_transaction as (
      select id from transactions
      where id = ${transactionId} and user_id = ${userId} and reconciliation_status = 'unmatched'
    ), eligible_ledger as (
      select l.id from monthly_ledger l
      where l.id = ${ledgerEntryId} and l.user_id = ${userId}
        and l.entry_kind = 'transaction' and l.is_paid = false
        and l.amount_pending = false
        and exists (select 1 from source_transaction)
    ), completed_ledger as (
      update monthly_ledger l
      set is_paid = true, completed_at = now(), confirmation_source = 'automatic', updated_at = now()
      where l.id in (select id from eligible_ledger)
      returning l.id
    ), reconciled_transaction as (
      update transactions t
      set monthly_ledger_entry_id = ${ledgerEntryId}, reconciliation_status = 'matched', reconciled_at = now(), updated_at = now()
      where t.id = ${transactionId} and t.user_id = ${userId}
        and exists (select 1 from completed_ledger)
      returning t.id, t.monthly_ledger_entry_id
    )
    select id, monthly_ledger_entry_id from reconciled_transaction
  `;
  return rows[0] ? { transactionId: String(rows[0].id), ledgerEntryId: String(rows[0].monthly_ledger_entry_id) } : null;
}
