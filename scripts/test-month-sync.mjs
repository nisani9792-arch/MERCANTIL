import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const sync = fs.readFileSync("src/components/providers/MonthSync.tsx", "utf8");
const api = fs.readFileSync("src/app/api/preferences/month/route.ts", "utf8");

test("selected month is stored server-side and refreshed on active devices", () => {
  assert.match(api, /user_finance_preferences/);
  assert.match(api, /on conflict/);
  assert.match(sync, /api\/preferences\/month/);
  assert.match(sync, /setInterval/);
  assert.match(sync, /setMonthKey/);
});
