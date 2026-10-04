import test from "node:test";
import assert from "node:assert/strict";
import { lyricLineStarts } from "../src/audio-lyric-lines.js";
import { analysisToText } from "../src/audio-import.js";
const wordsFor = (text) =>
  text.split(" ").map((text, i) => ({
    text,
    start: i * 0.4,
    end: (i + 1) * 0.4,
    line: i % 3,
  }));
function lines(words) {
  const starts = [...lyricLineStarts(words)];
  return starts.map((start, i) =>
    words
      .slice(start, starts[i + 1] ?? words.length)
      .map((w) => w.text)
      .join(" "),
  );
}
test("joint layout balances a long lyric run without a tiny trailing verse", () => {
  const text =
    "Cuando vuelvas a encontrarme junto al mar quiero contarte todo lo que no te dije antes de marcharme y quedarme junto a ti";
  const words = wordsFor(text);
  const original = structuredClone(words);
  const result = lines(words);
  assert.equal(result.join(" "), text);
  assert.ok(result.length >= 2);
  assert.ok(result.every((line) => line.length >= 24 && line.length <= 64));
  assert.ok(
    Math.max(...result.map((line) => line.length)) -
      Math.min(...result.map((line) => line.length)) <=
      18,
  );
  assert.deepEqual(words, original);
});
test("model chunk changes and short punctuation do not force fragments", () => {
  const words = wordsFor("Hoy. Canto para ti y quiero quedarme aquí.");
  assert.deepEqual(lines(words), [
    "Hoy. Canto para ti y quiero quedarme aquí.",
  ]);
  assert.deepEqual(
    lines(words.map((word) => ({ ...word, line: 0 }))),
    lines(words),
  );
});
test("a breath selects a useful phrase boundary, while real silence keeps short phrases separate", () => {
  const words = wordsFor(
    "Quiero que me mires a los ojos quiero que me digas la verdad",
  );
  for (let i = 7; i < words.length; i++) {
    words[i].start += 1.3;
    words[i].end += 1.3;
  }
  assert.deepEqual(lines(words), [
    "Quiero que me mires a los ojos",
    "quiero que me digas la verdad",
  ]);
  assert.deepEqual(
    lines([
      { text: "Hola", start: 0, end: 1, line: 0 },
      { text: "Otra vez", start: 4, end: 5, line: 0 },
    ]),
    ["Hola", "Otra vez"],
  );
});
test("line planning preserves extended chord anchors and approximate source intervals", () => {
  const text =
    "Quiero que me mires a los ojos quiero que me digas la verdad y quedarme junto a ti";
  const data = {
    version: 1,
    duration: 20,
    words: [{ text, start: 0, end: 20, line: 0, timing: "grouped" }],
    chords: [
      { label: "Cmaj7", start: 0, end: 10 },
      { label: "D/F#", start: 10, end: 20 },
    ],
  };
  const original = structuredClone(data);
  const result = analysisToText(data);
  assert.equal(result.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " "), text);
  assert.match(result, /\[Cmaj7\]/);
  assert.match(result, /\[D\/F#\]/);
  assert.ok(
    result
      .split("\n")
      .every((line) => line.replace(/\[[^\]]+\]/g, "").length <= 64),
  );
  assert.deepEqual(data, original);
});

test("a complete short sentence can end a verse without treating every ASR full stop as a boundary", () => {
  const text =
    "Say that I love you. It's not the words I want to hear from you.";
  assert.deepEqual(lines(wordsFor(text)), [
    "Say that I love you.",
    "It's not the words I want to hear from you.",
  ]);
});

test("slow sung phrases split at a breath without losing words or using ASR chunk IDs", () => {
  const words = wordsFor(
    "Quiero estar contigo y sentir tu luz quiero estar contigo y sentir tu voz",
  );
  for (const [i, word] of words.entries()) {
    word.start = i * 1.2 + (i >= 7 ? 0.8 : 0);
    word.end = word.start + 1.2;
  }
  assert.deepEqual(lines(words), [
    "Quiero estar contigo y sentir tu luz",
    "quiero estar contigo y sentir tu voz",
  ]);
});

test("long gaps separate lyric stanzas even when harmony continues", () => {
  const data = {
    version: 1,
    duration: 12,
    words: [
      { text: "Vuelve conmigo", start: 1, end: 3, line: 0 },
      { text: "Vuelve otra vez", start: 8, end: 10, line: 1 },
    ],
    chords: [{ label: "C", start: 1, end: 12 }],
  };
  assert.equal(analysisToText(data), "[C]Vuelve conmigo\n\nVuelve otra vez");
});
