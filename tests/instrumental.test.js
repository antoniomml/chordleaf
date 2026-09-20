import test from "node:test";
import assert from "node:assert/strict";
import { layout } from "../src/layout.js";
import { parseSong } from "../src/music.js";
import { importText } from "../src/files.js";
const base = {
  title: "Solo",
  artist: "",
  margin: 10,
  fontSize: 12,
  columns: 1,
};
function rendered(row) {
  let s = row.lyric;
  for (const m of [...row.marks].reverse())
    s = s.slice(0, m.at) + m.chord + s.slice(m.at + m.chord.length);
  return s;
}
test("adjacent chords and section labels render on one line with visible separators", () => {
  for (const prefix of ["", "[Solo] ", "[Intro] ", "Intro: "]) {
    const [row] = layout({ ...base, text: prefix + "[C][G] [Am]" }).pages[0]
      .columns[0];
    assert.equal(row.instrumental, true);
    assert.equal(row.lyricOffset, 0);
    assert.equal(rendered(row), prefix + "C – G – Am");
    assert.ok(row.marks.every((m) => m.lane === 0));
  }
});
test("explicit instrumental rows don't consume the following lyrics", () => {
  const text = "[C] [G]\nLa voz empieza aquí";
  assert.equal(parseSong(text).length, 2);
  assert.equal(importText(text, "test").text, text);
  assert.equal(parseSong(text)[1].lyric, "La voz empieza aquí");
  assert.equal(
    importText("C    G\nUna canción", "test").text,
    "[C]Una c[G]anción",
  );
});
test("bar lines, repeats, and edited stars survive instrumentals", () => {
  const [row] = layout({
    ...base,
    text: "[Solo] |: [F] | [C] :| x2",
    chordShapes: { F: { star: true } },
  }).pages[0].columns[0];
  assert.equal(rendered(row), "[Solo] |: F* | C :| x2");
});
test("long solos wrap between whole chords without overlaps or trailing dashes", () => {
  const names = Array.from(
    { length: 30 },
    (_, i) => ["A#m7(5-)", "D#7(9-)", "F#7M"][i % 3],
  );
  const rows = layout({
    ...base,
    columns: 2,
    fontSize: 16,
    text: "[Solo] " + names.map((c) => `[${c}]`).join(""),
  }).pages.flatMap((p) => p.columns.flat());
  assert.ok(rows.length > 1);
  assert.deepEqual(
    rows.flatMap((r) => r.marks.map((m) => m.chord)),
    names,
  );
  for (const r of rows) {
    assert.equal(r.lyricOffset, 0);
    assert.ok(!rendered(r).trim().endsWith("–"));
    for (const m of r.marks)
      assert.ok((m.x + m.chord.length) * 16 * 0.6 <= r.width);
  }
});
test("sung words and close chord changes retain lyric anchors", () => {
  const [row] = layout({ ...base, text: "[C]ca[G]sa" }).pages[0].columns[0];
  assert.equal(row.instrumental, false);
  assert.equal(row.lyric, "casa");
  assert.deepEqual(
    row.marks.map((m) => m.at),
    [0, 2],
  );
});
