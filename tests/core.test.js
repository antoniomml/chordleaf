import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSong,
  transpose,
  keyInfo,
  fingering,
  pc,
  chords,
  fingerings,
  chordRE,
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
  assert.equal(fingering("C/G").length, 6);
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

test("extended chord spellings survive parsing and transposition", () => {
  for (const name of [
    "Emaj7",
    "EM7",
    "EΔ7",
    "Abm7(b5)",
    "A♭ø7",
    "F#dim7",
    "C6/9",
    "G7(#9)",
    "Dm(maj7)",
    "C/G",
    "E5+",
  ]) {
    assert.ok(chordRE.test(name), name);
    assert.equal(chords(`[${name}]voz`)[0], name);
    assert.equal(fingerings(name).length > 0, true, name);
    assert.ok(chordRE.test(chords(transpose(`[${name}]`, 2))[0]), name);
  }
  for (const name of ["Estribillo", "Charge", "Cfoo", "C99", "A song"])
    assert.equal(chordRE.test(name), false, name);
});

test("catalog covers all chromatic roots and common extended families", () => {
  for (const root of [
    "C",
    "C#",
    "D",
    "Eb",
    "E",
    "F",
    "F#",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
  ]) {
    for (const suffix of [
      "",
      "m",
      "maj7",
      "m7b5",
      "dim7",
      "9",
      "m9",
      "13",
      "sus2",
      "sus4",
    ]) {
      const positions = fingerings(root + suffix);
      assert.ok(positions.length, root + suffix);
      positions.forEach((frets) => {
        assert.equal(frets.length, 6);
        assert.ok(
          frets.every(
            (fret) => Number.isInteger(fret) && fret >= -1 && fret <= 24,
          ),
        );
      });
    }
  }
  const tuning = [40, 45, 50, 55, 59, 64];
  for (const [name, allowed] of [
    ["Emaj7", [4, 8, 11, 3]],
    ["Abm7b5", [8, 11, 2, 6]],
  ]) {
    for (const frets of fingerings(name)) {
      const notes = frets.flatMap((fret, i) =>
        fret < 0 ? [] : [(tuning[i] + fret) % 12],
      );
      assert.ok(
        notes.every((note) => allowed.includes(note)),
        name,
      );
      assert.ok(
        allowed.every((note) => notes.includes(note)),
        name,
      );
    }
  }
});

test("labels always start at the syllable, including legacy centered documents", () => {
  const l = layout({
    ...base,
    chordAlign: "center",
    text: "Una ca[Emaj7]sa [Abm7b5]azul",
  });
  const row = l.pages[0].columns[0][0];
  assert.equal(row.lyric, "Una casa azul");
  assert.equal(row.marks[0].at, 6);
  assert.equal(row.marks[0].x, 6);
  assert.notEqual(row.marks[0].lane, row.marks[1].lane);
  const edge = layout({ ...base, chordAlign: "center", text: "[Emaj7]Casa" })
    .pages[0].columns[0][0];
  assert.equal(edge.marks[0].x, 0);
});

test("blank titles stay blank in document layout and text round trips", () => {
  assert.deepEqual(layout({ ...base, title: "" }).titleLines, [""]);
  assert.equal(
    importText("{title: }\n{chordAlign: center}\n[C]Voz", "fallback").title,
    "",
  );
  assert.equal(
    importText("{chordAlign: center}\n[C]Voz", "fallback").chordAlign,
    "center",
  );
});

test("document headers are uppercase without mutating editable names", () => {
  const song = { ...base, title: "Alone Again", artist: "gilbert o’sullivan" };
  const result = layout(song);
  assert.deepEqual(result.titleLines, ["ALONE AGAIN"]);
  assert.deepEqual(result.header.artistLines, ["GILBERT O’SULLIVAN"]);
  assert.equal(song.title, "Alone Again");
  const imported = importText(
    "{title: ALONE AGAIN}\n{artist: GILBERT O’SULLIVAN}\n[C]Voz",
    "fallback",
  );
  assert.equal(imported.title, "Alone Again");
  assert.equal(imported.artist, "Gilbert O’sullivan");
});

test("custom chord marker is optional and doesn't alter lyrics", () => {
  const song = { ...base, text: "[E]Voz", chordShapes: { E: { star: true } } };
  assert.equal(layout(song).pages[0].columns[0][0].marks[0].chord, "E*");
  song.chordShapes.E.star = false;
  assert.equal(layout(song).pages[0].columns[0][0].marks[0].chord, "E");
});

test("Cifra Club alterations and major sevenths retain their harmony", () => {
  for (const [source, equivalent] of [
    ["F#7M", "F#maj7"],
    ["C#7M", "C#maj7"],
    ["A#m7(5-)", "A#m7b5"],
    ["C#7(9-)", "C#7b9"],
    ["D#7(9)", "D#9"],
    ["A#m7(9)", "A#m9"],
    ["A#7(11)", "A#7sus4"],
    ["F#5+", "F#aug"],
  ]) {
    assert.ok(chordRE.test(source), source);
    assert.deepEqual(fingerings(source), fingerings(equivalent), source);
    assert.ok(fingerings(source).length, source);
    assert.ok(chordRE.test(transpose(`[${source}]`, 2).slice(1, -1)));
  }
  assert.notDeepEqual(fingerings("F#7M"), fingerings("F#7"));
});
test("alteration minus signs don't turn chord lines into lyrics", () => {
  const imported = importText(
    "A#m7(5-)    D#7(9-)\nUna mañana de canción",
    "Test",
  );
  assert.equal(imported.text, "[A#m7(5-)]Una mañana d[D#7(9-)]e canción");
  assert.equal(parseSong(imported.text)[0].lyric, "Una mañana de canción");
});
test("consecutive instrumental rows, bracketed chords and section labels stay separate", () => {
  const text =
    "F# F#5+ F#6 F7 A#m\nA#m7(5-) D#7(9-) G#m G#m7(5-)\n\n[C] [G]\n[Puente]\nUna canción";
  const imported = importText(text, "Test").text;
  assert.equal(
    imported,
    "[F#] [F#5+] [F#6] [F7] [A#m]\n[A#m7(5-)] [D#7(9-)] [G#m] [G#m7(5-)]\n\n[C] [G]\n[Puente]\nUna canción",
  );
  assert.ok(!imported.includes("[["));
});
