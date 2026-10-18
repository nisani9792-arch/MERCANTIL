import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const reconciliation = fs.readFileSync("src/lib/db/reconciliation.ts", "utf8");
const importRoute = fs.readFileSync("src/app/api/import/xlsx/route.ts", "utf8");
const matchRoute = fs.readFileSync("src/app/api/reconciliation/[id]/route.ts", "utf8");

test("bank imports enter an explicit unmatched reconciliation state", () => {
  assert.match(importRoute, /reconciliation_status/);
  assert.match(importRoute, /'unmatched'/);
  assert.match(importRoute, /8 \* 1024 \* 1024/);
});

test("reconciliation atomically marks only an eligible planned ledger entry as complete", () => {
  assert.match(reconciliation, /with source_transaction as/);
  assert.match(reconciliation, /completed_ledger as/);
  assert.match(reconciliation, /reconciled_transaction as/);
  assert.match(reconciliation, /confirmation_source = 'automatic'/);
  assert.match(matchRoute, /ledgerEntryId: z\.string\(\)\.uuid\(\)/);
});
