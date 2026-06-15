#!/usr/bin/env node
/**
 * Remove temporary bank holds ("חיוב זמני") from transactions and learned patterns.
 * Usage: node scripts/clean-irrelevant.mjs [user-email]
 */
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

const IRRELEVANT = /חיוב\s*זמני/i;

async function main() {
  const users = await sql`select id, email from users where email = ${email}`;
  if (!users.length) {
    console.error("User not found:", email);
    process.exit(1);
  }
  const userId = users[0].id;

  const toDelete = await sql`
    select id, notes, amount, date from transactions
    where user_id = ${userId}
      and notes ilike '%חיוב זמני%'
  `;

  console.log(`Found ${toDelete.length} irrelevant transactions for ${email}`);

  if (toDelete.length === 0) {
    console.log("Nothing to clean.");
    return;
  }

  const deleted = await sql`
    delete from transactions
    where user_id = ${userId}
      and notes ilike '%חיוב זמני%'
    returning id
  `;

  const patterns = await sql`
    delete from ai_merchant_patterns
    where user_id = ${userId}
      and pattern ilike '%חיוב זמני%'
    returning id
  `;

  const summary = await sql`
    select
      coalesce(sum(case when c.type = 'income' then t.amount else 0 end), 0) as income,
      coalesce(sum(case when c.type = 'expense' then t.amount else 0 end), 0) as expense
    from transactions t
    join categories c on c.id = t.category_id
    where t.user_id = ${userId}
      and (t.notes is null or t.notes not ilike '%חיוב זמני%')
  `;

  console.log("Deleted transactions:", deleted.length);
  console.log("Deleted patterns:", patterns.length);
  console.log(
    "Remaining totals — income: ₪",
    Number(summary[0].income).toFixed(2),
    "| expense: ₪",
    Number(summary[0].expense).toFixed(2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
