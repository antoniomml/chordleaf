import test from "node:test";
import assert from "node:assert/strict";
import { layout } from "../src/layout.js";
import { parseSong } from "../src/music.js";

test("adjacent and coincident chords share one row and retain the full progression", () => {
  for (const text of [
    "[G][D/F#]Te [Em7]vas [Em7]como",
    "[Em7]Te [G]vas como [D/F#]si no te hubiera [Em]querido",
    "[Cmaj7]a[Dmaj7]b[Am]c",
  ]) {
    const original = parseSong(text);
    for (const columns of [1, 2]) {
      const result = layout({
        title: "",
        text,
        columns,
        fontSize: 20,
        margin: 18,
      });
      const rows = result.pages.flatMap((p) => p.columns.flat());
      assert.deepEqual(
        rows.flatMap((r) => r.marks.map((m) => m.name)),
        original[0].marks.map((m) => m.chord),
      );
      assert.equal(
        rows
          .map((r) => r.lyric)
          .join("")
          .replace(/\s/g, ""),
        original[0].lyric.replace(/\s/g, ""),
      );
      for (const row of rows) {
        assert.ok(row.lyric.length * result.cw <= row.width);
        for (const [i, mark] of row.marks.entries()) {
          assert.equal(mark.lane, 0);
          assert.ok((mark.x + mark.chord.length) * result.cw <= row.width);
          if (i)
            assert.ok(
              mark.x >= row.marks[i - 1].x + row.marks[i - 1].chord.length + 1,
            );
        }
      }
    }
    assert.deepEqual(parseSong(text), original);
  }
});

test("normal chord anchors keep their exact positions without extra spacing", () => {
  const row = layout({
    title: "",
    text: "Te [G]vas como [D/F#]si nada hubiera [Em]pasado",
    columns: 1,
    fontSize: 10,
    margin: 10,
  }).pages[0].columns[0][0];
  assert.equal(row.lyric, "Te vas como si nada hubiera pasado");
  assert.ok(row.marks.every((m) => m.x + m.anchorOffset === m.at));
});

test("odd labels use their middle letter; even labels use the left middle letter", () => {
  for (const [chord, offset] of [
    ["E", 0],
    ["Em", 0],
    ["Em7", 1],
    ["F#m7", 1],
    ["Emaj7", 2],
  ]) {
    const result = layout({
      title: "",
      text: `[${chord}]antes`,
      columns: 1,
      fontSize: 16,
      margin: 10,
    });
    const row = result.pages[0].columns[0][0],
      mark = row.marks[0];
    assert.equal(mark.anchorOffset, offset);
    assert.equal(mark.x + offset, row.lyric.indexOf("a"));
    assert.equal(row.positions[mark.x + offset], 0);
    assert.ok(mark.x >= 0);
  }
});

test("wrapped and padded rows retain an inverse map for the central source anchor", () => {
  const text =
    "Una ca[Em7]sa [F#m7]azul [Cmaj7]que [D/F#]brilla [G]con [Em7]luz. ".repeat(
      3,
    );
  const source = parseSong(text)[0];
  for (const notation of ["letters", "latin"])
    for (const columns of [1, 2]) {
      const result = layout({
        title: "",
        text,
        columns,
        notation,
        fontSize: 20,
        margin: 18,
      });
      const rows = result.pages.flatMap((p) => p.columns.flat());
      assert.ok(rows.some((row) => row.wrapped));
      for (const row of rows)
        for (const mark of row.marks) {
          const original = source.marks.find(
            (m) => m.rawIndex === mark.rawIndex,
          );
          assert.equal(row.positions[mark.x + mark.anchorOffset], original.at);
          assert.ok(mark.x >= 0);
          assert.ok((mark.x + mark.chord.length) * result.cw <= row.width);
        }
    }
});
