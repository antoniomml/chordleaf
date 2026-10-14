import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alignmentLine,
  moveAlignedChord,
  replaceAlignedLyrics,
  replaceDisplayedLyrics,
} from "../src/chord-alignment.js";
import { layout } from "../src/layout.js";

test("moving one occurrence preserves exact lyrics, other chords and literal brackets", () => {
  const raw = "[Verse] [G]Una ca[G]sa [D/F#]azul  ";
  const model = alignmentLine(raw);
  const result = moveAlignedChord(
    raw,
    model.marks[1].start,
    model.lyric.indexOf("azul"),
  );
  assert.equal(result.raw, "[Verse] [G]Una casa [D/F#][G]azul  ");
  assert.equal(alignmentLine(result.raw).lyric, model.lyric);
  assert.equal(result.raw.slice(result.start, result.start + 3), "[G]");
});

test("moving across adjacent chords, ends and unresolved tokens keeps exact spelling", () => {
  let result = moveAlignedChord("[G][?H]ca[D/F♯]sa", 0, 4);
  assert.equal(result.raw, "[?H]ca[D/F♯]sa[G]");
  result = moveAlignedChord(result.raw, result.start, 0);
  assert.equal(result.raw, "[?H][G]ca[D/F♯]sa");
  assert.deepEqual(moveAlignedChord(result.raw, result.start, 0), result);
});

test("grapheme boundaries protect combining accents and emoji; line breaks survive", () => {
  const raw = "[C]\nCafe\u0301 👩‍🎤 [Am]azul";
  const model = alignmentLine(raw);
  assert.ok(!model.boundaries.includes(model.lyric.indexOf("\u0301")));
  const result = moveAlignedChord(raw, 0, model.lyric.indexOf("azul"));
  assert.equal(result.raw, "\nCafe\u0301 👩‍🎤 [Am][C]azul");
  assert.equal(alignmentLine(result.raw).lyric, model.lyric);
});

test("many moves retain all source content except the chosen token position", () => {
  for (const raw of [
    "[G]a[Am]b[C]c",
    "a[G][G]b[D/F#]c",
    "[Intro] [Cmaj7]luz [?X] azul",
    "[G]\nUna canción",
    "[G]café 👩‍🎤 azul",
  ]) {
    const model = alignmentLine(raw);
    for (const mark of model.marks)
      for (const at of model.boundaries) {
        const result = moveAlignedChord(raw, mark.start, at);
        const moved = alignmentLine(result.raw);
        assert.equal(moved.lyric, model.lyric);
        assert.deepEqual(
          moved.marks.map((m) => m.token).sort(),
          model.marks.map((m) => m.token).sort(),
        );
        assert.equal(moved.marks.find((m) => m.start === result.start).at, at);
      }
  }
});

test("lyric insertions and deletions carry chords with unchanged words", () => {
  assert.equal(
    replaceAlignedLyrics("[C]Una [Am]casa", "En Una casa"),
    "En [C]Una [Am]casa",
  );
  assert.equal(
    replaceAlignedLyrics("[C]Una [Am]casa", "Una bonita casa"),
    "[C]Una bonita [Am]casa",
  );
  assert.equal(
    replaceAlignedLyrics("[C]Una bonita [Am]casa", "Una casa"),
    "[C]Una [Am]casa",
  );
  assert.equal(
    replaceAlignedLyrics("[C]Una [Am]casa", "Una casa"),
    "[C]Una [Am]casa",
  );
});

test("replacing or deleting lyrics retains all tokens, spelling and order", () => {
  const raw = "[Verse] [G]Una ca[G]sa [D/F♯]azul [?H]";
  const changed = replaceAlignedLyrics(raw, "Nueva letra");
  assert.equal(alignmentLine(changed).lyric, "Nueva letra");
  assert.deepEqual(
    alignmentLine(changed).marks.map((m) => m.token),
    ["[G]", "[G]", "[D/F♯]", "[?H]"],
  );
  assert.equal(replaceAlignedLyrics(raw, ""), "[G][G][D/F♯][?H]");
  assert.equal(
    replaceAlignedLyrics("[Intro] [C]luz", "[Intro] mucha luz"),
    "[Intro] mucha [C]luz",
  );
});

test("successive lyric edits retain anchors across newlines and grapheme clusters", () => {
  let raw = "[C]Café [Am]azul";
  raw = replaceAlignedLyrics(raw, "Café 👩‍🎤 azul");
  assert.equal(raw, "[C]Café 👩‍🎤 [Am]azul");
  raw = replaceAlignedLyrics(raw, "Café 👩‍🎤\nazul");
  assert.equal(raw, "[C]Café 👩‍🎤\n[Am]azul");
  const replacement = replaceAlignedLyrics("a[C]b[D]c", "👩‍🎤");
  const parsed = alignmentLine(replacement);
  assert.equal(parsed.lyric, "👩‍🎤");
  assert.ok(parsed.marks.every((mark) => parsed.boundaries.includes(mark.at)));
});

test("chords can move over blank space after the lyric and move back without losing other tokens", () => {
  const result = moveAlignedChord("[C]Luz [G]azul", 0, 15);
  assert.equal(result.raw, "Luz [G]azul       [C]");
  assert.equal(alignmentLine(result.raw).marks.at(-1).at, 15);
  const back = moveAlignedChord(result.raw, result.start, 0);
  assert.equal(back.raw, "[C]Luz [G]azul       ");
});

test("editing a padded, wrapped printed row preserves all other lyrics and source spaces", () => {
  const raw =
    "[Cmaj7]Una ca[Dmaj7]sa [Am]azul que brilla con mucha luz. ".repeat(5);
  const rows = layout({
    title: "",
    text: raw,
    fontSize: 16,
    margin: 10,
    columns: 2,
  }).pages.flatMap((p) => p.columns.flat());
  assert.ok(rows.length > 1);
  const row = rows[1];
  const before = row.lyric;
  const at = before.indexOf("a");
  assert.ok(at >= 0);
  const changed = replaceDisplayedLyrics(
    raw,
    before,
    before.slice(0, at) + "Nueva " + before.slice(at),
    row.positions.slice(0, before.length + 1),
  );
  const original = alignmentLine(raw);
  assert.equal(
    alignmentLine(changed.raw).lyric,
    original.lyric.slice(0, row.positions[at]) +
      "Nueva " +
      original.lyric.slice(row.positions[at]),
  );
  const back = replaceDisplayedLyrics(
    changed.raw,
    before.slice(0, at) + "Nueva " + before.slice(at),
    before,
    changed.positions,
  );
  assert.equal(back.raw, raw);
  const first = rows[0];
  assert.ok(first.lyric.startsWith("  "));
  const untouched = replaceDisplayedLyrics(
    raw,
    first.lyric,
    first.lyric,
    first.positions,
  );
  assert.equal(untouched.raw, raw);
});
