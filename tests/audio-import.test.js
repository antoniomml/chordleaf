import test from "node:test";
import assert from "node:assert/strict";
import {
  analysisToText,
  validateAnalysis,
  formatAudioTime,
} from "../src/audio-import.js";
import { parseSong } from "../src/music.js";
import { layout } from "../src/layout.js";
const example = () => ({
  version: 1,
  duration: 12,
  words: [
    { start: 2, end: 3, text: "Hoy", line: 0 },
    { start: 3, end: 4, text: "canto", line: 0 },
    { start: 8, end: 9, text: "aquí", line: 1 },
  ],
  chords: [
    { start: 0, end: 2, label: "C" },
    { start: 2, end: 3.5, label: "Am" },
    { start: 3.5, end: 5, label: "F" },
    { start: 5, end: 8, label: "G" },
    { start: 8, end: 10, label: "C" },
    { start: 10, end: 12, label: "N" },
  ],
});
test("short neural intervals remain visible and time rounding carries minutes", () => {
  assert.equal(formatAudioTime(0.02), "0:00.02");
  assert.equal(formatAudioTime(59.999), "1:00.00");
});
test("merge retains instrumental changes and assigns nearby sung onsets", () => {
  assert.equal(
    analysisToText(example()),
    "[Intro] [C]\n[Am]Hoy [F]canto\n[Instrumental] [G]\n[C]aquí",
  );
});

test("late changes attach to the next sung onset instead of stacking on the previous word", () => {
  const data = {
    version: 1,
    duration: 5,
    words: [
      { start: 0.2, end: 1.5, text: "Luz", line: 0 },
      { start: 1.5, end: 3, text: "azul", line: 0 },
    ],
    chords: [
      { start: 0, end: 1.35, label: "C" },
      { start: 1.35, end: 5, label: "G" },
    ],
  };
  assert.equal(analysisToText(data), "[C]Luz [G]azul");
});

test("repeated contiguous labels collapse while silence retains a new onset", () => {
  const data = {
    version: 1,
    duration: 5,
    words: [],
    chords: [
      { start: 0, end: 1, label: "Em7" },
      { start: 1, end: 2, label: "Em7" },
      { start: 2, end: 3, label: "N" },
      { start: 3, end: 5, label: "Em7" },
    ],
  };
  const original = structuredClone(data);
  assert.equal(analysisToText(data), "[Em7] [Em7]");
  assert.deepEqual(data, original);
});
test("instrumental audio remains importable without invented lyrics", () => {
  const data = example();
  data.words = [];
  assert.equal(analysisToText(data), "[C] [Am] [F] [G] [C]");
});
test("reject malformed, overlapping, unbounded and nonfinite timelines", () => {
  for (const edit of [
    (d) => (d.duration = Infinity),
    (d) => (d.chords[0].start = -1),
    (d) => (d.words[1].start = 2.5),
    (d) => (d.chords[1].label = "<script>"),
    (d) => (d.words[0].end = 13),
    (d) => (d.words[0].line = "0"),
  ]) {
    const data = example();
    edit(data);
    assert.throws(() => validateAnalysis(data));
  }
});
test("transcribed bracket markup cannot inject sheet chords or metadata", () => {
  const data = example();
  data.words[0].text = "[X]{title: Hola}";
  assert.ok(!analysisToText(data).includes("[X]"));
  assert.ok(!analysisToText(data).includes("{title:"));
});

test("neural extensions and slash bass survive validation and sheet conversion", () => {
  const data = example();
  data.words = [];
  const labels = ["Cmaj7", "Dm7b5", "G7sus4", "Am9", "D/F#", "N"];
  data.chords.forEach((c, i) => {
    c.label = labels[i];
  });
  assert.equal(analysisToText(data), "[Cmaj7] [Dm7b5] [G7sus4] [Am9] [D/F#]");
});

test("approximate lyric groups preserve text longer than a single word", () => {
  const data = example();
  const text = "palabra ".repeat(40).trim();
  data.words[0].text = text;
  assert.throws(() => validateAnalysis(data));
  data.words[0].timing = "grouped";
  assert.equal(validateAnalysis(data).words[0].text, text);
  assert.ok(
    analysisToText(data)
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .includes(text),
  );
});

test("breaths keep chord changes attached to the next sung word", () => {
  const data = example();
  data.words = [
    { start: 2, end: 3, text: "Hoy", line: 0 },
    { start: 4.2, end: 5, text: "canto", line: 0 },
  ];
  data.chords = [
    { start: 0, end: 3.5, label: "C" },
    { start: 3.5, end: 12, label: "F" },
  ];
  const sheet = analysisToText(data);
  assert.match(sheet, /\[F\]canto/);
  assert.ok(!sheet.split("\n").includes("[F]"));
});

test("coarse multi-word timing distributes chord anchors and keeps raw data intact", () => {
  const data = example();
  data.words = [
    { start: 2, end: 10, text: "Hoy canto aquí", line: 0, timing: "segment" },
  ];
  data.chords = [
    { start: 0, end: 8, label: "C" },
    { start: 8, end: 12, label: "F" },
  ];
  const original = structuredClone(data);
  assert.match(analysisToText(data), /Hoy canto \[F\]aquí/);
  assert.deepEqual(data, original);
});

test("short ASR punctuation does not orphan a word or invent a verse", () => {
  const data = example();
  data.words = [
    { start: 2, end: 3, text: "Hoy.", line: 0 },
    { start: 3, end: 4, text: "Canto", line: 0 },
  ];
  data.chords = [{ start: 0, end: 12, label: "C" }];
  assert.equal(analysisToText(data), "[Intro] [C]\nHoy. Canto");
  data.chords[0].end = 2;
  assert.equal(analysisToText(data), "[Intro] [C]\nHoy. Canto");
});

test("an implausibly long vowel cannot stack a whole solo above one word", () => {
  const data = example();
  data.words = [{ start: 1, end: 12, text: "Oh", line: 0 }];
  data.chords = [
    { start: 0, end: 3, label: "C" },
    { start: 3, end: 6, label: "Am" },
    { start: 6, end: 9, label: "F" },
    { start: 9, end: 12, label: "G" },
  ];
  assert.equal(
    analysisToText(data),
    "[Intro] [C]\nOh\n[Instrumental] [Am] [F] [G]",
  );
});

test("held harmony is emitted once across lyric line breaks, with the next change retained", () => {
  const data = {
    version: 1,
    duration: 25,
    words: [
      { start: 0, end: 1, text: "Te", line: 0 },
      { start: 1, end: 2, text: "vas.", line: 0 },
      { start: 4.5, end: 5, text: "Y", line: 1 },
      { start: 5, end: 6, text: "me", line: 1 },
      { start: 6, end: 7, text: "quedo.", line: 1 },
      { start: 9.5, end: 10.5, text: "Aquí.", line: 2 },
      { start: 13, end: 14, text: "Cantando.", line: 3 },
    ],
    chords: [
      { start: 0, end: 9.5, label: "G" },
      { start: 9.5, end: 25, label: "D/F#" },
    ],
  };
  assert.equal(
    analysisToText(data),
    "[G]Te vas.\nY me quedo.\n[D/F#]Aquí.\nCantando.",
  );
});

test("a single introductory chord remains separate from an unmarked first lyric in the sheet", () => {
  const data = {
    version: 1,
    duration: 10,
    words: [{ start: 2, end: 3, text: "Te vas", line: 0 }],
    chords: [{ start: 0, end: 10, label: "G" }],
  };
  const text = analysisToText(data),
    parsed = parseSong(text);
  assert.equal(text, "[Intro] [G]\nTe vas");
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[1].marks, []);
  const rows = layout({
    text,
    title: "",
    fontSize: 12,
    margin: 18,
    columns: 1,
  }).pages.flatMap((page) => page.columns.flat());
  assert.equal(rows[0].instrumental, true);
  assert.equal(rows[1].lyric, "Te vas");
  assert.deepEqual(rows[1].marks, []);
});

test("introductory changes near the voice stay in the intro while a sung onset stays on its word", () => {
  const data = {
    version: 1,
    duration: 8,
    words: [
      { start: 2, end: 2.4, text: "Te", line: 0 },
      { start: 2.4, end: 3, text: "vas", line: 0 },
    ],
    chords: [
      { start: 0, end: 1.85, label: "G" },
      { start: 1.85, end: 2, label: "D/F#" },
      { start: 2, end: 8, label: "Em7" },
    ],
  };
  assert.equal(analysisToText(data), "[Intro] [G] [D/F#]\n[Em7]Te vas");
});

test("a long first token keeps two changes visible without piling both above the syllable", () => {
  const data = {
    version: 1,
    duration: 10,
    words: [{ start: 0, end: 8, text: "Oh", line: 0 }],
    chords: [
      { start: 0, end: 4, label: "G" },
      { start: 4, end: 10, label: "D/F#" },
    ],
  };
  assert.equal(analysisToText(data), "[G]Oh\n[Instrumental] [D/F#]");
});

test("a repaired opening phrase keeps its progression separate without fragmenting the lyric", () => {
  const data = {
    version: 1,
    duration: 16,
    words: [
      { start: 0, end: 12, text: "Luz de mar", line: 0, timing: "grouped" },
      { start: 12, end: 12.5, text: "para", line: 0 },
      { start: 12.5, end: 13, text: "ti.", line: 0 },
    ],
    chords: [
      { start: 0, end: 2, label: "G" },
      { start: 2, end: 4, label: "D/F#" },
      { start: 4, end: 8, label: "Em7" },
      { start: 8, end: 12, label: "C" },
      { start: 12, end: 16, label: "D" },
    ],
  };
  const original = structuredClone(data);
  const text = analysisToText(data);
  assert.equal(text, "[Inicio] [G] [D/F#] [Em7] [C]\nLuz de mar [D]para ti.");
  assert.deepEqual(data, original);
  const rows = layout({
    text,
    title: "",
    fontSize: 12,
    margin: 18,
    columns: 1,
  }).pages.flatMap((page) => page.columns.flat());
  assert.equal(rows[0].instrumental, true);
  assert.equal(rows[1].lyric, "Luz de mar para ti.");
  assert.deepEqual(
    rows[1].marks.map((mark) => mark.chord),
    ["D"],
  );
});
