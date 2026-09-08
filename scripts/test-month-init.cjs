const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function loadLedger(created) {
  let statements;
  const sql = (parts, ...values) => ({ text: parts.join('?'), values });
  sql.transaction = async (queries) => {
    statements = queries;
    return [[], Array.from({ length: created }, (_, id) => ({ id }))];
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/lib/db/monthly-ledger.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => {
    if (name.endsWith('/client')) return { getSql: () => sql };
    if (name.endsWith('/recurring-templates')) return { seedDefaultTemplates: async () => {} };
    if (name.endsWith('/month')) return { currentMonthKey: () => '2026-09' };
    throw new Error(`Unexpected dependency: ${name}`);
  }});
  return { init: exports.initMonthFromTemplates, queries: () => statements };
}

test('initialization returns inserted count and locks the user/month', async () => {
  const ledger = loadLedger(3);
  const result = await ledger.init('test-user', '2026-09');
  assert.equal(result.created, 3);
  assert.equal(result.skipped, false);
  assert.match(ledger.queries()[0].text, /pg_advisory_xact_lock/);
  assert.equal(ledger.queries()[0].values[0], 'test-user:2026-09');
});

test('existing monthly edits are never updated; only missing templates are copied', async () => {
  const ledger = loadLedger(1);
  await ledger.init('test-user', '2026-10');
  const query = ledger.queries()[1];
  assert.match(query.text, /not exists/);
  assert.match(query.text, /e.template_id = t.id/);
  assert.match(query.text, /t.is_active = true/);
  assert.doesNotMatch(query.text, /\bupdate\b/i);
  assert.ok(query.values.includes(10));
});

test('no eligible new templates produces an explicit skipped result', async () => {
  const result = await loadLedger(0).init('test-user', '2026-09');
  assert.equal(result.created, 0);
  assert.equal(result.skipped, true);
});
