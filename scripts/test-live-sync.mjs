import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const source = fs.readFileSync("src/hooks/useRefetchOnVisible.ts", "utf8");

test("active screens refresh from the database while visible", () => {
  assert.match(source, /setInterval/);
  assert.match(source, /document\.visibilityState === "visible"/);
  assert.match(source, /financial-snapshot/);
  assert.match(source, /templates/);
  assert.match(source, /clearInterval/);
});
