import test from "node:test";
import assert from "node:assert/strict";
import { createTransposition } from "../src/transposition.js";
import { createSong } from "../src/song-state.js";
import { pc } from "../src/music.js";

const makeSong = (capo = 3) =>
  createSong({
    text: "[C/G]Una [Dm7]casa [Bb]azul [?H7]",
    capo,
    linked: true,
    chordShapes: { "C/G": { frets: [3, 3, 2, 0, 1, 0], star: true } },
    chordStickers: [
      {
        id: "demo",
        x: 10,
        y: 100,
        width: 100,
        page: 0,
        chords: ["C/G", "Dm7", "Bb"],
      },
    ],
  });
const pitches = (song) =>
  [...song.text.matchAll(/\[(?!\?)([^\]]+)\]/g)].map((m) =>
    m[1].split("/").map((note) => (pc(note) + song.capo) % 12),
  );

test("every capo and transposition combination preserves the sounding offset, including slash basses", () => {
  for (let originalCapo = 0; originalCapo <= 12; originalCapo++) {
    for (let offset = -14; offset <= 14; offset++) {
      const song = makeSong(originalCapo),
        original = structuredClone(song);
      const controller = createTransposition();
      controller.shift(song, offset);
      for (const capo of [0, 12, 5, 1, 11, 3, originalCapo]) {
        controller.setCapo(song, capo);
        assert.equal(controller.get(song.id)?.offset ?? 0, offset);
        assert.deepEqual(
          pitches(song),
          pitches(original).map((chord) =>
            chord.map((pitch) => (pitch + (offset % 12) + 12) % 12),
          ),
        );
        assert.match(song.text, /\[\?H7\]/);
      }
      controller.undo(song);
      assert.deepEqual(song, original);
      assert.equal(controller.get(song.id), undefined);
    }
  }
});

test("mixed controls and link toggles agree with an independent pitch model after every action", () => {
  const song = makeSong(),
    original = structuredClone(song),
    controller = createTransposition();
  let offset = 0,
    compensation = 0,
    seed = 271828;
  for (let i = 0; i < 1500; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const action = seed % 6;
    if (action < 2) {
      const delta = action ? 1 : -1;
      controller.shift(song, delta);
      offset += delta;
    } else if (action < 4) {
      const capo = (seed >>> 8) % 13;
      if (song.linked) compensation += song.capo - capo;
      controller.setCapo(song, capo);
    } else if (action === 4) song.linked = !song.linked;
    else {
      controller.undo(song);
      offset = 0;
    }
    const total = offset + compensation + song.capo - original.capo;
    assert.deepEqual(
      pitches(song),
      pitches(original).map((chord) =>
        chord.map((pitch) => (((pitch + total) % 12) + 12) % 12),
      ),
    );
    assert.equal(controller.get(song.id)?.offset ?? 0, offset);
  }
});

test("a failed transposition cannot partly change capo, diagrams or reset history", () => {
  const song = makeSong(0),
    controller = createTransposition();
  song.text = "[C]" + "a".repeat(49997);
  const before = structuredClone(song);
  assert.throws(() => controller.shift(song, 1), /50.000/);
  assert.deepEqual(song, before);
  assert.equal(controller.get(song.id), undefined);
  // Linked capo 11 turns C into C#, which also exceeds the source limit.
  assert.throws(() => controller.setCapo(song, 11), /50.000/);
  assert.deepEqual(song, before);
});

test("capo input is integral and bounded; song histories are independent", () => {
  const a = makeSong(),
    b = makeSong(),
    controller = createTransposition();
  controller.shift(a, 2);
  controller.shift(b, -3);
  controller.setCapo(a, 7.8);
  assert.equal(a.capo, 8);
  controller.setCapo(a, 100);
  assert.equal(a.capo, 12);
  controller.setCapo(a, -10);
  assert.equal(a.capo, 0);
  controller.setCapo(a, NaN);
  assert.equal(a.capo, 0);
  assert.equal(controller.get(a.id).offset, 2);
  assert.equal(controller.get(b.id).offset, -3);
});
