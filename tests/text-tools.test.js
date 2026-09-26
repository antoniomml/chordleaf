import test from "node:test";
import assert from "node:assert/strict";
import { blankLineCount, compressBlankLines } from "../src/text-tools.js";

test("blankLineCount counts whitespace-only lines", () => {
  assert.equal(blankLineCount("[C]Luz\n   \n\n[G]Vuelve\n"), 3);
  assert.equal(blankLineCount("[C]Sin huecos"), 0);
  assert.equal(blankLineCount(""), 1);
});

test("a lone blank line is removed", () => {
  assert.equal(
    compressBlankLines("[C]Luz de día\n\n[G]Vuelve"),
    "[C]Luz de día\n[G]Vuelve",
  );
  assert.equal(compressBlankLines("[C]A\r\n\r\n[G]B"), "[C]A\n[G]B");
  assert.equal(compressBlankLines("[C]A\n   \n[G]B"), "[C]A\n[G]B");
});

test("a run of blank lines keeps exactly one", () => {
  assert.equal(compressBlankLines("A\n\n\nB"), "A\n\nB");
  assert.equal(compressBlankLines("A\n   \n\n\nB"), "A\n\nB");
});

test("edge blanks are trimmed and page breaks stay", () => {
  assert.equal(compressBlankLines("\n\nA\n\nB\n\n\n"), "A\nB");
  assert.equal(
    compressBlankLines("A\n\n\n{new_page}\n\n\nB"),
    "A\n\n{new_page}\n\nB",
  );
});

test("inline chord anchors stay untouched", () => {
  const sheet = "  [C]Luz    [G]del\n\n\n    [Am]día";
  assert.equal(compressBlankLines(sheet), "  [C]Luz    [G]del\n\n    [Am]día");
  assert.equal(
    compressBlankLines(compressBlankLines(sheet)),
    "  [C]Luz    [G]del\n    [Am]día",
  );
});
