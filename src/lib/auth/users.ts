import bcrypt from "bcryptjs";
import { getSql } from "@/lib/db/client";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  avatar_url: string | null;
  default_currency: string;
  locale: string;
  created_at: string;
  updated_at: string;
};

export async function findUserByEmail(
  email: string,
): Promise<UserRow | null> {
  const sql = getSql();
  const rows = await sql`
    select id, email, password_hash, full_name, avatar_url,
           default_currency, locale, created_at, updated_at
    from users where email = ${email.toLowerCase().trim()} limit 1
  `;
  return (rows[0] as UserRow | undefined) ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const sql = getSql();
  const rows = await sql`
    select id, email, password_hash, full_name, avatar_url,
           default_currency, locale, created_at, updated_at
    from users where id = ${id} limit 1
  `;
  return (rows[0] as UserRow | undefined) ?? null;
}

export async function createUser(input: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<UserRow> {
  const sql = getSql();
  const email = input.email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(input.password, 12);

  const rows = await sql`
    insert into users (email, password_hash, full_name)
    values (${email}, ${passwordHash}, ${input.fullName ?? null})
    returning id, email, password_hash, full_name, avatar_url,
              default_currency, locale, created_at, updated_at
  `;
  return rows[0] as UserRow;
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
