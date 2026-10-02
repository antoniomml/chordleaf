import test from "node:test";
import assert from "node:assert/strict";
import { createSong } from "../src/song-state.js";
import {
  forget,
  readRecent,
  rememberClosed,
  worthKeeping,
} from "../src/recent-projects.js";

test("closed songs move to the front of Recents without duplicates", () => {
  const a = createSong({ title: "A", text: "[G]a" });
  const b = createSong({ title: "B", text: "[C]b" });
  let recent = rememberClosed([], a, 1);
  recent = rememberClosed(recent, b, 2);
  recent = rememberClosed(recent, a, 3);
  assert.deepEqual(
    recent.map((entry) => [entry.song.title, entry.closedAt]),
    [
      ["A", 3],
      ["B", 2],
    ],
  );
  assert.deepEqual(
    forget(recent, a.id).map((entry) => entry.song.title),
    ["B"],
  );
});

test("closing songs never evicts an earlier song's only copy", () => {
  let recent = [];
  for (let i = 0; i < 25; i++)
    recent = rememberClosed(
      recent,
      createSong({ title: `S${i}`, text: "x" }),
      i,
    );
  assert.equal(recent.length, 25);
  assert.equal(recent[0].song.title, "S24");
  assert.equal(recent.at(-1).song.title, "S0");
  assert.equal(readRecent(JSON.stringify(recent)).length, 25);
});

test("stored Recents are rebuilt from known fields and bad data is ignored", () => {
  const restored = readRecent(
    JSON.stringify([
      {
        song: { id: "a-1", title: "Luz", text: "[G]x", evil: "<script>" },
        closedAt: 5,
      },
      { song: { title: "no text" }, closedAt: 1 },
      { song: { text: "no time" } },
      null,
    ]),
  );
  assert.equal(restored.length, 1);
  assert.equal(restored[0].song.title, "Luz");
  assert.equal("evil" in restored[0].song, false);
  assert.deepEqual(readRecent("not json"), []);
  assert.deepEqual(readRecent(null), []);
});

test("an untouched blank song is not kept", () => {
  assert.equal(worthKeeping(createSong()), false);
  assert.equal(worthKeeping(createSong({ title: "Idea" })), true);
  assert.equal(worthKeeping(createSong({ text: " \n " })), false);
});
