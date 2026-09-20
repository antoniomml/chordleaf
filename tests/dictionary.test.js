import test from "node:test";
import assert from "node:assert/strict";
import { stickerGeometry, stickerSvg } from "../src/dictionary.js";
import { txt, importText } from "../src/files.js";
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
