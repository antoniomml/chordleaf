import test from "node:test";
import assert from "node:assert/strict";
import { downloadName } from "../src/files.js";

test("download names drop unsafe characters and keep the song title", () => {
  assert.equal(downloadName("Luz / del : día", "Canción"), "Luz - del - día");
  assert.equal(downloadName("C:\\temp\\a\u0000b", "Canción"), "C--temp-ab");
  assert.equal(downloadName("a\nb\tc", "Canción"), "abc");
  assert.equal(downloadName("  Corazón  ", "Canción"), "Corazón");
});

test("download names fall back when the title is empty", () => {
  assert.equal(downloadName("", "Canción"), "Canción");
  assert.equal(downloadName("   ", "Canción"), "Canción");
  assert.equal(downloadName(undefined, "Canción"), "Canción");
  assert.equal(downloadName("///", "Canción"), "---");
});
