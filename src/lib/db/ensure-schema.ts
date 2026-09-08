import { getSql } from "@/lib/db/client";

let schemaReady: Promise<void> | null = null;

export function ensureAppSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function initSchema() {
  const sql = getSql();

  await sql`create type category_type as enum ('income', 'expense')`.catch(
    () => undefined,
  );

  await sql`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      password_hash text not null,
      full_name text,
      avatar_url text,
      default_currency text not null default 'ILS',
      locale text not null default 'he',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists categories (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references users (id) on delete cascade,
      name text not null,
      type category_type not null,
      icon text not null default 'circle',
      sort_order int not null default 0,
      created_at timestamptz not null default now(),
      unique (user_id, name, type)
    )
  `;

  await sql`
    create table if not exists transactions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users (id) on delete cascade,
      amount numeric(12, 2) not null check (amount <> 0),
      date date not null,
      category_id uuid not null references categories (id),
      account_source text not null default 'כללי',
      notes text,
      import_hash text,
      is_fixed_recurring boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    alter table transactions
    add column if not exists is_fixed_recurring boolean not null default false
  `.catch(() => undefined);

  await sql`
    alter table transactions
    add column if not exists recurring_day_of_month smallint
    check (recurring_day_of_month is null or recurring_day_of_month between 1 and 31)
  `.catch(() => undefined);

  await sql`
    create table if not exists ai_learning_rules (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users (id) on delete cascade,
      text_pattern text not null,
      assigned_category_id uuid not null references categories (id),
      is_fixed_recurring boolean not null default false,
      recurring_day_of_month smallint check (recurring_day_of_month is null or recurring_day_of_month between 1 and 31),
      typical_amount numeric(12, 2),
      created_at timestamptz not null default now(),
      unique (user_id, text_pattern)
    )
  `;

  await sql`
    alter table ai_learning_rules
    add column if not exists recurring_day_of_month smallint
    check (recurring_day_of_month is null or recurring_day_of_month between 1 and 31)
  `.catch(() => undefined);

  await sql`
    alter table ai_learning_rules
    add column if not exists typical_amount numeric(12, 2)
  `.catch(() => undefined);

  await sql`
    create table if not exists fixed_templates (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users (id) on delete cascade,
      name text not null,
      type text not null check (type in ('income', 'expense')),
      amount numeric(12, 2) not null check (amount >= 0),
      frequency text not null default 'monthly' check (frequency in ('monthly', 'bi-monthly')),
      day_of_month smallint check (day_of_month is null or day_of_month between 1 and 31),
      is_active boolean not null default true,
      is_variable boolean not null default false,
      sort_order int not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  // Existing installations already have fixed_templates, so CREATE TABLE IF
  // NOT EXISTS does not add newly introduced columns. Add the column before
  // any legacy data is copied into it.
  await sql`
    alter table fixed_templates
    add column if not exists is_variable boolean not null default false
  `;

  // Older installations used recurring_templates. Keep their ids when moving
  // to fixed_templates so existing monthly rows remain valid.
  const legacyTemplateTable = await sql`
    select to_regclass('public.recurring_templates') is not null as exists
  `;
  if (Boolean(legacyTemplateTable[0]?.exists)) {
    await sql`alter table recurring_templates add column if not exists is_variable boolean not null default false`;
    await sql`
      insert into fixed_templates (
        id, user_id, name, type, amount, frequency, day_of_month,
        is_active, is_variable, sort_order, created_at, updated_at
      )
      select id, user_id, name, type, amount, frequency, day_of_month,
        is_active, is_variable, sort_order, created_at, updated_at
      from recurring_templates
      on conflict (id) do nothing
    `;
  }

  await sql`
    create table if not exists monthly_ledger (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users (id) on delete cascade,
      month_key text not null,
      name text not null,
      type text not null check (type in ('income', 'expense')),
      amount numeric(12, 2) not null check (amount >= 0),
      category text,
      is_from_template boolean not null default false,
      template_id uuid references fixed_templates (id) on delete set null,
      is_variable boolean not null default false,
      is_paid boolean not null default false,
      notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`create index if not exists fixed_templates_user_idx on fixed_templates (user_id)`;
  await sql`create index if not exists monthly_ledger_user_month_idx on monthly_ledger (user_id, month_key)`;

  await sql`
    alter table monthly_ledger
    add column if not exists category text
  `.catch(() => undefined);

  await sql`
    alter table monthly_ledger
    add column if not exists is_paid boolean not null default false
  `.catch(() => undefined);

  await sql`
    alter table monthly_ledger
    add column if not exists entry_kind text not null default 'transaction'
  `.catch(() => undefined);

  await sql`
    alter table monthly_ledger
    add column if not exists payment_method text not null default 'bank'
  `.catch(() => undefined);

  // The legacy table may still own this automatically named foreign key.
  // Repoint it after copying legacy ids; do not delete the legacy table.
  await sql`
    alter table monthly_ledger
    drop constraint if exists monthly_ledger_template_id_fkey
  `;
  await sql`
    alter table monthly_ledger
    add constraint monthly_ledger_template_id_fkey
    foreign key (template_id) references fixed_templates (id) on delete set null
  `;

  await sql`
    create unique index if not exists monthly_ledger_user_month_template_uidx
    on monthly_ledger (user_id, month_key, template_id)
    where template_id is not null
  `.catch((error) => {
    console.warn("[schema] could not add monthly template uniqueness index", error);
  });

  await sql`create index if not exists transactions_user_date_idx on transactions (user_id, date desc)`;
  await sql`create index if not exists transactions_user_category_idx on transactions (user_id, category_id)`;
  await sql`create index if not exists transactions_fixed_recurring_idx on transactions (user_id, is_fixed_recurring) where is_fixed_recurring = true`;
  await sql`create index if not exists ai_learning_rules_user_idx on ai_learning_rules (user_id)`;

  const categories = [
    ["משכורת", "income", "briefcase", 1],
    ["פרילנס", "income", "laptop", 2],
    ["השקעות", "income", "trending-up", 3],
    ["הכנסה אחרת", "income", "circle", 4],
    ["מזון", "expense", "utensils", 1],
    ["דיור", "expense", "home", 2],
    ["תחבורה", "expense", "car", 3],
    ["מנויים", "expense", "repeat", 4],
    ["פנאי", "expense", "gamepad-2", 5],
    ["בריאות", "expense", "heart-pulse", 6],
    ["חינוך", "expense", "graduation-cap", 7],
    ["קניות", "expense", "shopping-bag", 8],
    ["ביטוח", "expense", "shield", 9],
    ["אחר", "expense", "circle", 10],
  ] as const;

  for (const [name, type, icon, sortOrder] of categories) {
    await sql`
      insert into categories (user_id, name, type, icon, sort_order)
      select null, ${name}, ${type}::category_type, ${icon}, ${sortOrder}
      where not exists (
        select 1 from categories
        where user_id is null and name = ${name} and type = ${type}::category_type
      )
    `;
  }
}
