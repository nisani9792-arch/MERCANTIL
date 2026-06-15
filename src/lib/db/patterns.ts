import { getSql } from "@/lib/db/client";

export type MerchantPattern = {
  id: string;
  user_id: string;
  pattern: string;
  category_id: string;
  category_name?: string;
  hit_count: number;
  source: string;
  created_at: string;
};

export async function ensurePatternsTable() {
  const sql = getSql();
  await sql`
    create table if not exists ai_merchant_patterns (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users (id) on delete cascade,
      pattern text not null,
      category_id uuid not null references categories (id),
      hit_count int not null default 1,
      source text not null default 'import_learning',
      created_at timestamptz not null default now(),
      unique (user_id, pattern)
    )
  `;
}

export async function learnPattern(
  userId: string,
  description: string,
  categoryId: string,
  source = "import_learning",
) {
  const sql = getSql();
  const pattern = description.slice(0, 80).toLowerCase().trim();
  if (!pattern) return;

  await sql`
    insert into ai_merchant_patterns (user_id, pattern, category_id, source)
    values (${userId}, ${pattern}, ${categoryId}, ${source})
    on conflict (user_id, pattern) do update
    set hit_count = ai_merchant_patterns.hit_count + 1,
        category_id = excluded.category_id
  `;
}

export async function listPatterns(userId: string): Promise<MerchantPattern[]> {
  const sql = getSql();
  const rows = await sql`
    select p.id, p.user_id, p.pattern, p.category_id, p.hit_count, p.source, p.created_at,
           c.name as category_name
    from ai_merchant_patterns p
    join categories c on c.id = p.category_id
    where p.user_id = ${userId}
    order by p.hit_count desc, p.pattern
    limit 100
  `;
  return rows as MerchantPattern[];
}

export async function matchLearnedPattern(
  userId: string,
  description: string,
): Promise<{ categoryId: string; categoryName: string } | null> {
  const sql = getSql();
  const needle = description.toLowerCase().trim();
  const rows = await sql`
    select p.category_id, c.name as category_name, p.pattern
    from ai_merchant_patterns p
    join categories c on c.id = p.category_id
    where p.user_id = ${userId}
    order by p.hit_count desc
  `;

  for (const row of rows as { category_id: string; category_name: string; pattern: string }[]) {
    if (needle.includes(row.pattern) || row.pattern.includes(needle.slice(0, 20))) {
      return { categoryId: row.category_id, categoryName: row.category_name };
    }
  }
  return null;
}
