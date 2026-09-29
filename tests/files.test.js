import test from "node:test";
import assert from "node:assert/strict";
import { chordPro, downloadName, importText, titleCase } from "../src/files.js";

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

test("ChordPro output omits empty metadata and a zero capo", () => {
  assert.equal(
    chordPro({ title: "", artist: " ", capo: 0, text: "[G]a\n{column}\n[C]b" }),
    "[G]a\n{column_break}\n[C]b",
  );
  assert.equal(
    chordPro({ title: "Luz", artist: "", capo: 0, text: "[G]a" }),
    "{title: Luz}\n\n[G]a",
  );
});

test("ChordPro directives become sheet lines instead of lyrics", () => {
  const imported = importText(
    [
      "{t: Demo}",
      "{st: Yo}",
      "{key: G}",
      "{tempo: 90}",
      "# a file comment",
      "{start_of_verse}",
      "[G]Hola [D]mundo",
      "{end_of_verse}",
      "",
      "{soc}",
      "[C]Canta [G]conmigo",
      "{eoc}",
      "{comment: Puente suave}",
      '{start_of_bridge: label="Final"}',
      "[Am]Adiós",
      "{end_of_bridge}",
      "{chorus}",
      "{colb}",
      "{np}",
      "{unknown_directive: x}",
    ].join("\n"),
    "fallback",
  );
  assert.equal(imported.title, "Demo");
  assert.equal(imported.artist, "Yo");
  assert.equal(
    imported.text,
    "[G]Hola [D]mundo\n\nEstribillo:\n[C]Canta [G]conmigo\n(Puente suave)\nFinal:\n[Am]Adiós\n(Estribillo)\n{column}\n{new_page}",
  );
});

test("plain text keeps hash lines when there are no ChordPro directives", () => {
  assert.equal(importText("#1 [G]Hola", "x").text, "#1 [G]Hola");
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

test("chord rows with repeat marks and section labels stay chords", () => {
  assert.equal(
    importText("Am   F   G   G  (x4)\n\nC   Em   x2", "x").text,
    "[Am]   [F]   [G]   [G]  (x4)\n\n[C]   [Em]   x2",
  );
  assert.equal(
    importText("Intro X2: G Am\nCoro: Am F\nCoro: dijo que no", "x").text,
    "Intro X2: [G] [Am]\nCoro: [Am] [F]\nCoro: dijo que no",
  );
});

test("title case keeps Irish-style surnames", () => {
  assert.equal(titleCase("GILBERT O'SULLIVAN"), "Gilbert O'Sullivan");
});
