-- Mercantil budget schema migration
-- Run via: npm run db:init (ensure-schema) or apply manually on Neon

create table if not exists fixed_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount >= 0),
  frequency text not null default 'monthly' check (frequency in ('monthly', 'bi-monthly')),
  day_of_month smallint check (day_of_month is null or day_of_month between 1 and 31),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
);

create index if not exists fixed_templates_user_idx on fixed_templates (user_id);
create index if not exists monthly_ledger_user_month_idx on monthly_ledger (user_id, month_key);

alter table monthly_ledger add column if not exists is_paid boolean not null default false;
alter table monthly_ledger add column if not exists category text;

-- Legacy rename (safe if already applied)
alter table if exists recurring_templates rename to fixed_templates;
