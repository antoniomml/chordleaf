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
  assert.ok(row.marks.every((m) => m.x === m.at));
});
