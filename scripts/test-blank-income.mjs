import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, console, require: (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`, mocks);
    return require(name);
  }});
  return exports;
}

const amounts = () => load("src/lib/ledger/income-amount.ts");
const pendingIncome = { id: "income-1", user_id: "owner", month_key: "2026-10", name: "משכורת", type: "income", amount: 0, amount_pending: true, is_paid: false, entry_kind: "transaction", payment_method: "bank" };
class RouteError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
function ledger(sql) {
  return load("src/lib/db/monthly-ledger.ts", {
    "@/lib/db/client": { getSql: () => sql },
    "@/lib/db/income-amounts": { ensureIncomeAmounts: async () => {} },
    "@/lib/api/route": { RouteError },
  });
}

test("blank income remains distinct from an explicit zero and from an entered salary", () => {
  const { incomeAmountState, incomeAmountInput } = amounts();
  assert.equal(incomeAmountInput({ amount: 0, amount_pending: true }), "");
  assert.equal(incomeAmountInput({ amount: 0, amount_pending: false }), "0");
  assert.equal(incomeAmountInput({ amount: 7000 }), "7000");
  assert.equal(incomeAmountState("income", 0, true).amountPending, true);
  assert.throws(() => incomeAmountState("expense", 0, true));
  assert.throws(() => incomeAmountState("income", 7000, true));
});

test("API validation accepts blank income, rejects blank expenses and contradictory confirmations", () => {
  const { ledgerCreateSchema, ledgerUpdateSchema } = load("src/lib/ledger/validation.ts");
  const input = { name: "משכורת", type: "income", amount: 0, amountPending: true };
  assert.equal(ledgerCreateSchema.safeParse(input).success, true);
  assert.equal(ledgerCreateSchema.safeParse({ ...input, type: "expense" }).success, false);
  assert.equal(ledgerCreateSchema.safeParse({ ...input, amount: 1200 }).success, false);
  assert.equal(ledgerUpdateSchema.safeParse({ amount: 0, amountPending: true, isPaid: true }).success, false);
  assert.equal(ledgerUpdateSchema.safeParse({ amount: 1200, amountPending: false }).success, true);
});

test("pending income cannot be marked complete even if the client sends only isPaid", async () => {
  const statements = [];
  const sql = async (parts) => { statements.push(parts.join("?")); return [pendingIncome]; };
  await assert.rejects(() => ledger(sql).updateLedgerEntry("owner", "income-1", { isPaid: true }), /יש להזין סכום/);
  assert.equal(statements.length, 1);
});

test("editing a pending income passes the entered salary and clears the pending flag", async () => {
  const calls = [];
  const sql = async (parts, ...values) => {
    const text = parts.join("?"); calls.push({ text, values });
    return text.includes("update monthly_ledger") ? [{ ...pendingIncome, amount: 7000, amount_pending: false }] : [pendingIncome];
  };
  const saved = await ledger(sql).updateLedgerEntry("owner", "income-1", { amount: 7000 });
  assert.equal(saved.amount, 7000);
  assert.equal(saved.amount_pending, false);
  const update = calls.find((c) => c.text.includes("update monthly_ledger"));
  assert.equal(update.values[1], 7000);
  assert.equal(update.values[2], false);
});

test("a named income with no amount survives listing and contributes no phantom money", async () => {
  const sql = async (parts) => parts.join("?").includes("select * from monthly_ledger")
    ? [pendingIncome, { ...pendingIncome, id: "paid", amount: 5000, amount_pending: false, is_paid: true }]
    : [{ withdrawn: 0, spent: 0 }];
  const db = ledger(sql);
  const entries = await db.listLedgerEntries("owner", "2026-10");
  const summary = await db.getMonthSummary("owner", "2026-10", entries);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, "משכורת");
  assert.equal(entries[0].amount_pending, true);
  assert.equal(summary.totalIncome, 5000);
  assert.equal(summary.actualIncome, 5000);
});

test("migration is serialized, additive, one-time and never touches the information register", async () => {
  const statements = [];
  const sql = (parts, ...values) => ({ text: parts.join("?"), values });
  sql.transaction = async (queries) => { statements.push(...queries); return []; };
  const { ensureIncomeAmounts } = load("src/lib/db/income-amounts.ts", { "@/lib/db/client": { getSql: () => sql } });
  await Promise.all([ensureIncomeAmounts(), ensureIncomeAmounts()]);
  const updates = statements.filter((s) => s.text.startsWith("update"));
  assert.equal(updates.length, 2);
  for (const { text } of updates) {
    assert.match(text, /type = 'income' and amount = 0\.10/);
    assert.match(text, /not exists.*app_schema_migrations/s);
  }
  assert.match(statements[0].text, /pg_advisory_xact_lock/);
  assert.doesNotMatch(statements.map((s) => s.text).join("\n"), /delete|financial_snapshot_items/i);
});
