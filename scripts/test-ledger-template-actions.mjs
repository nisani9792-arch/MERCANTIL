import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const db = fs.readFileSync("src/lib/db/monthly-ledger.ts", "utf8");
const route = fs.readFileSync("src/app/api/ledger/[id]/template/route.ts", "utf8");
const sheet = fs.readFileSync("src/components/bank/LedgerBottomSheet.tsx", "utf8");

test("converting a monthly transaction creates one protected future template", () => {
  assert.match(db, /createTemplateFromLedgerEntry/);
  assert.match(db, /fixed_templates_source_ledger_unique/);
  assert.match(db, /on conflict \(source_ledger_entry_id\)/);
  assert.match(db, /entry\.entry_kind !== "transaction"/);
  assert.match(route, /day < 1 \|\| day > 31/);
});

test("a completed payment can be explicitly returned to planned state", () => {
  assert.match(sheet, /החזר למתוכנן \(ביטול בוצע\)/);
  assert.match(sheet, /onTogglePaid/);
  assert.match(sheet, /onCreateTemplate/);
});
