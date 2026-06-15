#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function normalizeDatabaseUrl(raw) {
  if (!raw) return "";
  let s = String(raw).trim();
  s = s.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
  while (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (!url) {
  console.error("DATABASE_URL missing in .env.local");
  process.exit(1);
}

const sql = neon(url);

async function main() {
  console.log("Initializing Mercantil database on Neon...");

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

  await sql`create index if not exists transactions_user_date_idx on transactions (user_id, date desc)`;
  await sql`alter table transactions add column if not exists is_fixed_recurring boolean not null default false`;
  await sql`alter table transactions add column if not exists recurring_day_of_month smallint check (recurring_day_of_month is null or recurring_day_of_month between 1 and 31)`.catch(() => undefined);

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
  await sql`alter table ai_learning_rules add column if not exists recurring_day_of_month smallint`.catch(() => undefined);
  await sql`alter table ai_learning_rules add column if not exists typical_amount numeric(12, 2)`.catch(() => undefined);

  await sql`
    create table if not exists recurring_templates (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users (id) on delete cascade,
      name text not null,
      type text not null check (type in ('income', 'expense')),
      amount numeric(12, 2) not null check (amount >= 0),
      frequency text not null default 'monthly' check (frequency in ('monthly', 'bi-monthly')),
      day_of_month smallint,
      is_active boolean not null default true,
      sort_order int not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists monthly_ledger (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users (id) on delete cascade,
      month_key text not null,
      name text not null,
      type text not null check (type in ('income', 'expense')),
      amount numeric(12, 2) not null check (amount >= 0),
      is_from_template boolean not null default false,
      template_id uuid references recurring_templates (id) on delete set null,
      is_variable boolean not null default false,
      notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`create index if not exists recurring_templates_user_idx on recurring_templates (user_id)`;
  await sql`create index if not exists monthly_ledger_user_month_idx on monthly_ledger (user_id, month_key)`;
  await sql`alter table monthly_ledger add column if not exists category text`.catch(() => undefined);

  await sql`create index if not exists transactions_user_category_idx on transactions (user_id, category_id)`;

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
  ];

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

  const version = await sql`select version()`;
  console.log("✓ schema ready");
  console.log("✓ categories seeded");
  console.log("Connected:", version[0].version.slice(0, 55) + "...");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
