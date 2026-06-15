#!/usr/bin/env node
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });
dotenv.config();

const email = (process.argv[2] || process.env.SEED_USER_EMAIL || "shin@mercantil.app").toLowerCase();

function normalizeDatabaseUrl(raw) {
  if (!raw) return "";
  let s = String(raw).trim().replace(/^DATABASE_URL\s*=\s*/i, "").trim();
  while ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = neon(url);

async function main() {
  const users = await sql`select id, email from users where email = ${email}`;
  if (!users.length) {
    console.error("User not found:", email);
    process.exit(1);
  }
  const userId = users[0].id;

  const temp = await sql`
    delete from transactions
    where user_id = ${userId}
      and notes ilike '%חיוב זמני%'
    returning id
  `;

  const imported = await sql`
    delete from transactions
    where user_id = ${userId}
      and import_hash is not null
    returning id
  `;

  const patterns = await sql`
    delete from ai_merchant_patterns
    where user_id = ${userId}
    returning id
  `;

  const left = await sql`
    select count(*)::int as n from transactions where user_id = ${userId}
  `;

  console.log("Removed temporary charges:", temp.length);
  console.log("Removed bank imports:", imported.length);
  console.log("Removed learned patterns:", patterns.length);
  console.log("Remaining manual entries:", left[0].n);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
