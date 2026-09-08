import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const setupRoute = fs.readFileSync("src/app/api/setup/route.ts", "utf8");
const templateRoute = fs.readFileSync("src/app/api/templates/route.ts", "utf8");
const monthlyLedger = fs.readFileSync("src/lib/db/monthly-ledger.ts", "utf8");

test("full reset clears every monthly row and verifies the result", () => {
  assert.match(setupRoute, /delete from monthly_ledger where user_id/);
  assert.doesNotMatch(setupRoute, /delete from monthly_ledger[\s\S]{0,80}month_key/);
  assert.match(setupRoute, /select count\(\*\) from monthly_ledger/);
  assert.match(setupRoute, /Reset verification failed/);
});

test("empty data is not silently repopulated with demo templates", () => {
  assert.doesNotMatch(templateRoute, /seedDefaultTemplates/);
  assert.doesNotMatch(monthlyLedger, /seedDefaultTemplates/);
});

test("editing setup preserves existing monthly history", () => {
  assert.match(setupRoute, /historyPreserved: !isFirstSetup/);
  assert.match(setupRoute, /isFirstSetup \? \[sql/);
});
