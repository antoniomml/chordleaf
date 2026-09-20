import test from "node:test";
import assert from "node:assert/strict";
import {
  identifyChord,
  guitarNotes,
  replaceChord,
  TUNING,
} from "../src/harmony.js";
import { chordRE, transpose, parseSong, diagram } from "../src/music.js";
import { txt, importText } from "../src/files.js";

const symbols = (frets, options) =>
  identifyChord(frets, options).matches.map((m) => m.symbol);
// Construct independent test voicings with exactly the requested pitch classes.
function shape(pitches) {
  return TUNING.map((pitch, i) =>
    i >= pitches.length ? -1 : (pitches[i] - (pitch % 12) + 12) % 12,
  );
}
test("standard tuning, mute, octaves, capo and crossing voices", () => {
  assert.deepEqual(
    guitarNotes([0, 0, 0, 0, 0, 0]).map((n) => n.midi),
    TUNING,
  );
  assert.equal(guitarNotes([-1, 3, -1, -1, -1, -1], 2)[0].name, "D");
  assert.equal(identifyChord([24, 0, 2, 2, 2, 0]).bass.midi, 45);
  assert.deepEqual(symbols([-1, -1, -1, -1, -1, -1]), []);
  assert.deepEqual(symbols([0, -1, -1, -1, -1, 0]), []);
  assert.throws(() => guitarNotes([0, 0, 0]), RangeError);
  assert.throws(() => guitarNotes([25, 0, 0, 0, 0, 0]), RangeError);
});
test("open C and its E-bass inversion are ranked first", () => {
  assert.equal(symbols([-1, 3, 2, 0, 1, 0])[0], "C");
  assert.equal(symbols([0, 3, 2, 0, 1, 0])[0], "C/E");
});
test("sixth/minor-seventh ambiguity retains both exact readings", () => {
  const names = symbols([-1, 3, 2, 2, 1, 3]);
  assert.ok(names.includes("C6"));
  assert.ok(names.includes("Am7/C"));
});
test("symmetric diminished sevenths and augmented chords retain all roots", () => {
  const diminished = identifyChord(shape([0, 3, 6, 9])).matches.filter(
    (m) => m.exact && m.symbol.includes("dim7"),
  );
  assert.equal(diminished.length, 4);
  const c = diminished.find((m) => m.root === 0);
  assert.deepEqual(c.notes, ["C", "Eb", "Gb", "Bbb"]);
  assert.equal(
    identifyChord(shape([0, 4, 8])).matches.filter(
      (m) => m.exact && m.symbol.includes("aug"),
    ).length,
    3,
  );
});
test("extensions, alterations, suspended and minor-major families", () => {
  for (const [name, pitches] of [
    ["Cmaj7", [0, 4, 7, 11]],
    ["Cmmaj7", [0, 3, 7, 11]],
    ["Cm7b5", [0, 3, 6, 10]],
    ["C7b9", [0, 4, 7, 10, 1]],
    ["C7#9", [0, 4, 7, 10, 3]],
    ["Cmaj7#11", [0, 4, 7, 11, 6]],
    ["C9sus4", [0, 2, 5, 7, 10]],
    ["C13", [0, 4, 7, 10, 2, 9]],
    ["Cadd9", [0, 4, 7, 2]],
  ]) {
    assert.ok(
      symbols(shape(pitches)).some((s) => s.split("/")[0] === name),
      name,
    );
  }
  assert.ok(
    !symbols(shape([0, 4, 7, 2])).some((s) => s.split("/")[0] === "C9"),
  );
});
test("missing fifths and opt-in rootless chords are explicit", () => {
  assert.ok(symbols(shape([0, 4, 10])).some((s) => s.startsWith("C7(no5)")));
  assert.ok(!symbols(shape([4, 7, 10, 2])).some((s) => s.startsWith("C9")));
  assert.ok(
    symbols(shape([4, 7, 10, 2]), { rootless: true }).some((s) =>
      s.startsWith("C9(no1)"),
    ),
  );
});
test("all returned names parse and every observed note belongs to its explanation", () => {
  // Exhaust all 2–6-note pitch sets. This catches formula/parser disagreements
  // and accidental acceptance of extra tones across the full chromatic space.
  for (let mask = 1; mask < 4096; mask++) {
    const pitches = Array.from({ length: 12 }, (_, i) => i).filter(
      (i) => mask & (1 << i),
    );
    if (pitches.length < 2 || pitches.length > 6) continue;
    const result = identifyChord(shape(pitches), { rootless: true });
    for (const m of result.matches) {
      assert.ok(chordRE.test(m.symbol), m.symbol);
      assert.deepEqual(
        [...m.intervals.map((n) => (n + m.root) % 12)].sort((a, b) => a - b),
        pitches,
      );
    }
  }
});
test("flats and capo transpose pitch sets without changing interval structure", () => {
  const f = [-1, 4, 6, 6, 6, 4];
  assert.equal(symbols(f, { flats: true })[0], "Db");
  assert.equal(symbols(f)[0], "C#");
  assert.equal(symbols([-1, 3, 2, 0, 1, 0], { capo: 2 })[0], "D");
});
test("replacement preserves lyrics, longer symbols and section labels", () => {
  const text = "[C]C in lyrics [Cmaj7]light\n[Chorus][C]again [C*]end";
  assert.equal(
    replaceChord(text, "C", "Dm", false, 1),
    "[C]C in lyrics [Cmaj7]light\n[Chorus][Dm]again [C*]end",
  );
  assert.equal(
    replaceChord(text, "C", "Dm"),
    "[Dm]C in lyrics [Cmaj7]light\n[Chorus][Dm]again [Dm]end",
  );
  assert.equal(replaceChord("[A♭ø7]sea", "Abm7b5", "C"), "[C]sea");
});
test("omission names survive parsing and transposition", () => {
  const text = "[C9(no1no5)/E]Light";
  assert.equal(parseSong(text)[0].marks[0].chord, "C9(no1no5)/E");
  assert.equal(transpose(text, 2), "[D9(no1no5)/F#]Light");
});
test("wide custom shapes fit within the diagram", () => {
  const svg = diagram("C", 0, [1, 24, -1, 0, 13, -1]);
  const ys = [...svg.matchAll(/cy="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.ok(ys.every((y) => y > 30 && y < 120));
});

test("omission symbols and custom shapes survive TXT round trips", () => {
  const song = {
    title: "Test",
    artist: "",
    text: "[C9(no1)/E]Light",
    capo: 0,
    fontSize: 10,
    margin: 10,
    columns: 1,
    chordShapes: { "C9(no1)/E": { frets: [0, 1, 0, 0, -1, -1], star: false } },
    chordStickers: [],
  };
  const restored = importText(txt(song), "Test");
  assert.equal(restored.text, song.text);
  assert.deepEqual(restored.chordShapes, song.chordShapes);
});
