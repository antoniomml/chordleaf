import test from "node:test";
import assert from "node:assert/strict";
import {
  serializeWorkspace,
  restoreWorkspace,
  workspaceBackupParts,
} from "../src/workspace-backup.js";
import { createSong } from "../src/song-state.js";

test("large backups split into restorable parts without dropping open or closed songs", () => {
  const songs = Array.from({ length: 520 }, (_, index) =>
    createSong({ title: `Open ${index}`, text: `[C]Canción ${index}` }),
  );
  const recent = Array.from({ length: 91 }, (_, index) => ({
    song: createSong({
      title: `Closed ${index}`,
      text: `[G]Reciente ${index}`,
    }),
    closedAt: index + 1,
  }));
  const parts = workspaceBackupParts(songs, songs[519].id, recent);
  assert.ok(parts.length > 1);
  const restored = parts.map((part) => restoreWorkspace(part.text));
  assert.deepEqual(
    restored.flatMap((part) => part.songs.map((song) => song.title)),
    songs.map((song) => song.title),
  );
  assert.deepEqual(
    restored.flatMap((part) => part.recent.map((entry) => entry.song.text)),
    recent.map((entry) => entry.song.text),
  );
  assert.equal(
    parts.reduce((sum, part) => sum + part.count, 0),
    611,
  );
  for (const part of parts) {
    assert.ok(part.count <= 500);
    assert.ok(new TextEncoder().encode(part.text).length <= 10 * 1024 * 1024);
  }
});

test("backup parts respect encoded byte limits and reject an invalid song before offering downloads", () => {
  const songs = Array.from({ length: 160 }, () =>
    createSong({ text: "á".repeat(50000) }),
  );
  const parts = workspaceBackupParts(songs, songs[0].id);
  assert.ok(parts.length > 1);
  assert.ok(
    parts.every((part) => restoreWorkspace(part.text).songs.length > 0),
  );
  assert.throws(
    () =>
      workspaceBackupParts(
        [...songs, createSong({ text: "a".repeat(50001) })],
        songs[0].id,
      ),
    /50.000/,
  );
});
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
    '{"format":"chordleaf-workspace","version":2,"songs":[]}',
    '{"format":"chordleaf-workspace","version":1,"songs":[null]}',
  ])
    assert.throws(() => restoreWorkspace(value));
});

test("workspace restore accepts legacy Chordi backups", () => {
  const legacy = JSON.stringify({
    format: "chordi-workspace",
    version: 1,
    active: "legacy",
    songs: [{ id: "legacy", text: "[G]Legacy song" }],
  });
  assert.equal(restoreWorkspace(legacy).songs[0].text, "[G]Legacy song");
});

test("workspace restore rejects oversized songs without truncating the backup", () => {
  const song = createSong({ text: "x".repeat(50001) });
  assert.throws(() => serializeWorkspace([song], song.id), /50.000/);
  const backup = JSON.stringify({
    format: "chordleaf-workspace",
    version: 1,
    songs: [song],
  });
  assert.throws(() => restoreWorkspace(backup), /50.000/);
  assert.equal(JSON.parse(backup).songs[0].text.length, 50001);
});

test("a backup preserves both open and closed songs and restores fresh IDs", () => {
  const open = createSong({ title: "Open", text: "[C]Open" });
  const closed = createSong({ title: "Closed", text: "[G]Closed" });
  const restored = restoreWorkspace(
    serializeWorkspace([open], open.id, [{ song: closed, closedAt: 123 }]),
  );
  assert.equal(restored.songs.length, 1);
  assert.equal(restored.recent.length, 1);
  assert.equal(restored.recent[0].song.text, closed.text);
  assert.equal(restored.recent[0].closedAt, 123);
  assert.notEqual(restored.recent[0].song.id, closed.id);
  assert.equal(restored.active, restored.songs[0].id);
  const onlyClosed = restoreWorkspace(
    serializeWorkspace([], null, [{ song: closed, closedAt: 123 }]),
  );
  assert.equal(onlyClosed.songs.length, 0);
  assert.equal(onlyClosed.recent.length, 1);
  assert.equal(onlyClosed.active, null);
});

test("backup rejects malformed closed entries and excessive song counts", () => {
  const base = { format: "chordleaf-workspace", version: 1, songs: [] };
  for (const recent of [null, {}, [null], [{ song: { text: "x" } }]])
    assert.throws(() => restoreWorkspace(JSON.stringify({ ...base, recent })));
  const closed = Array.from({ length: 501 }, () => ({
    song: createSong({ text: "x" }),
    closedAt: 1,
  }));
  assert.throws(() => serializeWorkspace([], null, closed), /500/);
  closed[0].song.text = "x".repeat(50001);
  assert.throws(
    () => serializeWorkspace([], null, closed.slice(0, 1)),
    /50.000/,
  );
});
