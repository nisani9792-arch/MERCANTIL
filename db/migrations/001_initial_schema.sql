-- Mercantil (Neon PostgreSQL) — initial schema
-- No Supabase auth; app-managed users + sessions

create type category_type as enum ('income', 'expense');

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
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete cascade,
  name text not null,
  type category_type not null,
  icon text not null default 'circle',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount <> 0),
  date date not null,
  category_id uuid not null references categories (id),
  account_source text not null default 'כללי',
  notes text,
  import_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on transactions (user_id, date desc);
create index if not exists transactions_user_category_idx on transactions (user_id, category_id);
create unique index if not exists transactions_user_import_hash_idx
  on transactions (user_id, import_hash)
  where import_hash is not null;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();

drop trigger if exists transactions_set_updated_at on transactions;
create trigger transactions_set_updated_at
  before update on transactions
  for each row execute function set_updated_at();
