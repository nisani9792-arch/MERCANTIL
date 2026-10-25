import { getSql } from "@/lib/db/client";

let ready: Promise<void> | null = null;

/** Additive migration: keep every named income row and replace old placeholders once. */
export function ensureIncomeAmounts(): Promise<void> {
  if (!ready) {
    const sql = getSql();
    ready = sql.transaction([
      sql`select pg_advisory_xact_lock(742026101)`,
      sql`create table if not exists app_schema_migrations (name text primary key, applied_at timestamptz not null default now())`,
      sql`alter table fixed_templates add column if not exists amount_pending boolean not null default false`,
      sql`alter table monthly_ledger add column if not exists amount_pending boolean not null default false`,
      // Early versions rejected zero, which was the reason for the 0.10 workaround.
      sql`do $$
        declare c record;
        begin
          if not exists (select 1 from app_schema_migrations where name = 'blank_income_amounts_v1') then
            for c in select conrelid::regclass as tbl, conname from pg_constraint
              where conrelid in ('fixed_templates'::regclass, 'monthly_ledger'::regclass)
                and contype = 'c' and pg_get_constraintdef(oid) ilike '%amount%'
            loop
              execute format('alter table %s drop constraint %I', c.tbl, c.conname);
            end loop;
            alter table fixed_templates add constraint fixed_templates_amount_nonnegative check (amount >= 0);
            alter table monthly_ledger add constraint monthly_ledger_amount_nonnegative check (amount >= 0);
            alter table fixed_templates add constraint fixed_templates_pending_income check (not amount_pending or (type = 'income' and amount = 0));
            alter table monthly_ledger add constraint monthly_ledger_pending_income check (not amount_pending or (type = 'income' and amount = 0 and not is_paid));
          end if;
        end $$`,
      sql`update fixed_templates set amount = 0, amount_pending = true, updated_at = now()
        where type = 'income' and amount = 0.10
          and not exists (select 1 from app_schema_migrations where name = 'blank_income_amounts_v1')`,
      sql`update monthly_ledger set amount = 0, amount_pending = true, is_paid = false, updated_at = now()
        where type = 'income' and amount = 0.10
          and not exists (select 1 from app_schema_migrations where name = 'blank_income_amounts_v1')`,
      sql`insert into app_schema_migrations (name) values ('blank_income_amounts_v1') on conflict do nothing`,
    ]).then(() => undefined).catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
