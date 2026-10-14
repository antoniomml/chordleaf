import test from "node:test";
import assert from "node:assert/strict";
import {
  lyricSourceOffset,
  displaySourceBoundary,
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
