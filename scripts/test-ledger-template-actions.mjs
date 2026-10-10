import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const db = fs.readFileSync("src/lib/db/monthly-ledger.ts", "utf8");
const route = fs.readFileSync("src/app/api/ledger/[id]/template/route.ts", "utf8");
const sheet = fs.readFileSync("src/components/bank/LedgerBottomSheet.tsx", "utf8");
const workspace = fs.readFileSync("src/components/bank/MonthWorkspace.tsx", "utf8");

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

test("monthly category order and full-month templates are persisted server-side", () => {
  assert.match(db, /monthly_ledger_preferences/);
  assert.match(db, /saveMonthlyCategoryOrder/);
  assert.match(db, /createTemplatesFromMonth/);
  assert.match(workspace, /api\/ledger\/category-order/);
  assert.match(workspace, /שמור חודש כתבנית/);
  assert.match(workspace, /draggable/);
});

test("audit logging cannot turn an already saved ledger edit into a failure", () => {
  assert.match(db, /async function writeLedgerChange/);
  assert.match(db, /audit write failed/);
});

test("ordinary ledger writes do not run schema migrations on the save path", () => {
  const updateBlock = db.slice(db.indexOf("export async function updateLedgerEntry"), db.indexOf("export async function deleteLedgerEntry"));
  assert.doesNotMatch(updateBlock, /await ensurePaymentTrackingSchema/);
});

test("payment reversal never sends a display-formatted timestamp back to PostgreSQL", () => {
  assert.match(db, /completedAt instanceof Date \? completedAt\.toISOString\(\)/);
  assert.match(db, /else completed_at end/);
});
