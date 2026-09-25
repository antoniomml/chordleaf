import test from "node:test";
import assert from "node:assert/strict";
import {
  stickerChords,
  stickerGeometry,
  stickerSvg,
  unresolvedChords,
} from "../src/dictionary.js";
import { txt, importText, mapWithConcurrency } from "../src/files.js";
import { diagram } from "../src/music.js";
const song = {
  title: "Frames",
  artist: "",
  text: "[C][D][E][F][G][A][B][Am][Dm][Em][G7][C7]",
  chordShapes: {},
  chordStickers: [],
};
test("shrinking a fixed-column frame never increases its diagram size", () => {
  let previous = Infinity;
  for (let width = 340; width >= 28; width--) {
    const g = stickerGeometry(song, {
      chords: "all",
      width,
      height: 180,
      columns: 6,
    });
    assert.equal(g.columns, 6);
    assert.equal(g.rows, 2);
    assert.ok(g.cell <= previous);
    previous = g.cell;
  }
  previous = Infinity;
  for (let height = 220; height >= 28; height--) {
    const g = stickerGeometry(song, {
      chords: "all",
      width: 300,
      height,
      columns: 6,
    });
    assert.ok(g.cell <= previous);
    previous = g.cell;
  }
});
test("columns are explicit and the undistorted diagrams fit both dimensions", () => {
  for (const columns of [1, 3, 6, 12]) {
    const g = stickerGeometry(song, {
      chords: "all",
      width: 240,
      height: 60,
      columns,
    });
    assert.equal(g.rows, Math.ceil(12 / columns));
    assert.ok(g.cell * g.columns <= g.width);
    assert.ok(g.cell * 1.2 * g.rows <= g.height + 1e-9);
    assert.equal(g.width, 240);
    assert.equal(g.height, 60);
  }
});
test("legacy frames retain dimensions; small frames survive TXT round trips", () => {
  const legacy = stickerGeometry(song, { chords: "all", width: 300 });
  assert.equal(legacy.columns, 4);
  assert.equal(legacy.height, 270);
  const sticker = {
    id: "small",
    chords: "all",
    width: 40,
    height: 35,
    columns: 6,
    x: 20,
    y: 30,
    page: 0,
  };
  const restored = importText(
    txt({ ...song, chordStickers: [sticker] }),
    "Frames",
  );
  assert.deepEqual(restored.chordStickers, [sticker]);
  assert.ok(stickerSvg(restored, sticker).includes('viewBox="0 0 40 35"'));
});
test("malformed optional frame dimensions are rejected during import", () => {
  for (const bad of [{ height: -5 }, { columns: 0 }, { columns: 1.5 }]) {
    const sticker = { chords: "all", x: 0, y: 0, width: 100, page: 0, ...bad };
    assert.equal(
      importText(txt({ ...song, chordStickers: [sticker] })).chordStickers
        .length,
      0,
    );
  }
});
test("each string label shares the x coordinate of its guitar string", () => {
  const svg = diagram("C");
  const labels = [
    ...svg.matchAll(/class="diagram-string-label" x="(\d+)"[^>]*>([^<]+)</g),
  ];
  assert.deepEqual(
    labels.map((m) => [Number(m[1]), m[2]]),
    [
      [30, "E"],
      [47, "A"],
      [64, "D"],
      [81, "G"],
      [98, "B"],
      [115, "e"],
    ],
  );
});

test("printed dots and barres are black while editor diagrams stay green", () => {
  const printed = stickerSvg(
    { ...song, text: "[F] [C]" },
    { chords: "all", width: 160 },
  );
  assert.match(printed, /class="diagram-barre"[^>]+stroke="#000"/);
  assert.match(printed, /<circle[^>]+fill="#000"/);
  assert.match(printed, /fill="#fff"/);
  assert.doesNotMatch(printed, /#c9e79c|#fffef9/);
  assert.match(diagram("F"), /stroke="#c9e79c"/);
  assert.match(diagram("C"), /fill="#c9e79c"/);
});

test("a sticker omits unknown positions until a player defines them", () => {
  const withUnknown = { ...song, text: "[C] [F#7/A#] [A7/C#]" };
  const sticker = { chords: "all", width: 180 };
  assert.deepEqual(unresolvedChords(withUnknown, "all"), ["F#7/A#", "A7/C#"]);
  assert.deepEqual(stickerChords(withUnknown, sticker), ["C"]);
  const printed = stickerSvg(withUnknown, sticker);
  assert.match(printed, />C</);
  assert.doesNotMatch(printed, /F#7\/A#|A7\/C#|Sin posición/);

  withUnknown.chordShapes = { "F#7/A#": { frets: [-1, 1, 2, 3, 2, 2] } };
  assert.deepEqual(unresolvedChords(withUnknown, "all"), ["A7/C#"]);
  assert.deepEqual(stickerChords(withUnknown, sticker), ["C", "F#7/A#"]);
  assert.match(stickerSvg(withUnknown, sticker), /F#7\/A#/);
});

test("sticker diagrams stay capped per block and across the song", () => {
  const roots = [
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
  const suffixes = ["", "m", "7", "m7", "maj7", "sus4", "add9", "dim", "aug"];
  const names = roots.flatMap((root) =>
    suffixes.map((suffix) => root + suffix),
  );
  const big = {
    ...song,
    text: names.map((name) => `[${name}]`).join(""),
    chordShapes: Object.fromEntries(
      names.map((name) => [name, { frets: [-1, 3, 2, 0, 1, 0] }]),
    ),
  };
  assert.equal(stickerChords(big, { chords: "all", width: 300 }).length, 60);
  assert.equal(stickerChords(big, { chords: names, width: 300 }).length, 60);
  assert.equal(
    stickerGeometry(big, { chords: "all", width: 300 }).names.length,
    60,
  );
  const stickers = Array.from({ length: 5 }, (_, i) => ({
    id: `s${i}`,
    chords: names,
    x: 0,
    y: 0,
    width: 300,
    page: 0,
  }));
  const crowded = { ...big, chordStickers: stickers };
  assert.equal(stickerChords(crowded, stickers[0]).length, 60);
  assert.equal(stickerChords(crowded, stickers[3]).length, 60);
  assert.equal(stickerChords(crowded, stickers[4]).length, 0);
  assert.equal(stickerGeometry(crowded, stickers[4]).names.length, 0);
});

test("imported stickers keep at most one block of diagrams", () => {
  const many = Array.from(
    { length: 90 },
    (_, i) => ["C", "D", "E", "F", "G", "A", "B"][i % 7],
  );
  const sticker = {
    id: "big",
    chords: many,
    x: 0,
    y: 0,
    width: 300,
    page: 0,
  };
  const restored = importText(
    txt({ ...song, chordStickers: [sticker] }),
    "Frames",
  );
  assert.equal(restored.chordStickers[0].chords.length, 60);
});

test("sticker rendering runs with bounded concurrency", async () => {
  let active = 0;
  let peak = 0;
  const results = await mapWithConcurrency(
    [1, 2, 3, 4, 5],
    2,
    async (value) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return value * 2;
    },
  );
  assert.equal(peak, 2);
  assert.deepEqual(results, [2, 4, 6, 8, 10]);
});
