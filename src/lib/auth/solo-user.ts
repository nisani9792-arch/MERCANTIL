import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db/client";
import type { UserRow } from "@/lib/auth/users";

const SOLO_EMAIL = (process.env.SOLO_USER_EMAIL ?? "owner@mercantil.local").toLowerCase();
const SOLO_NAME = process.env.SOLO_USER_NAME ?? "בעלים";

/** Single-user app — provision the lone account on first PIN login */
export async function getOrCreateSoloUser(): Promise<UserRow> {
  const sql = getSql();

  const existing = await sql`
    select id, email, password_hash, full_name, avatar_url,
           default_currency, locale, created_at, updated_at
    from users where email = ${SOLO_EMAIL} limit 1
  `;

  if (existing.length) {
    return existing[0] as UserRow;
  }

  const passwordHash = await bcrypt.hash(randomUUID(), 12);
  const created = await sql`
    insert into users (email, password_hash, full_name)
    values (${SOLO_EMAIL}, ${passwordHash}, ${SOLO_NAME})
    returning id, email, password_hash, full_name, avatar_url,
              default_currency, locale, created_at, updated_at
  `;

  return created[0] as UserRow;
}
