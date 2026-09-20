import { pc, normalizeChord } from "./music.js";

export const TUNING = [40, 45, 50, 55, 59, 64];
const SHARPS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const noteName = (value, flats = false) =>
  (flats ? FLATS : SHARPS)[((value % 12) + 12) % 12];

// Each interval retains its diatonic degree so diminished sevenths and altered
// extensions can be spelled correctly, instead of displaying enharmonic guesses.
const degree = {
  0: 1,
  1: 9,
  2: 9,
  3: 3,
  4: 3,
  5: 11,
  6: 5,
  7: 5,
  8: 5,
  9: 6,
  10: 7,
  11: 7,
};
const formulas = [];
function add(suffix, intervals, degrees = {}) {
  formulas.push({
    suffix,
    intervals,
    degrees: intervals.map((n) => degrees[n] || degree[n]),
  });
}
add("", [0, 4, 7]);
add("m", [0, 3, 7]);
add("5", [0, 7]);
add("dim", [0, 3, 6]);
add("aug", [0, 4, 8]);
add("sus2", [0, 2, 7], { 2: 2 });
add("sus4", [0, 5, 7], { 5: 4 });
add("dim7", [0, 3, 6, 9], { 9: 7 });
add("m7b5", [0, 3, 6, 10]);
for (const [quality, third] of [
  ["", 4],
  ["m", 3],
]) {
  add(quality + "6", [0, third, 7, 9]);
  add(quality + "69", [0, third, 7, 9, 2]);
  for (const [name, interval, d] of [
    ["9", 2, 9],
    ["11", 5, 11],
    ["13", 9, 13],
  ])
    add(quality + "add" + name, [0, third, 7, interval], { [interval]: d });
}
for (const [quality, third, seventh] of [
  ["", 4, 10],
  ["maj", 4, 11],
  ["m", 3, 10],
  ["mmaj", 3, 11],
]) {
  for (const [extension, extra] of [
    ["7", []],
    ["9", [2]],
    ["11", [2, 5]],
    ["13", [2, 5, 9]],
  ]) {
    add(quality + extension, [0, third, 7, seventh, ...extra], { 9: 13 });
  }
  // Common guitar/jazz thirteenths omit the eleventh, sometimes the ninth.
  add(quality + "13", [0, third, 7, seventh, 2, 9], { 9: 13 });
  add(quality + "7add13", [0, third, 7, seventh, 9], { 9: 13 });
  add(quality + "7add11", [0, third, 7, seventh, 5]);
}
for (const [quality, third] of [
  ["", 4],
  ["m", 3],
]) {
  for (const fifth of [6, 7, 8]) {
    for (const ninth of [null, 1, 2, 3]) {
      for (const upper of [null, 6, 8, 9]) {
        if (upper === fifth || (third === 3 && ninth === 3)) continue;
        const suffix =
          quality +
          (ninth === 2 ? "9" : "7") +
          (fifth === 6 ? "b5" : fifth === 8 ? "#5" : "") +
          (ninth === 1 ? "b9" : ninth === 3 ? "#9" : "") +
          (upper === 6
            ? "#11"
            : upper === 8
              ? "b13"
              : upper === 9
                ? "add13"
                : "");
        const intervals = [
          0,
          third,
          fifth,
          10,
          ...[ninth, upper].filter((v) => v !== null),
        ];
        if (new Set(intervals).size !== intervals.length) continue;
        add(suffix, intervals, {
          ...(ninth === 3 ? { 3: 9 } : {}),
          ...(upper === 6 ? { 6: 11 } : {}),
          ...(upper === 8 ? { 8: 13 } : {}),
          9: 13,
        });
      }
    }
  }
}
for (const [suffix, third] of [
  ["sus2", 2],
  ["sus4", 5],
]) {
  add("7" + suffix, [0, third, 7, 10], { [third]: third === 2 ? 2 : 4 });
  if (third === 5) add("9sus4", [0, 2, 5, 7, 10], { 5: 4 });
}
add("maj7#11", [0, 4, 7, 11, 6], { 6: 11 });
add("maj9#11", [0, 4, 7, 11, 2, 6], { 6: 11 });
add("maj7#5", [0, 4, 8, 11]);

function spell(root, interval, diatonicDegree) {
  const letters = "CDEFGAB";
  const letter = letters[(letters.indexOf(root[0]) + diatonicDegree - 1) % 7];
  let alteration = ((pc(root) + interval - pc(letter) + 18) % 12) - 6;
  return (
    letter + (alteration > 0 ? "#".repeat(alteration) : "b".repeat(-alteration))
  );
}
export function guitarNotes(frets, capo = 0, flats = false) {
  if (
    !Array.isArray(frets) ||
    frets.length !== 6 ||
    !frets.every((f) => Number.isInteger(f) && f >= -1 && f <= 24) ||
    !Number.isInteger(capo) ||
    capo < 0 ||
    capo > 12
  )
    throw new RangeError(
      "Expected six frets (-1 through 24) and a capo (0 through 12).",
    );
  return frets.flatMap((f, string) =>
    f < 0
      ? []
      : [
          {
            string,
            fret: f,
            midi: TUNING[string] + f + capo,
            pitch: (TUNING[string] + f + capo) % 12,
            name: noteName(TUNING[string] + f + capo, flats),
            octave: Math.floor((TUNING[string] + f + capo) / 12) - 1,
          },
        ],
  );
}

/** Exhaustive matches within the documented formula vocabulary, not a claim to
 * enumerate every context-dependent harmonic interpretation. Never ignore an
 * extra sounding note. Missing roots/fifths are explicitly annotated. */
export function identifyChord(
  frets,
  { capo = 0, flats = false, rootless = false } = {},
) {
  const notes = guitarNotes(frets, capo, flats);
  const pitches = [...new Set(notes.map((n) => n.pitch))];
  const bass = notes.length
    ? notes.reduce((a, b) => (a.midi <= b.midi ? a : b))
    : null;
  const matches = new Map();
  if (pitches.length < 2) return { notes, pitches, bass, matches: [] };
  for (let root = 0; root < 12; root++) {
    const actual = pitches.map((p) => (p - root + 12) % 12);
    for (const formula of formulas) {
      if (actual.some((n) => !formula.intervals.includes(n))) continue;
      const missing = formula.intervals.filter((n) => !actual.includes(n));
      if (missing.some((n) => n !== 0 && n !== 7)) continue;
      if (missing.includes(0) && (!rootless || pitches.length < 3)) continue;
      if (missing.length && pitches.length < 3) continue;
      const rootName = noteName(root, flats);
      const spelled = formula.intervals.map((n, i) =>
        spell(rootName, n, formula.degrees[i]),
      );
      const bassName =
        spelled[formula.intervals.indexOf((bass.pitch - root + 12) % 12)];
      // The editor accepts single accidentals. Use the equivalent pitch spelling
      // for a double-accidental bass while keeping theoretical notes in the detail.
      const symbolBass = /^[A-G][#b]?$/.test(bassName)
        ? bassName
        : noteName(bass.pitch, flats);
      const omission = missing.map((n) => (n === 0 ? "no1" : "no5")).join("");
      const symbol =
        rootName +
        formula.suffix +
        (omission ? `(${omission})` : "") +
        (bass.pitch === root ? "" : "/" + symbolBass);
      const match = {
        symbol,
        root,
        missing,
        exact: missing.length === 0,
        notes: spelled.filter(
          (_, i) => !missing.includes(formula.intervals[i]),
        ),
        intervals: formula.intervals.filter((n) => !missing.includes(n)),
        score:
          missing.length * 100 +
          (missing.includes(0) ? 100 : 0) +
          (bass.pitch === root ? 0 : 10) +
          formula.suffix.length,
      };
      if (!matches.has(symbol) || matches.get(symbol).score > match.score)
        matches.set(symbol, match);
    }
  }
  return {
    notes,
    pitches,
    bass,
    matches: [...matches.values()].sort(
      (a, b) => a.score - b.score || a.symbol.localeCompare(b.symbol),
    ),
  };
}

// Replace bracket tokens only: lyrics, section labels and longer symbols survive.
export function replaceChord(text, from, to, all = true, occurrence = 0) {
  let seen = 0;
  return text.replace(/\[([^\]]+)\]/g, (token, name) => {
    if (normalizeChord(name) !== normalizeChord(from)) return token;
    return all || seen++ === occurrence ? `[${to}]` : token;
  });
}
