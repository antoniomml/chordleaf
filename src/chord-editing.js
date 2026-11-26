import { alignmentLine } from "./chord-alignment.js";
import { chordRE, unresolvedChordRE, parseSong } from "./music.js";
import { assertTextLength, MAX_TEXT_LENGTH } from "./song-state.js";
import { t } from "./i18n.js";

export const CHORD_CLIPBOARD_TYPE = "application/x-chordleaf-chords+json";
const validChord = (value) =>
  typeof value === "string" &&
  value.length <= 40 &&
  (chordRE.test(value) || unresolvedChordRE.test(value));

/** Logical verses, independent of page wrapping and collision padding. */
export function chordVerses(text) {
  const lines = text.split("\n");
  return parseSong(text)
    .filter((row) => !row.break)
    .map((row) => {
      // Legacy standalone chord rows belong to the following lyric verse.
      const raw = lines
        .slice(row.index, (row.endIndex ?? row.index) + 1)
        .join("");
      return { ...row, ...alignmentLine(raw), raw };
    });
}

export function copyChordRows(text, first, last = first) {
  const verses = chordVerses(text);
  const start = verses.findIndex((row) => row.index === Math.min(first, last));
  const end = verses.findIndex((row) => row.index === Math.max(first, last));
  if (start < 0 || end < start) return null;
  return {
    version: 1,
    rows: verses.slice(start, end + 1).map((row) => ({
      marks: row.marks.map(({ at, chord }) => ({ at, chord })),
    })),
  };
}

export function readChordPacket(value) {
  if (typeof value !== "string" || value.length > MAX_TEXT_LENGTH * 12)
    return null;
  try {
    const data = JSON.parse(value);
    if (
      data?.version !== 1 ||
      !Array.isArray(data.rows) ||
      !data.rows.length ||
      data.rows.length > MAX_TEXT_LENGTH
    )
      return null;
    let budget = data.rows.length;
    for (const row of data.rows) {
      if (!Array.isArray(row.marks)) return null;
      let extent = 0;
      for (const mark of row.marks) {
        if (
          !Number.isInteger(mark.at) ||
          mark.at < 0 ||
          mark.at > MAX_TEXT_LENGTH ||
          !validChord(mark.chord)
        )
          return null;
        budget += mark.chord.length + 2;
        extent = Math.max(extent, mark.at);
        if (budget > MAX_TEXT_LENGTH) return null;
      }
      budget += extent;
      if (budget > MAX_TEXT_LENGTH) return null;
    }
    return {
      version: 1,
      rows: data.rows.map((row) => ({
        marks: row.marks.map(({ at, chord }) => ({ at, chord })),
      })),
    };
  } catch {
    return null;
  }
}

export function chordPacketText(packet) {
  return packet.rows
    .map(({ marks }) => {
      let line = "";
      for (const mark of [...marks].sort((a, b) => a.at - b.at)) {
        const at = Math.max(line.length ? line.length + 1 : 0, mark.at);
        line += " ".repeat(at - line.length) + mark.chord;
      }
      return line;
    })
    .join("\n");
}

/** Plain chord rows copied from another editor remain useful too. */
export function chordPacketFromText(text) {
  if (!text?.trim() || text.length > MAX_TEXT_LENGTH) return null;
  const rows = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => ({
      marks: [...line.matchAll(/\S+/g)].map((match) => ({
        at: match.index,
        chord: match[0],
      })),
    }));
  if (rows.some((row) => row.marks.some((mark) => !validChord(mark.chord))))
    return null;
  return { version: 1, rows };
}

export function insertSheetChord(raw, chord, destination) {
  if (
    !validChord(chord) ||
    !Number.isInteger(destination) ||
    destination < 0 ||
    destination > MAX_TEXT_LENGTH
  )
    throw new Error(t("Introduce un acorde válido, por ejemplo C o Em7."));
  const line = alignmentLine(raw);
  const at =
    destination > line.lyric.length
      ? destination
      : line.boundaries.reduce(
          (best, value) =>
            Math.abs(value - destination) < Math.abs(best - destination)
              ? value
              : best,
          0,
        );
  const token = `[${chord}]`;
  assertTextLength(
    raw + token + " ".repeat(Math.max(0, at - line.lyric.length)),
  );
  const padded = raw + " ".repeat(Math.max(0, at - line.lyric.length));
  const offset =
    at +
    line.marks
      .filter((mark) => mark.at <= at)
      .reduce((sum, mark) => sum + mark.token.length, 0);
  return padded.slice(0, offset) + token + padded.slice(offset);
}

/** Apply the whole fragment atomically, retaining lyric words and source rows
 * outside the destination. Only edited legacy pairs are canonicalized. */
export function pasteChordRows(
  text,
  first,
  packet,
  { at = 0, replace = false, last = first } = {},
) {
  packet = readChordPacket(JSON.stringify(packet));
  if (!packet) throw new Error(t("El fragmento de acordes no es válido."));
  const verses = chordVerses(text);
  const start = verses.findIndex((row) => row.index === first);
  const end = verses.findIndex((row) => row.index === last);
  if (start < 0 || start + packet.rows.length > verses.length)
    throw new Error(
      t("No hay suficientes versos para pegar todos los acordes."),
    );
  if (replace && end - start + 1 !== packet.rows.length)
    throw new Error(
      t("Selecciona el mismo número de versos para sustituir sus acordes."),
    );
  const lines = text.split("\n");
  for (let n = packet.rows.length - 1; n >= 0; n--) {
    const row = verses[start + n];
    let raw = replace ? row.lyric : row.raw;
    const existing = replace ? [] : row.marks;
    for (const mark of [...packet.rows[n].marks].sort((a, b) => a.at - b.at)) {
      const anchor = mark.at + at;
      if (
        !existing.some((old) => old.at === anchor && old.chord === mark.chord)
      )
        raw = insertSheetChord(raw, mark.chord, anchor);
    }
    if (raw !== row.raw)
      lines.splice(row.index, (row.endIndex ?? row.index) - row.index + 1, raw);
  }
  const next = lines.join("\n");
  assertTextLength(next);
  return next;
}
