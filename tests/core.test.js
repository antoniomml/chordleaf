import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSong,
  transpose,
  keyInfo,
  fingering,
  diagram,
  pc,
  chords,
  fingerings,
  chordRE,
  chordLabel,
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
    { at: 0, chord: "G", rawIndex: 0 },
    { at: 5, chord: "D", rawIndex: 8 },
  ]);
});
test("unresolved chord markers remain visible at their lyric position", () => {
  const [line] = parseSong("[C]Hola [?H7]mundo");
  assert.equal(line.lyric, "Hola mundo");
  assert.deepEqual(line.marks[1], {
    at: 5,
    chord: "H7",
    issue: true,
    rawIndex: 8,
  });
  assert.deepEqual(chords("[C]Hola [?H7]mundo"), ["C"]);
  assert.equal(transpose("[?H7]", 2), "[?H7]");
  const imported = importText("C     [?H7]\nLuz del día", "Prueba");
  assert.match(imported.text, /\[C\]Luz de\[\?H7\]l día/);
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
        row.marks[i].lane === 0 &&
          row.marks[i].x > row.marks[i - 1].x + row.marks[i - 1].chord.length,
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

test("labels centre their reference character on the syllable, including legacy documents", () => {
  const l = layout({
    ...base,
    chordAlign: "center",
    text: "Una ca[Emaj7]sa [Abm7b5]azul",
  });
  const row = l.pages[0].columns[0][0];
  assert.equal(row.lyric, "Una casa    azul");
  assert.equal(row.marks[0].at, 6);
  assert.equal(row.marks[0].x + row.marks[0].anchorOffset, 6);
  assert.equal(row.marks[0].lane, 0);
  assert.equal(row.marks[1].lane, 0);
  assert.equal(row.marks[1].at, 9);
  assert.equal(
    row.marks[1].x + row.marks[1].anchorOffset,
    row.lyric.indexOf("azul"),
  );
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

test("transposed chords follow the spelling of the resulting key", () => {
  assert.equal(
    transpose("[A] [Dmaj7/F#] [E] [C#m]", 1),
    "[Bb] [Ebmaj7/G] [F] [Dm]",
  );
  assert.equal(
    transpose("[A] [Dmaj7/F#] [E] [C#m]", 2),
    "[B] [Emaj7/G#] [F#] [D#m]",
  );
  assert.equal(transpose("[G] [C] [D] [Em]", -2), "[F] [Bb] [C] [Dm]");
  assert.equal(transpose("[Dm] [Gm] [A7]", 1), "[Ebm] [Abm] [Bb7]");
  assert.equal(transpose("[Bb] [Eb]", 12), "[Bb] [Eb]");
});

test("Latin notation renames roots and bass notes only", () => {
  assert.equal(chordLabel("C#m7/G#", "latin"), "Do#m7/Sol#");
  assert.equal(chordLabel("Bbmaj7", "latin"), "Sibmaj7");
  assert.equal(chordLabel("Fadd9", "latin"), "Faadd9");
  assert.equal(chordLabel("Asus4", "english"), "Asus4");
});

test("familiar open chords and standard barres are the default while variants remain", () => {
  const preferred = {
    Cmaj7: [-1, 3, 2, 0, 0, 0],
    "C#": [-1, 4, 6, 6, 6, 4],
    "C#m": [-1, 4, 6, 6, 5, 4],
    "C#7": [-1, 4, 6, 4, 6, 4],
    "C#maj7": [-1, 4, 6, 5, 6, 4],
    "C#m7": [-1, 4, 6, 4, 5, 4],
    Ebmaj7: [-1, 6, 8, 7, 8, 6],
    Ebm7: [-1, 6, 8, 6, 7, 6],
    "F#m7": [2, 4, 2, 2, 2, 2],
    Ab: [4, 6, 6, 5, 4, 4],
    Ab7: [4, 6, 4, 5, 4, 4],
    Abm7: [4, 6, 4, 4, 4, 4],
    Bbm7: [-1, 1, 3, 1, 2, 1],
    Em7: [0, 2, 2, 0, 3, 3],
    Cm: [-1, 3, 5, 5, 4, 3],
    Gm: [3, 5, 5, 3, 3, 3],
    Cm7: [-1, 3, 5, 3, 4, 3],
    Dm7: [-1, -1, 0, 2, 1, 1],
    Bm7: [-1, 2, 4, 2, 3, 2],
    Fm7: [1, 3, 1, 1, 1, 1],
    Gm7: [3, 5, 3, 3, 3, 3],
    B: [-1, 2, 4, 4, 4, 2],
    Bm: [-1, 2, 4, 4, 3, 2],
    Bmaj7: [-1, 2, 4, 3, 4, 2],
  };
  const tuning = [4, 9, 2, 7, 11, 4];
  for (const [name, shape] of Object.entries(preferred)) {
    assert.deepEqual(fingering(name), shape, name);
    assert.ok(fingerings(name).length > 1, name + " retains alternatives");
    const root = pc(name.match(/^[A-G][#b]?/)[0]);
    const notes = shape.flatMap((fret, string) =>
      fret < 0 ? [] : [(tuning[string] + fret - root + 12) % 12],
    );
    const intervals = name.endsWith("maj7")
      ? [0, 4, 7, 11]
      : name.endsWith("m7")
        ? [0, 3, 7, 10]
        : name.endsWith("m")
          ? [0, 3, 7]
          : name.endsWith("7")
            ? [0, 4, 7, 10]
            : [0, 4, 7];
    assert.deepEqual(
      [...new Set(notes)].sort((a, b) => a - b),
      intervals,
      name + " contains the expected chord tones",
    );
    assert.equal(notes[0], 0, name + " has its root in the bass");
  }
  assert.deepEqual(fingering("C7M"), preferred.Cmaj7);
  assert.deepEqual(fingering("CΔ7"), preferred.Cmaj7);
  assert.ok(
    fingerings("Em7").some((shape) => shape.join() === "0,-1,0,0,0,-1"),
  );
  assert.equal(
    diagram("Em7", 0, [0, -1, 0, 0, 0, -1]),
    diagram(
      "Em7",
      fingerings("Em7").findIndex((shape) => shape.join() === "0,-1,0,0,0,-1"),
    ),
  );
});
