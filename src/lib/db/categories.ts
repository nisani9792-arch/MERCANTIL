import { getSql } from "@/lib/db/client";
import type { Category, CategoryType } from "@/types";

export async function listCategories(userId: string): Promise<Category[]> {
  const sql = getSql();
  const rows = await sql`
    select id, user_id, name, type, icon, sort_order, created_at
    from categories
    where user_id is null or user_id = ${userId}
    order by type, sort_order, name
  `;
  return rows as Category[];
}

export async function createCategory(
  userId: string,
  input: { name: string; type: CategoryType; icon?: string },
): Promise<Category> {
  const sql = getSql();
  const rows = await sql`
    insert into categories (user_id, name, type, icon)
    values (${userId}, ${input.name}, ${input.type}::category_type, ${input.icon ?? "circle"})
    returning id, user_id, name, type, icon, sort_order, created_at
  `;
  return rows[0] as Category;
}

export async function deleteCategory(
  userId: string,
  categoryId: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    delete from categories
    where id = ${categoryId} and user_id = ${userId}
    returning id
  `;
  return rows.length > 0;
}

export async function findCategoryByName(
  userId: string,
  name: string,
  type: CategoryType,
): Promise<Category | null> {
  const sql = getSql();
  const rows = await sql`
    select id, user_id, name, type, icon, sort_order, created_at
    from categories
    where name = ${name} and type = ${type}::category_type
      and (user_id is null or user_id = ${userId})
    limit 1
  `;
  return (rows[0] as Category | undefined) ?? null;
}
