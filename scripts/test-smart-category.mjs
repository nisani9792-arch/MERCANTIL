import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadClassifier() {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync("src/lib/ai/smart-category.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports });
  return exports.inferExpenseCategory;
}

const classify = loadClassifier();

const cases = [
  ["קניות ברמי לוי", "מזון"],
  ["וולט ארוחת ערב", "מסעדות"],
  ["תדלוק פז", "תחבורה"],
  ["תשלום נטפליקס", "מנויים"],
  ["תרופה בסופר-פארם", "בריאות"],
  ["שכר דירה", "דיור"],
  ["צהרון לילדים", "ילדים"],
  ["הזמנה מאמזון", "קניות"],
];

for (const [description, expected] of cases) {
  test(`classifies ${description} as ${expected}`, () => {
    const result = classify(description);
    assert.equal(result.category, expected);
    assert.ok(result.confidence >= 0.8);
  });
}

test("falls back safely for an unknown description", () => {
  assert.equal(classify("תשלום כללי").category, "אחר");
});
