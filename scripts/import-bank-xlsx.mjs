#!/usr/bin/env node
/**
 * Import Mercantil bank xlsx + learn merchant patterns
 * Usage: node scripts/import-bank-xlsx.mjs [path-to-xlsx]
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });
dotenv.config();

const require = createRequire(import.meta.url);
const ExcelJS = require("exceljs");

const xlsxPath =
  process.argv[2] ||
  "c:\\Users\\SHIMON YOHAY NISANI\\Downloads\\עובר ושב_15062026_0301.xlsx";

const SEED_EMAIL = process.env.SEED_USER_EMAIL || "shin@mercantil.app";
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD || "Mercantil2026!";
const SEED_NAME = process.env.SEED_USER_NAME || "SHIN";

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

// ── Inline parser (mirrors src/lib/parsers/mercantil-xlsx.ts) ──
async function parseXlsx(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  let accountHolder;
  const r3c1 = String(sheet.getRow(3).getCell(1).value ?? "");
  const r3c2 = String(sheet.getRow(3).getCell(2).value ?? "");
  if (r3c1.includes("חשבון")) {
    accountHolder = r3c2 || SEED_NAME;
  }

  const rows = [];
  for (let r = 9; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const desc = String(row.getCell(3).value ?? "").trim();
    const amt = Number(row.getCell(4).value);
    if (!desc || !amt) continue;
    const d = row.getCell(1).value;
    const date =
      d instanceof Date ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    rows.push({
      date,
      description: desc,
      amount: amt,
      reference: String(row.getCell(6).value ?? ""),
    });
  }
  return { accountHolder, rows };
}

const RULES = [
  [/משכורת|סיטרוק|citro/i, "משכורת", "income"],
  [/הפועלים משכורת/i, "משכורת", "income"],
  [/ביטוח לאומי.*ילד/i, "הכנסה אחרת", "income"],
  [/משרד הבינ/i, "הכנסה אחרת", "income"],
  [/הפקדת שיק|זיכוי/i, "הכנסה אחרת", "income"],
  [/חיוב.*ויזה|חיוב.*כרטיס|חיוב מיידי/i, "מנויים", "expense"],
  [/ארנונה|דיור|rent/i, "דיור", "expense"],
  [/דלק|תחבורה/i, "תחבורה", "expense"],
  [/ביטוח(?! לאומי)/i, "ביטוח", "expense"],
];

function classify(desc, amount) {
  for (const [re, cat, type] of RULES) {
    if (re.test(desc)) return { categoryName: cat, type };
  }
  return amount > 0
    ? { categoryName: "הכנסה אחרת", type: "income" }
    : { categoryName: "אחר", type: "expense" };
}

async function main() {
  console.log("Reading", xlsxPath);
  const buffer = readFileSync(xlsxPath);
  const { accountHolder, rows } = await parseXlsx(buffer);
  console.log(`Parsed ${rows.length} transactions for ${accountHolder ?? SEED_NAME}`);

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

  const email = SEED_EMAIL.toLowerCase();
  let users = await sql`select id from users where email = ${email}`;
  let userId;

  if (users.length === 0) {
    const hash = await bcrypt.hash(SEED_PASSWORD, 12);
    const created = await sql`
      insert into users (email, password_hash, full_name)
      values (${email}, ${hash}, ${accountHolder ?? SEED_NAME})
      returning id
    `;
    userId = created[0].id;
    console.log("Created user:", email);
  } else {
    userId = users[0].id;
    console.log("Using existing user:", email);
  }

  const cats = await sql`
    select id, name, type from categories
    where user_id is null or user_id = ${userId}
  `;
  const catMap = new Map(cats.map((c) => [`${c.name}|${c.type}`, c.id]));

  let imported = 0;
  let skipped = 0;
  let learned = 0;

  for (const row of rows) {
    const hash = `${row.date}|${row.amount}|${row.description}|${row.reference}`.slice(0, 200);
    const existing = await sql`
      select id from transactions where user_id = ${userId} and import_hash = ${hash} limit 1
    `;
    if (existing.length) {
      skipped++;
      continue;
    }

    const { categoryName, type } = classify(row.description, row.amount);
    const key = `${categoryName}|${type}`;
    let categoryId = catMap.get(key);
    if (!categoryId) {
      const ins = await sql`
        insert into categories (user_id, name, type)
        values (${userId}, ${categoryName}, ${type}::category_type)
        returning id
      `;
      categoryId = ins[0].id;
      catMap.set(key, categoryId);
    }

    await sql`
      insert into transactions (user_id, amount, date, category_id, account_source, notes, import_hash)
      values (
        ${userId},
        ${Math.abs(row.amount)},
        ${row.date}::date,
        ${categoryId},
        'עובר ושב',
        ${row.description},
        ${hash}
      )
    `;
    imported++;

    const pattern = row.description.slice(0, 80).toLowerCase();
    await sql`
      insert into ai_merchant_patterns (user_id, pattern, category_id, source)
      values (${userId}, ${pattern}, ${categoryId}, 'mercantil_xlsx')
      on conflict (user_id, pattern) do update
      set hit_count = ai_merchant_patterns.hit_count + 1
    `;
    learned++;
  }

  const summary = await sql`
    select
      coalesce(sum(case when c.type = 'income' then t.amount else 0 end), 0) as income,
      coalesce(sum(case when c.type = 'expense' then t.amount else 0 end), 0) as expense
    from transactions t join categories c on c.id = t.category_id
    where t.user_id = ${userId}
  `;

  console.log("\n=== Import complete ===");
  console.log("Imported:", imported, "| Skipped (dup):", skipped);
  console.log("Patterns learned:", learned);
  console.log("Total income: ₪", Number(summary[0].income).toFixed(2));
  console.log("Total expense: ₪", Number(summary[0].expense).toFixed(2));
  console.log("Balance: ₪", (Number(summary[0].income) - Number(summary[0].expense)).toFixed(2));
  console.log("\nLogin:", email, "| Password:", SEED_PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
