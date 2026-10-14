import { alignmentLine } from "./chord-alignment.js";

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
