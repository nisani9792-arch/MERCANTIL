import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadLedger(created) {
  let statement;
  const sql = (parts, ...values) => ({ text: parts.join("?"), values });
  const query = (parts, ...values) => {
    statement = sql(parts, ...values);
    return Promise.resolve(Array.from({ length: created }, (_, id) => ({ id })));
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync("src/lib/db/monthly-ledger.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => {
    if (name.endsWith("/client")) return { getSql: () => query };
    if (name.endsWith("/income-amounts")) return { ensureIncomeAmounts: async () => {} };
    if (name.endsWith("/income-amount")) return {};
    if (name.endsWith("/route")) return {};
    if (name.endsWith("/recurring-templates")) return { seedDefaultTemplates: async () => {} };
    if (name.endsWith("/month")) return { currentMonthKey: () => "2026-09" };
    throw new Error(`Unexpected dependency: ${name}`);
  }});
  return { init: exports.initMonthFromTemplates, query: () => statement };
}

test("initialization returns the inserted count", async () => {
  const ledger = loadLedger(3);
  const result = await ledger.init("test-user", "2026-09", ["11111111-1111-1111-1111-111111111111"]);
  assert.equal(result.created, 3);
  assert.equal(result.skipped, false);
  assert.match(ledger.query().text, /insert into monthly_ledger/);
});

test("existing monthly edits are never updated; only missing templates are copied", async () => {
  const ledger = loadLedger(1);
  await ledger.init("test-user", "2026-10", ["11111111-1111-1111-1111-111111111111"]);
  const query = ledger.query();
  assert.match(query.text, /not exists/);
  assert.match(query.text, /e.template_id = t.id/);
  assert.match(query.text, /t.is_active = true/);
  assert.doesNotMatch(query.text, /\bupdate\b/i);
  assert.match(query.text, /on conflict do nothing/i);
  assert.ok(query.values.includes(10));
});

test("no eligible new templates produces an explicit skipped result", async () => {
  const result = await loadLedger(0).init("test-user", "2026-09", ["11111111-1111-1111-1111-111111111111"]);
  assert.equal(result.created, 0);
  assert.equal(result.skipped, true);
});

test("a new month stays empty without an explicit selection", async () => {
 const ledger = loadLedger(3); const result=await ledger.init("test-user", "2026-11");
 assert.equal(result.created,0); assert.equal(result.skipped,true); assert.equal(ledger.query(),undefined);
});
