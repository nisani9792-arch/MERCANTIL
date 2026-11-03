import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
const loaded = {};
new Function(
  "exports",
  ts.transpileModule(fs.readFileSync("src/lib/ledger/workspace.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
)(loaded);
const row = (id, type, amount, extra = {}) => ({
  id,
  name: id,
  category: "אחר",
  entry_kind: "transaction",
  type,
  amount,
  is_paid: false,
  amount_pending: false,
  ...extra,
});
test("month list separates income and expenses and excludes wallet transfers", () => {
  const items = [
    row("rent", "expense", 3000),
    row("salary", "income", 8000),
    row("cash", "expense", 500, { entry_kind: "cash_withdrawal" }),
  ];
  assert.deepEqual(
    loaded.filterMonthEntries(items, "expense", "", "all").map((x) => x.id),
    ["rent"],
  );
  assert.equal(loaded.filterMonthEntries(items, "all", "", "all").length, 2);
});
test("missing amount filter distinguishes blank income from an explicit zero", () => {
  const items = [
    row("unknown", "income", 0, { amount_pending: true }),
    row("zero", "income", 0),
  ];
  assert.deepEqual(
    loaded.filterMonthEntries(items, "income", "", "missing").map((x) => x.id),
    ["unknown"],
  );
});
test("search and completion filters combine without rewriting stored order", () => {
  const items = [
    row("B", "expense", 0, {
      name: "חשמל",
      category: "חשבונות",
      is_paid: true,
    }),
    row("A", "expense", 10, { name: "מים", category: "חשבונות" }),
  ];
  assert.equal(
    loaded.filterMonthEntries(items, "expense", " חשבונות ", "done")[0].name,
    "חשמל",
  );
  assert.equal(
    loaded.filterMonthEntries(items, "expense", "חיפוש שלא קיים", "all").length,
    0,
  );
  assert.deepEqual(
    items.map((x) => x.id),
    ["B", "A"],
  );
});
test("financial totals exclude inactive records and preserve unknown balances", () => {
  const items = [
    { kind: "savings", amount: null, is_active: true },
    { kind: "loan", amount: 900, is_active: false },
  ];
  assert.equal(loaded.snapshotTotal(items, ["savings"]), null);
  assert.equal(loaded.snapshotTotal(items, ["loan"]), null);
  assert.equal(
    loaded.snapshotTotal(
      [{ kind: "account", amount: 0, is_active: true }],
      ["account"],
    ),
    0,
  );
});
test("financial totals sum known amounts in cents", () => {
  assert.equal(
    loaded.snapshotTotal(
      [
        { kind: "savings", amount: 0.1, is_active: true },
        { kind: "savings", amount: 0.2, is_active: true },
        { kind: "savings", amount: null, is_active: true },
      ],
      ["savings"],
    ),
    0.3,
  );
});

test("month list respects saved category order", () => {
  const items = [
    row("first", "expense", 100, { category: "דיור" }),
    row("second", "expense", 200, { category: "חשבונות" }),
  ];
  assert.deepEqual(
    loaded
      .filterMonthEntries(items, "expense", "", "all", ["חשבונות", "דיור"])
      .map((x) => x.id),
    ["second", "first"],
  );
});
