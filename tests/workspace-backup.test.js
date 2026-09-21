import test from "node:test";
import assert from "node:assert/strict";
import {
  serializeWorkspace,
  restoreWorkspace,
} from "../src/workspace-backup.js";
import { createSong } from "../src/song-state.js";
test("workspace backups preserve songs and settings with fresh IDs for safe merges", () => {
  const original = createSong({
    title: "[Original]",
    text: "[C]Song",
    fontSize: 15,
    columns: 2,
  });
  const restored = restoreWorkspace(
    serializeWorkspace([original], original.id),
  );
  assert.notEqual(restored.active, original.id);
  assert.equal(restored.songs[0].text, original.text);
  assert.equal(restored.songs[0].fontSize, 15);
  assert.equal(restored.songs[0].columns, 2);
  assert.equal(restored.songs[0].dirty, true);
});
test("workspace restore rejects malformed and future formats", () => {
  for (const value of [
    "{}",
    "null",
    '{"format":"chordi-workspace","version":2,"songs":[]}',
    '{"format":"chordi-workspace","version":1,"songs":[null]}',
  ])
    assert.throws(() => restoreWorkspace(value));
});
