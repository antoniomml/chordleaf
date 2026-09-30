import test from "node:test";
import assert from "node:assert/strict";
import {
  analysisToText,
  validateAnalysis,
  formatAudioTime,
} from "../src/audio-import.js";
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
test("merge retains instrumental changes and snaps intra-word changes to the word", () => {
  assert.equal(
    analysisToText(example()),
    "[C]\n[Am]Hoy [F]canto\n[G]\n[C]aquí",
  );
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
  assert.equal(analysisToText(data), "[C]\n[C]Hoy. Canto");
  data.chords[0].end = 2;
  assert.equal(analysisToText(data), "[C]\nHoy. Canto");
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
  assert.equal(analysisToText(data), "[C]\n[C]Oh\n[Am] [F] [G]");
});
