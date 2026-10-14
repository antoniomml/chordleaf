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

test("a locked key survives every capo and semitone combination, including slash basses", () => {
  for (let originalCapo = 0; originalCapo <= 12; originalCapo++) {
    for (let offset = -14; offset <= 14; offset++) {
      const song = makeSong(originalCapo),
        original = structuredClone(song),
        controller = createTransposition();
      const allowed = originalCapo - offset >= 0 && originalCapo - offset <= 12;
      assert.equal(controller.shift(song, offset), allowed);
      assert.equal(song.capo, allowed ? originalCapo - offset : originalCapo);
      for (const capo of [0, 12, 5, 1, 11, 3, originalCapo]) {
        controller.setCapo(song, capo);
        assert.equal(controller.get(song.id)?.offset ?? 0, originalCapo - capo);
        assert.deepEqual(pitches(song), pitches(original));
        assert.match(song.text, /\[\?H7\]/);
      }
      assert.deepEqual(song, original);
      assert.equal(controller.get(song.id), undefined);
    }
  }
});

test("mixed controls, resets and lock toggles agree with an independent pitch model after every action", () => {
  const song = makeSong(),
    original = structuredClone(song),
    controller = createTransposition();
  let offset = 0,
    capo = original.capo,
    locked = true,
    seed = 271828;
  for (let i = 0; i < 4000; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const action = seed % 6;
    if (action < 2) {
      const delta = action ? 1 : -1;
      const allowed = !locked || (capo - delta >= 0 && capo - delta <= 12);
      assert.equal(controller.canShift(song, delta), allowed);
      assert.equal(controller.shift(song, delta), allowed);
      if (allowed) {
        offset += delta;
        if (locked) capo -= delta;
      }
    } else if (action < 4) {
      const next = (seed >>> 8) % 13;
      if (locked) offset += capo - next;
      controller.setCapo(song, next);
      capo = next;
    } else if (action === 4) song.linked = locked = !locked;
    else {
      const allowed =
        Boolean(offset) &&
        (!locked || (capo + offset >= 0 && capo + offset <= 12));
      assert.equal(controller.canUndo(song), allowed);
      assert.equal(controller.undo(song), allowed);
      if (allowed) {
        if (locked) capo += offset;
        offset = 0;
      }
    }
    const total = offset + capo - original.capo;
    assert.deepEqual(
      pitches(song),
      pitches(original).map((chord) =>
        chord.map((pitch) => (((pitch + total) % 12) + 12) % 12),
      ),
    );
    assert.equal(controller.get(song.id)?.offset ?? 0, offset);
    assert.equal(song.capo, capo);
    if (!offset) {
      assert.equal(song.text, original.text);
      assert.deepEqual(song.chordShapes, original.chordShapes);
      assert.deepEqual(song.chordStickers, original.chordStickers);
    }
  }
});

test("a reset under lock restores original chords and compensates the capo", () => {
  const song = makeSong(3),
    original = structuredClone(song),
    controller = createTransposition();
  controller.setCapo(song, 6);
  assert.equal(controller.get(song.id).offset, -3);
  assert.equal(controller.undo(song), true);
  assert.deepEqual(song, original);
  song.linked = false;
  controller.shift(song, 10);
  song.linked = true;
  const before = structuredClone(song);
  assert.equal(controller.canUndo(song), false);
  assert.equal(controller.undo(song), false);
  assert.deepEqual(song, before);
  song.linked = false;
  assert.equal(controller.undo(song), true);
  assert.equal(song.text, original.text);
});

test("a failed transposition cannot partly change capo, diagrams or reset history", () => {
  const song = makeSong(1),
    controller = createTransposition();
  song.text = "[C]" + "a".repeat(49997);
  const before = structuredClone(song);
  assert.throws(() => controller.shift(song, 1), /50.000/);
  assert.deepEqual(song, before);
  assert.equal(controller.get(song.id), undefined);
  assert.throws(() => controller.setCapo(song, 12), /50.000/);
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
  assert.equal(controller.get(a.id).offset, 3);
  assert.equal(controller.get(b.id).offset, -3);
});
