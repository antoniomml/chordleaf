import test from "node:test";
import assert from "node:assert/strict";
import { chordPro, downloadName, importText } from "../src/files.js";

test("download names drop unsafe characters and keep the song title", () => {
  assert.equal(downloadName("Luz / del : día", "Canción"), "Luz - del - día");
  assert.equal(downloadName("C:\\temp\\a\u0000b", "Canción"), "C--temp-ab");
  assert.equal(downloadName("a\nb\tc", "Canción"), "abc");
  assert.equal(downloadName("  Corazón  ", "Canción"), "Corazón");
});

test("download names fall back when the title is empty", () => {
  assert.equal(downloadName("", "Canción"), "Canción");
  assert.equal(downloadName("   ", "Canción"), "Canción");
  assert.equal(downloadName(undefined, "Canción"), "Canción");
  assert.equal(downloadName("///", "Canción"), "---");
});

test("ChordPro output carries metadata and inline chords", () => {
  const song = {
    title: "Luz",
    artist: "Noche",
    capo: 3,
    text: "[C]Una ca[G]sa\n[Dm]azul",
  };
  const output = chordPro(song);
  assert.equal(
    output,
    "{title: Luz}\n{artist: Noche}\n{capo: 3}\n\n[C]Una ca[G]sa\n[Dm]azul",
  );
  assert.doesNotMatch(output, /\{chordleaf|\{columns|\{fontSize/);
});

test("ChordPro round-trip keeps text, capo, title and artist", () => {
  const song = {
    title: "Luz",
    artist: "Noche",
    capo: 3,
    text: "[C]Una ca[G]sa\n[Dm]azul",
  };
  const imported = importText(chordPro(song));
  assert.equal(imported.title, song.title);
  assert.equal(imported.artist, song.artist);
  assert.equal(imported.capo, song.capo);
  assert.equal(imported.text, song.text);
});
