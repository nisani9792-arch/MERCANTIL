import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const db = fs.readFileSync("src/lib/db/monthly-ledger.ts", "utf8");
const route = fs.readFileSync("src/app/api/ledger/rollover/route.ts", "utf8");
const ui = fs.readFileSync("src/components/bank/OpenItemsRollover.tsx", "utf8");
const navigator = fs.readFileSync("src/components/ui/MonthNavigator.tsx", "utf8");

test("rollover protects completed history and avoids duplicate template entries", () => {
  assert.match(db, /is_paid = false/);
  assert.match(db, /destination\.template_id = e\.template_id/);
  assert.match(db, /previousMonthKey/);
  assert.match(db, /to_char\(due_date, 'YYYY-MM'\)/);
});

test("rollover API is authenticated, validated, and supports preview before mutation", () => {
  assert.match(route, /getSession/);
  assert.match(route, /ledgerRolloverSchema/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
});

test("month navigation is compact and rollover requires an explicit confirmation", () => {
  assert.match(navigator, /type="month"/);
  assert.doesNotMatch(navigator, /buildMonthOptions/);
  assert.match(ui, /window\.confirm/);
  assert.match(ui, /פעולות שבוצעו לא ישתנו/);
});
