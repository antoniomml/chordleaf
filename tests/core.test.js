import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSong,
  transpose,
  keyInfo,
  fingering,
  pc,
  chords,
} from "../src/music.js";
import { layout, PAGE } from "../src/layout.js";
import { importText } from "../src/files.js";
const base = {
  title: "Test",
  text: "[G]Hola [D]mundo",
  fontSize: 11,
  margin: 18,
  columns: 1,
};
test("inline chords preserve lyrics and anchors", () => {
  const [line] = parseSong("[G]Hola [D]mundo");
  assert.equal(line.lyric, "Hola mundo");
  assert.deepEqual(line.marks, [
    { at: 0, chord: "G" },
    { at: 5, chord: "D" },
  ]);
});
test("separate chord line attaches to following verse", () => {
  const [line] = parseSong("    [G]\nYo era el árbol,");
  assert.equal(line.lyric, "Yo era el árbol,");
  assert.equal(line.marks[0].at, 4);
});
test("transpose slash chords and leave section labels intact", () => {
  assert.equal(
    transpose("[C/G] [Am7] [Estribillo]", 2),
    "[D/A] [Bm7] [Estribillo]",
  );
});
test("linked capo preserves sounding pitches", () => {
  for (let n = 0; n <= 12; n++) {
    const shifted = chords(transpose("[G] [Am] [D/F#]", 3 - n));
    ["G", "Am", "D"].forEach((c, i) =>
      assert.equal((pc(shifted[i]) + n) % 12, (pc(c) + 3) % 12),
    );
  }
});
test("key and diagrams are derived from chords", () => {
  assert.equal(keyInfo("[G] [C] [D] [Em] [G]").name, "G mayor");
  assert.deepEqual(fingering("Am"), [-1, 0, 2, 2, 1, 0]);
  assert.equal(fingering("F#m").length, 6);
  assert.equal(fingering("C/G"), null);
});
test("all rows fit page bounds in both column modes", () => {
  for (const columns of [1, 2]) {
    const l = layout({
      ...base,
      columns,
      text: "[G]Un verso con [D]acordes y palabras\n".repeat(150),
    });
    assert.ok(l.pages.length > 1);
    l.pages.forEach((p) =>
      p.columns.flat().forEach((r) => {
        assert.ok(r.y + r.height <= PAGE.height - l.margin + 0.01);
        assert.ok(r.x + r.width <= PAGE.width - l.margin + 0.01);
        assert.ok(r.lyric.length * l.cw <= r.width + 0.01);
      }),
    );
    assert.equal(
      l.pages.reduce(
        (n, p) => n + p.columns.reduce((n, c) => n + c.length, 0),
        0,
      ),
      151,
    );
  }
});
test("nearby chords never overlap", () => {
  const l = layout({ ...base, text: "[Cmaj7]a[Dmaj7]b[Am]c" });
  for (const row of l.pages[0].columns[0])
    for (let i = 1; i < row.marks.length; i++)
      assert.ok(
        row.marks[i].lane !== row.marks[i - 1].lane ||
          row.marks[i].at > row.marks[i - 1].at + row.marks[i - 1].chord.length,
      );
});
test("text metadata and aligned chords import", () => {
  const s = importText(
    "{title: Prueba}\n{artist: Alguien}\n{capo: 2}\n\nG     Am\nHola mundo",
    "file",
  );
  assert.equal(s.title, "Prueba");
  assert.equal(s.capo, 2);
  assert.equal(s.text, "[G]Hola m[Am]undo");
});

test("long titles reserve space above both columns", () => {
  const l = layout({
    ...base,
    columns: 2,
    title:
      "Una canción con un título muy largo que también necesita su propio espacio en la hoja",
  });
  assert.ok(l.titleLines.length > 1);
  assert.ok(l.pages[0].columns[0][0].y >= l.margin + l.headerHeight);
});
