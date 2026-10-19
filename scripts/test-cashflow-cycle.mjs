import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadCycle() {
  const source = fs.readFileSync("src/lib/cashflow/cycle.ts", "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("exports", output)(exports);
  return exports;
}

test("cashflow cycle spans the 10th through the 9th without rewriting ledger months", () => {
  const { cycleBounds, buildCashflowCycle } = loadCycle();
  assert.deepEqual(cycleBounds("2026-10", 10), { startDate: "2026-10-10", endDate: "2026-11-09" });
  const entry = (name, type, amount, due_date, is_paid = false) => ({ id: name, name, type, amount, due_date, is_paid });
  const cycle = buildCashflowCycle([
    entry("משכורת", "income", 10000, "2026-10-10", true),
    entry("שכר נוסף", "income", 2000, "2026-11-03"),
    entry("שכירות", "expense", 4000, "2026-10-12"),
    entry("קניות", "expense", 900, null),
  ], "2026-10", 10, new Date("2026-10-11T12:00:00Z"));
  assert.equal(cycle.confirmedNet, 10000);
  assert.equal(cycle.forecastNet, 8000);
  assert.equal(cycle.undated.length, 1);
});
