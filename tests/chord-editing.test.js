import test from "node:test";
import assert from "node:assert/strict";
import { alignmentLine } from "../src/chord-alignment.js";
import {
  copyChordRows,
  pasteChordRows,
  insertSheetChord,
  chordPacketText,
  chordPacketFromText,
  readChordPacket,
} from "../src/chord-editing.js";
import { createDocumentHistory } from "../src/document-history.js";

test("copying a stanza transfers only chords, with original anchors beyond shorter lyrics", () => {
  const source =
    "[G]Vuelvo a mirar [D]el mar\n[Em]queda [C]luz\n\nHoy\nOtra letra";
  const packet = copyChordRows(source, 0, 1);
  const result = pasteChordRows(source, 3, packet);
  assert.equal(
    result,
    "[G]Vuelvo a mirar [D]el mar\n[Em]queda [C]luz\n\n[G]Hoy            [D]\n[Em]Otra l[C]etra",
  );
  assert.equal(alignmentLine(result.split("\n")[3]).marks[1].at, 15);
  assert.equal(
    source.split("\n")[4],
    alignmentLine(result.split("\n")[4]).lyric,
  );
});

test("selected destinations replace chords; a cursor merges without duplicating identical marks", () => {
  const packet = copyChordRows("[G]Primera [D]línea", 0);
  assert.equal(
    pasteChordRows("[C]Otra [Am]letra", 0, packet, { replace: true }),
    "[G]Otra let[D]ra",
  );
  assert.equal(
    pasteChordRows("[G]Otra letra", 0, {
      version: 1,
      rows: [{ marks: [{ at: 0, chord: "G" }] }],
    }),
    "[G]Otra letra",
  );
  assert.throws(
    () =>
      pasteChordRows("Una línea", 0, copyChordRows("[G]Una\n[C]Otra", 0, 1)),
    /suficientes versos/,
  );
});

test("legacy pairs, section literals and Unicode retain their meaning", () => {
  const packet = copyChordRows("[G]\nUna letra", 0);
  assert.deepEqual(packet.rows[0].marks, [{ at: 0, chord: "G" }]);
  assert.equal(
    pasteChordRows("[C]\nOtra letra", 0, packet, { replace: true }),
    "[G]Otra letra",
  );
  assert.equal(
    insertSheetChord("[Intro] Café 👩‍🎤", "D/F#", 12),
    "[Intro] Caf[D/F#]é 👩‍🎤",
  );
  assert.equal(insertSheetChord("Luz", "Am7", 8), "Luz     [Am7]");
});

test("clipboard data is validated and plain chord lines retain their columns", () => {
  const packet = copyChordRows("[Cmaj7]Una [G]casa", 0);
  assert.deepEqual(readChordPacket(JSON.stringify(packet)), packet);
  assert.ok(chordPacketFromText(chordPacketText(packet)));
  assert.equal(chordPacketFromText("texto que no es acorde"), null);
  for (const value of [
    "null",
    "{}",
    '{"version":1,"rows":[null]}',
    '{"version":1,"rows":[{"marks":[{"at":-1,"chord":"G"}]}]}',
    '{"version":1,"rows":[{"marks":[{"at":1e9,"chord":"G"}]}]}',
  ])
    assert.equal(readChordPacket(value), null);
  assert.throws(
    () => insertSheetChord("a".repeat(50000), "G", 0),
    /demasiado largo/,
  );
});

test("document undo groups operations, isolates songs and rejects stale changes", () => {
  let owner = { text: "Letra" };
  const first = owner;
  const history = createDocumentHistory({
    song: () => owner,
    update: (text) => {
      owner.text = text;
    },
  });
  const change = (text) => {
    const before = owner.text;
    owner.text = text;
    history.record(before, text);
  };
  change("[G]Letra");
  change("[G]Letra [C]");
  history.restore();
  assert.equal(owner.text, "[G]Letra");
  history.restore(true);
  assert.equal(owner.text, "[G]Letra [C]");
  owner = { text: "Otra canción" };
  assert.equal(history.peek(), undefined);
  owner = first;
  owner.text = "Edición externa";
  assert.equal(history.restore(), false);
  change("[Am]Edición externa");
  history.restore();
  assert.equal(owner.text, "Edición externa");
});
