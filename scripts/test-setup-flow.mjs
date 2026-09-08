import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const setupRoute = fs.readFileSync("src/app/api/setup/route.ts", "utf8");
const templateRoute = fs.readFileSync("src/app/api/templates/route.ts", "utf8");
const monthlyLedger = fs.readFileSync("src/lib/db/monthly-ledger.ts", "utf8");

test("full reset clears every monthly row and verifies the result", () => {
  const resetHandler = setupRoute.slice(setupRoute.indexOf("export async function DELETE"));
  assert.match(resetHandler, /delete from monthly_ledger where user_id/);
  assert.doesNotMatch(resetHandler, /delete from monthly_ledger[\s\S]{0,80}month_key/);
  assert.match(setupRoute, /select count\(\*\) from monthly_ledger/);
  assert.match(setupRoute, /Reset verification failed/);
});

test("empty data is not silently repopulated with demo templates", () => {
  assert.doesNotMatch(templateRoute, /seedDefaultTemplates/);
  assert.doesNotMatch(monthlyLedger, /seedDefaultTemplates/);
});

test("editing setup preserves identifiers and can update the current month", () => {
  assert.match(setupRoute, /historyPreserved: !isFirstSetup/);
  assert.match(setupRoute, /existingIds\.has\(item\.id\)/);
  assert.match(setupRoute, /on conflict \(id\) do update/);
  assert.match(setupRoute, /applyToCurrentMonth/);
  assert.match(setupRoute, /update monthly_ledger e/);
  assert.match(setupRoute, /Setup verification failed/);
});

test("setup JSON field names match the database recordset fields", () => {
  assert.match(setupRoute, /is_variable: item\.type === "expense"/);
  assert.match(setupRoute, /sort_order: index \+ 1/);
  assert.match(setupRoute, /is_variable boolean, sort_order int/);
});
