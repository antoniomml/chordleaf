import { chordRE, unresolvedChordRE } from "./music.js";

/** Exact source tokens and lyric offsets; display padding never enters this model. */
export function alignmentLine(raw) {
  const marks = [],
    literals = [];
  let lyric = "",
    end = 0;
  for (const match of raw.matchAll(/\[([^\]\n]+)\]/g)) {
    if (!chordRE.test(match[1]) && !unresolvedChordRE.test(match[1])) {
      const at = lyric.length + match.index - end;
      literals.push({ start: at, end: at + match[0].length });
      continue;
    }
    lyric += raw.slice(end, match.index);
    marks.push({
      token: match[0],
      chord: match[1],
      start: match.index,
      end: match.index + match[0].length,
      at: lyric.length,
    });
    end = match.index + match[0].length;
  }
  lyric += raw.slice(end);
  const segments = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
      lyric,
    ),
  ];
  return {
    lyric,
    marks,
    segments,
    boundaries: [...segments.map((s) => s.index), lyric.length].filter(
      (at) =>
        !literals.some((literal) => at > literal.start && at < literal.end),
    ),
  };
}

/** Relocate just one bracket token. Moving beyond the lyric adds only the
 * spaces needed for the new anchor; every existing source byte stays in order. */
export function moveAlignedChord(raw, start, destination) {
  const line = alignmentLine(raw),
    mark = line.marks.find((m) => m.start === start);
  if (!mark) return { raw, start };
  const at =
    Number.isFinite(destination) && destination > line.lyric.length
      ? Math.round(destination)
      : line.boundaries.reduce(
          (best, value) =>
            Math.abs(value - destination) < Math.abs(best - destination)
              ? value
              : best,
          0,
        );
  if (at === mark.at) return { raw, start };
  const rest =
    raw.slice(0, mark.start) +
    raw.slice(mark.end) +
    " ".repeat(Math.max(0, at - line.lyric.length));
  const remaining = alignmentLine(rest);
  let insert = at;
  for (const other of remaining.marks)
    if (other.at <= at) insert += other.token.length;
  return {
    raw: rest.slice(0, insert) + mark.token + rest.slice(insert),
    start: insert,
  };
}

/** Edit lyrics while retaining every chord token and its anchor. Unchanged text
 * after an insertion/deletion carries its chords with it; replaced text keeps
 * anchors at the nearest remaining character boundary. Call for each input. */
export function replaceAlignedLyrics(raw, next) {
  const line = alignmentLine(raw),
    old = line.lyric;
  if (old === next) return raw;
  let prefix = 0,
    suffix = 0;
  while (
    prefix < old.length &&
    prefix < next.length &&
    old[prefix] === next[prefix]
  )
    prefix++;
  while (
    suffix < old.length - prefix &&
    suffix < next.length - prefix &&
    old[old.length - suffix - 1] === next[next.length - suffix - 1]
  )
    suffix++;
  const oldEnd = old.length - suffix,
    newEnd = next.length - suffix;
  const boundaries = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(next),
  ].map((part) => part.index);
  boundaries.push(next.length);
  let result = "",
    end = 0;
  for (const mark of line.marks) {
    const mapped =
      mark.at < prefix
        ? mark.at
        : mark.at >= oldEnd
          ? mark.at + next.length - old.length
          : Math.min(newEnd, mark.at);
    let low = 0,
      high = boundaries.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (boundaries[middle] < mapped) low = middle + 1;
      else high = middle;
    }
    const after = boundaries[low],
      before = boundaries[Math.max(0, low - 1)],
      at = mapped - before <= after - mapped ? before : after;
    result += next.slice(end, at) + mark.token;
    end = at;
  }
  return result + next.slice(end);
}

/** Apply an edit to one printed row. The inverse layout map distinguishes
 * actual lyrics from collision padding and preserves hidden wrap spaces. */
export function replaceDisplayedLyrics(raw, before, after, positions) {
  if (before === after) return { raw, positions };
  let prefix = 0,
    suffix = 0;
  while (
    prefix < before.length &&
    prefix < after.length &&
    before[prefix] === after[prefix]
  )
    prefix++;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before.at(-suffix - 1) === after.at(-suffix - 1)
  )
    suffix++;
  const lyric = alignmentLine(raw).lyric;
  const boundary = (at) =>
    Math.min(lyric.length, positions[at] ?? lyric.length);
  const start = boundary(prefix),
    end = boundary(before.length - suffix);
  const inserted = after.slice(prefix, after.length - suffix);
  const delta = inserted.length - (end - start);
  return {
    raw: replaceAlignedLyrics(
      raw,
      lyric.slice(0, start) + inserted + lyric.slice(end),
    ),
    positions: [
      ...positions.slice(0, prefix),
      ...Array.from({ length: inserted.length }, (_, i) => start + i),
      ...positions.slice(before.length - suffix).map((at) => at + delta),
    ],
  };
}
