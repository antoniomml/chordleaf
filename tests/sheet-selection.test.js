import test from "node:test";
import assert from "node:assert/strict";
import {
  lyricSourceOffset,
  displaySourceBoundary,
  backspaceSheetBoundary,
} from "../src/sheet-selection.js";

test("selection boundaries include selected chords and preserve endpoint chords", () => {
  const raw = "[C]Una [G]casa[Am]";
  assert.equal(lyricSourceOffset(raw, 0), 0);
  assert.equal(lyricSourceOffset(raw, 4), 7);
  assert.equal(raw.slice(lyricSourceOffset(raw, 4)), "[G]casa[Am]");
  assert.equal(lyricSourceOffset(raw, 8), 14);
  assert.equal(lyricSourceOffset(raw, 8, true), raw.length);
});

test("blank visual padding never selects source beyond a verse", () => {
  assert.equal(lyricSourceOffset("[Cmaj7]Luz", 40, true), 10);
  assert.equal(lyricSourceOffset("[C][G]", 0), 0);
  assert.equal(lyricSourceOffset("[C][G]", 1, true), 6);
});

test("selection boundaries never split a grapheme or literal bracketed heading", () => {
  const raw = "[C]a👨‍👩‍👧‍👦 [Estribillo] fin";
  assert.equal(lyricSourceOffset(raw, 2), 4);
  const heading = raw.indexOf("[Estribillo]");
  assert.equal(lyricSourceOffset(raw, heading - 3 + 1), heading);
});

test("printed row maps include the terminal caret boundary and collision padding", () => {
  assert.equal(displaySourceBoundary([0, 1, 2], 3), 3);
  assert.equal(displaySourceBoundary([0, 0, 1, 2, 2], 4), 2);
  assert.equal(displaySourceBoundary([0, 0, 1, 2, 2], 5), 3);
  assert.equal(displaySourceBoundary([25, 26, 27], 3), 28);
  assert.equal(displaySourceBoundary(undefined, 0), 0);
});

test("backspace joins verses and removes empty lines without losing chords", () => {
  assert.deepEqual(
    backspaceSheetBoundary("[C]Una casa\n[Am]Otro verso\nFinal", 1, 0),
    { text: "[C]Una casa[Am]Otro verso\nFinal", index: 0, at: 8, offset: 11 },
  );
  assert.deepEqual(backspaceSheetBoundary("Antes\n\nDespués", 1, 0), {
    text: "Antes\nDespués",
    index: 0,
    at: 5,
    offset: 5,
  });
  assert.equal(backspaceSheetBoundary("\nDespués", 1, 0).text, "Después");
  assert.equal(
    backspaceSheetBoundary("[C]Antes\n[Am]\nDespués", 1, 0).text,
    "[C]Antes[Am]\nDespués",
  );
  assert.equal(backspaceSheetBoundary("[C]Primero\nOtro", 0, 0), null);
  assert.equal(backspaceSheetBoundary("Antes\n{new_page}\nOtro", 2, 0), null);
});

test("joining legacy pairs normalizes only the two affected verses", () => {
  assert.deepEqual(
    backspaceSheetBoundary("[D]\nAntes\n[G]\nDespués\n[C]\nFinal", 3, 0, 2),
    { text: "[D]Antes[G]Después\n[C]\nFinal", index: 0, at: 5, offset: 8 },
  );
});

test("backspace at a wrapped row deletes the preceding source grapheme", () => {
  assert.deepEqual(backspaceSheetBoundary("Antes\n[C]Café [G]luz", 1, 5), {
    text: "Antes\n[C]Caf [G]luz",
    index: 1,
    at: 3,
    offset: 12,
  });
  assert.equal(backspaceSheetBoundary("[C]a👩‍🎤[G]b", 0, 6).text, "[C]a[G]b");
});
