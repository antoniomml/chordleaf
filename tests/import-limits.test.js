import test from "node:test";
import assert from "node:assert/strict";
import { countPdfContent } from "../src/import-limits.js";
test("PDF text budgets accumulate across pages before expensive measurement", () => {
  const budget = { characters: 0, items: 0 };
  const page = {
    items: Array.from({ length: 25 }, () => ({ str: "x".repeat(1000) })),
  };
  countPdfContent(page, budget);
  countPdfContent(page, budget);
  assert.equal(budget.characters, 50000);
  assert.throws(() => countPdfContent({ items: [{ str: "x" }] }, budget));
});
test("PDF budgets reject pathological fragments and item counts", () => {
  assert.throws(() =>
    countPdfContent(
      { items: [{ str: "x".repeat(2001) }] },
      { characters: 0, items: 0 },
    ),
  );
  assert.throws(() =>
    countPdfContent(
      { items: Array.from({ length: 20001 }, () => ({ str: "" })) },
      { characters: 0, items: 0 },
    ),
  );
});
