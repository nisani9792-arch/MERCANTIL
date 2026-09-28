import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const db = fs.readFileSync("src/lib/db/financial-snapshot.ts", "utf8");
const schema = fs.readFileSync("src/lib/db/ensure-schema.ts", "utf8");
const ui = fs.readFileSync("src/components/finance/FinancialSnapshot.tsx", "utf8");

test("financial register covers assets, commitments and future income", () => {
  for (const kind of ["insurance", "loan", "income_source", "provident_fund", "pension", "note"]) {
    assert.match(db, new RegExp(`"${kind}"`));
    assert.match(schema, new RegExp(`'${kind}'`));
    assert.match(ui, new RegExp(`"${kind}"`));
  }
  assert.match(schema, /financial_snapshot_kinds_v2/);
});
