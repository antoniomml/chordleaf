import test from "node:test";
import assert from "node:assert/strict";
import { parsePdfPages, chordRow } from "../src/pdf-import.js";
import { chordRE, parseSong, transpose } from "../src/music.js";
import { layout } from "../src/layout.js";
const item = (text, x, y, size = 8) => ({
  text,
  x,
  y,
  size,
  width: text.length * size * 0.6,
});
test("same-line artist does not merge two PDF columns", () => {
  const items = [
    item("The title", 15, 25, 16),
    item("The artist", 260, 25, 12),
    item("CAPO 2", 15, 44, 12),
    item("C | E5+ | F#m7b5", 15, 70),
  ];
  for (let n = 0; n < 4; n++)
    items.push(
      item("C", 15, 90 + n * 24),
      item("First column verse", 15, 102 + n * 24),
      item("E5+", 300, 90 + n * 24),
      item("Second column verse", 300, 102 + n * 24),
    );
  const s = parsePdfPages([{ width: 595, height: 842, items }], "file");
  assert.equal(s.title, "The title");
  assert.equal(s.artist, "The artist");
  assert.equal(s.capo, 2);
  assert.equal(s.columns, 2);
  assert.equal(s.fontSize, 8);
  assert.ok(
    s.text.indexOf("{column}") > s.text.lastIndexOf("First column verse"),
  );
  assert.ok(s.text.indexOf("Second column verse") > s.text.indexOf("{column}"));
  assert.ok(s.text.startsWith("[C] | [E5+] | [F#m7b5]"));
});
test("augmented and altered chords are music, including instrumentals", () => {
  assert.ok(chordRE.test("E5+"));
  assert.ok(chordRE.test("G#m7b5"));
  assert.ok(chordRow([item("E - E5+ - F#m7b5", 0, 0)]));
  assert.equal(transpose("[E5+]", 1), "[F5+]");
});
test("chords after the end of a verse do not split its final word", () => {
  const s = parsePdfPages(
    [
      {
        width: 595,
        height: 842,
        items: [
          item("G#m7", 15, 90),
          item("C#7", 150, 90),
          item("Naturally", 15, 102),
        ],
      },
    ],
    "file",
  );
  const p = parseSong(s.text)[0];
  assert.equal(p.lyric.trim(), "Naturally");
  assert.ok(p.marks[1].at > p.lyric.trim().length);
});
test("crowded chords stack without inserting spaces into the lyrics", () => {
  const l = layout({
    title: "",
    artist: "",
    fontSize: 10,
    margin: 10,
    columns: 1,
    text: "[Cmaj7]a[Dmaj7]b[Am]c",
  });
  const r = l.pages[0].columns[0][0];
  assert.equal(r.lyric, "abc");
  assert.equal(new Set(r.marks.map((m) => m.lane)).size, 3);
});
test("instrumental separators share a line with chords", () => {
  const l = layout({
    title: "",
    artist: "",
    fontSize: 8,
    margin: 5,
    columns: 2,
    text: "[C] | [E5+] - [F#m7b5]\n{column}\n[G]Next verse",
  });
  const r = l.pages[0].columns[0][0];
  assert.equal(r.instrumental, true);
  assert.equal(r.lyricOffset, 0);
  assert.equal(l.pages[0].columns[1][0].lyric, "Next verse");
});

test("split CAPO label and number are metadata, not artist or lyrics", () => {
  const s = parsePdfPages(
    [
      {
        width: 595,
        height: 842,
        items: [
          item("Title", 15, 25, 16),
          item("Artist", 200, 25, 12),
          item("CAPO", 15, 44, 11),
          item("0", 48, 44, 11),
          item("C", 15, 90),
          item("The verse", 15, 102),
        ],
      },
    ],
    "file",
  );
  assert.equal(s.artist, "Artist");
  assert.equal(s.capo, 0);
  assert.equal(s.text, "[C]The verse");
});
