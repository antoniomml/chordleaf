import test from "node:test";
import assert from "node:assert/strict";
import {
  countPdfContent,
  countPdfItems,
  readPdfContent,
  PDF_ITEM_LIMIT,
} from "../src/import-limits.js";

function textStream(chunks, { onCancel } = {}) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      if (!onCancel) controller.close();
    },
    cancel() {
      onCancel?.();
    },
  });
}

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

test("streamed PDF text accumulates items, styles and budget per chunk", async () => {
  const budget = { characters: 0, items: 0 };
  const content = await readPdfContent(
    textStream([
      {
        items: [{ str: "ab", fontName: "f1" }],
        styles: { f1: { fontFamily: "mono" } },
      },
      { items: [{ str: "cde", fontName: "f2" }], styles: {} },
    ]),
    budget,
  );
  assert.deepEqual(
    content.items.map((item) => item.str),
    ["ab", "cde"],
  );
  assert.equal(content.styles.f1.fontFamily, "mono");
  assert.deepEqual(budget, { characters: 5, items: 2 });
});

test("streamed PDF text is cancelled as soon as a chunk exceeds the budget", async () => {
  let cancelled = false;
  const stream = textStream(
    [
      { items: [{ str: "x".repeat(1000) }] },
      { items: [{ str: "x".repeat(50000) }] },
    ],
    { onCancel: () => (cancelled = true) },
  );
  await assert.rejects(
    readPdfContent(stream, { characters: 0, items: 0 }),
    /demasiado texto/,
  );
  assert.equal(cancelled, true);
});

test("streamed PDF chunks reject long fragments and item floods", async () => {
  await assert.rejects(
    readPdfContent(textStream([{ items: [{ str: "x".repeat(2001) }] }]), {
      characters: 0,
      items: 0,
    }),
  );
  await assert.rejects(
    readPdfContent(
      textStream([
        {
          items: Array.from({ length: PDF_ITEM_LIMIT + 1 }, () => ({
            str: "",
          })),
        },
      ]),
      { characters: 0, items: 0 },
    ),
  );
  assert.throws(() =>
    countPdfItems(
      Array.from({ length: PDF_ITEM_LIMIT + 1 }, () => ({ str: "" })),
      { characters: 0, items: 0 },
    ),
  );
});
