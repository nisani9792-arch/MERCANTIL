import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const sources = {
  setupApi: fs.readFileSync("src/app/api/setup/route.ts", "utf8"),
  ledgerApi: fs.readFileSync("src/app/api/ledger/route.ts", "utf8"),
  ledgerItemApi: fs.readFileSync("src/app/api/ledger/[id]/route.ts", "utf8"),
  templateItemApi: fs.readFileSync("src/app/api/templates/[id]/route.ts", "utf8"),
  ledgerSheet: fs.readFileSync("src/components/bank/LedgerBottomSheet.tsx", "utf8"),
  templateList: fs.readFileSync("src/components/templates/TemplateList.tsx", "utf8"),
};

test("zero is accepted by every monthly planning API", () => {
  assert.match(sources.setupApi, /item\.amount >= 0/);
  assert.match(sources.ledgerApi, /Number\(body\.amount\) < 0/);
  assert.match(sources.ledgerItemApi, /body\.amount < 0/);
  assert.match(sources.templateItemApi, /body\.amount < 0/);
});

test("zero is accepted by monthly and template editors", () => {
  assert.match(sources.ledgerSheet, /Number\(amount\) >= 0/);
  assert.match(sources.templateList, /Number\(draft\.amount\) >= 0/);
});

test("monthly drafts survive navigation until the server confirms saving", () => {
  assert.match(sources.ledgerSheet, /localStorage\.setItem/);
  assert.match(sources.ledgerSheet, /await onSave/);
  assert.match(sources.ledgerSheet, /localStorage\.removeItem/);
});
