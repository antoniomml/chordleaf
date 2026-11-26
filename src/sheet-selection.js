import { alignmentLine, replaceAlignedLyrics } from "./chord-alignment.js";
import { parseSong } from "./music.js";

/** Translate a lyric boundary to source, including chords anchored at the
 * start of a selected word. Chords at the unselected endpoint stay in place. */
export function lyricSourceOffset(raw, at, end = false) {
  const line = alignmentLine(raw);
  at = Math.max(0, Math.min(line.lyric.length, at));
  at = line.boundaries.reduce(
    (best, boundary) =>
      Math.abs(boundary - at) < Math.abs(best - at) ? boundary : best,
    0,
  );
  if (end && at === line.lyric.length) return raw.length;
  return (
    at +
    line.marks
      .filter((mark) => mark.at < at)
      .reduce((sum, mark) => sum + mark.token.length, 0)
  );
}

/** Layout maps printed characters, so the final caret boundary is one cell
 * after its last entry. Collision padding may share source positions. */
export function displaySourceBoundary(positions, offset) {
  return (
    positions?.[offset] ??
    (positions
      ? (positions.at(-1) ?? -1) + offset - positions.length + 1
      : offset)
  );
}

/** Backspace across a printed editor boundary. Wrapped rows delete the
 * preceding lyric grapheme; logical verses join, keeping their chord tokens.
 * Only the affected legacy chord/lyric pairs need canonicalizing. */
export function backspaceSheetBoundary(text, index, at, first = index) {
  const lines = text.split("\n"),
    line = alignmentLine(lines[index]);
  let offset;
  if (at > 0) {
    at = Math.min(at, line.lyric.length);
    const start = line.segments.findLast((part) => part.index < at)?.index ?? 0;
    lines[index] = replaceAlignedLyrics(
      lines[index],
      line.lyric.slice(0, start) + line.lyric.slice(at),
    );
    at = start;
    offset = lyricSourceOffset(lines[index], at);
  } else {
    if (first === 0) return null;
    // Use the printed verse's extent: clearing its lyrics may temporarily make
    // a single remaining chord look like a legacy pair with the next verse.
    const previous = parseSong(lines.slice(0, first).join("\n")).at(-1);
    if (!previous || previous.break) return null;
    const before = lines
        .slice(previous.index, (previous.endIndex ?? previous.index) + 1)
        .join(""),
      after = lines.slice(first, index + 1).join("");
    lines.splice(previous.index, index - previous.index + 1, before + after);
    index = previous.index;
    at = alignmentLine(before).lyric.length;
    offset = before.length;
  }
  offset += lines.slice(0, index).reduce((sum, raw) => sum + raw.length + 1, 0);
  return { text: lines.join("\n"), index, at, offset };
}
