import test from "node:test";
import assert from "node:assert/strict";
import { createSong } from "../src/song-state.js";
import {
  projectData,
  projectSignature,
  serializeProject,
  restoreProject,
} from "../src/project.js";
import { layout } from "../src/layout.js";

test("individual project round trips every editable field", () => {
  const song = createSong({
    title: "Luz",
    artist: "Árbol",
    text: "[C/G]Luz\n{new_page}\n[Dm7]Fin",
    capo: 2,
    linked: true,
    fontSize: 12.5,
    margin: 17,
    columns: 2,
    showBrand: false,
    chordShapes: { "C/G": { frets: [3, 3, 2, 0, 1, 0] } },
    chordStickers: [
      {
        id: crypto.randomUUID(),
        page: 0,
        x: 30,
        y: 400,
        width: 90,
        height: 120,
        columns: 1,
        chords: ["C/G"],
      },
    ],
  });
  const reopened = restoreProject(serializeProject(song));
  assert.notEqual(reopened.id, song.id);
  assert.deepEqual(projectData(reopened), projectData(song));
  assert.equal(reopened.projectSignature, projectSignature(reopened));
  assert.equal(reopened.dirty, false);
});

test("layout routes lyrics around diagrams in one and two columns", () => {
  for (const columns of [1, 2]) {
    const song = createSong({
      text: "[C]Verso repetido\n".repeat(80),
      columns,
      chordStickers: [
        { page: 0, x: 28, y: 220, width: 280, height: 180, chords: ["C"] },
      ],
    });
    const box = song.chordStickers[0];
    for (const row of layout(song).pages[0].columns.flat()) {
      const overlaps =
        row.x < box.x + box.width &&
        row.x + row.width > box.x &&
        row.y < box.y + box.height &&
        row.y + row.height > box.y;
      assert.equal(overlaps, false);
    }
  }
});

test("a diagram keeps its page when the song becomes shorter", () => {
  const song = createSong({
    text: "[C]Uno",
    chordStickers: [
      { page: 1, x: 28, y: 100, width: 85, height: 110, chords: ["C"] },
    ],
  });
  assert.equal(layout(song).pages.length, 2);
});
