import { parseSong, chordRE } from "./music.js";
export const PAGE = { width: 595.28, height: 841.89 };
function wrapText(text, capacity) {
  const lines = [];
  let rest = text;
  while (rest.length > capacity) {
    let split = rest.lastIndexOf(" ", capacity);
    if (split < capacity / 2) split = capacity;
    lines.push(rest.slice(0, split));
    rest = rest.slice(split).trimStart();
  }
  lines.push(rest);
  return lines;
}
export function layout(song) {
  const margin = (song.margin * 72) / 25.4,
    size = song.fontSize,
    cw = size * 0.6,
    gap = 18,
    bodyWidth = PAGE.width - margin * 2,
    width = (bodyWidth - gap * (song.columns - 1)) / song.columns,
    capacity = Math.max(8, Math.floor(width / cw));
  const titleSize = 16,
    artistSize = 12,
    title = (song.title || "").toLocaleUpperCase(),
    artist = (song.artist || "").toLocaleUpperCase();
  const artistInline =
    !!artist &&
    title.length * titleSize * 0.6 + 32 + artist.length * artistSize * 0.6 <=
      bodyWidth;
  const titleLines = wrapText(title, Math.floor(bodyWidth / (titleSize * 0.6)));
  const artistLines = artist
    ? wrapText(artist, Math.floor(bodyWidth / (artistSize * 0.6)))
    : [];
  const titleHeight = titleLines.length * 20;
  const artistY = artistInline ? 16 : titleHeight + 12;
  const capoY =
    titleHeight + 15 + (!artistInline && artist ? artistLines.length * 16 : 0);
  const headerHeight = capoY + 17;
  const header = {
    titleSize,
    artistSize,
    artistInline,
    artistX: artistInline ? title.length * titleSize * 0.6 + 32 : 0,
    artistY,
    artistLines,
    capoY,
  };
  const label = (chord) =>
    song.chordShapes?.[chord]?.star && !chord.endsWith("*")
      ? chord + "*"
      : chord;
  const rows = [];
  for (const line of parseSong(song.text)) {
    if (line.break) {
      rows.push(line);
      continue;
    }
    let lyric = line.lyric,
      marks = line.marks.map((m) => ({ ...m, chord: label(m.chord) }));
    const section =
      lyric.match(
        /^\s*(?:\[[^\]]+\]|(?:intro|solo|instrumental|interludio|puente|final|outro)\s*:)\s*/i,
      )?.[0] || "";
    const instrumental =
      marks.length > 0 &&
      /^[\s|:–—−\-]*(?:[x×]\d+|\([x×]?\d+\))?\s*$/i.test(
        lyric.slice(section.length),
      );
    if (instrumental) {
      // Instrumentals have their own horizontal flow. Each chord is a whole
      // token; spaces become dashes, while explicit bar/repeat signs survive.
      const matches = [...line.raw.matchAll(/\[([^\]]+)\]/g)].filter((m) =>
        chordRE.test(m[1]),
      );
      let text = "",
        sequenceMarks = [],
        offset = 0;
      function flush() {
        if (!text) return;
        rows.push({
          ...line,
          lyric: text,
          marks: sequenceMarks,
          height: size * 1.44,
          lyricOffset: 0,
          instrumental: true,
          offset,
        });
        offset += text.length;
        text = "";
        sequenceMarks = [];
      }
      function append(value) {
        if (text.length + value.length > capacity) flush();
        text += value;
      }
      const prefix = line.raw.slice(0, matches[0].index).trim();
      if (prefix) append(prefix + " ");
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i],
          chord = label(m[1]);
        const previous = matches[i - 1];
        const gap = previous
          ? line.raw.slice(previous.index + previous[0].length, m.index).trim()
          : "";
        const separator = i ? (gap ? ` ${gap} ` : " – ") : "";
        if (text.length + separator.length + chord.length > capacity) {
          // Keep meaningful bar signs, but don't strand a joining dash.
          if (gap) append(" " + gap);
          flush();
        } else text += separator;
        sequenceMarks.push({ at: text.length, x: text.length, chord, lane: 0 });
        text += " ".repeat(chord.length);
      }
      const last = matches.at(-1);
      const suffix = line.raw.slice(last.index + last[0].length).trim();
      if (suffix) append(" " + suffix);
      flush();
      continue;
    }
    const length = Math.max(
      lyric.length,
      ...marks.map((m) => m.at + m.chord.length),
      0,
    );
    if (!length) {
      rows.push({
        ...line,
        lyric: "",
        marks: [],
        height: size * 1.44,
        lyricOffset: 0,
        instrumental: false,
      });
      continue;
    }
    let offset = 0;
    while (offset < length) {
      let end = Math.min(offset + capacity, length);
      if (end < length) {
        const space = lyric.lastIndexOf(" ", end - 1);
        if (space > offset + capacity * 0.45) end = space + 1;
        const cross = marks.find(
          (m) => m.at < end && m.at + m.chord.length > end,
        );
        if (cross && cross.at > offset) end = cross.at;
      }
      const ms = marks
        .filter((m) => m.at >= offset && m.at < end)
        .map((m) => ({ ...m, at: m.at - offset }));
      const laneEnds = [];
      for (const m of ms) {
        // Keep the musical anchor (at) separate from the visual left edge (x).
        m.x = m.at;
        let lane = laneEnds.findIndex((end) => m.x >= end + 0.5);
        if (lane < 0) lane = laneEnds.length;
        m.lane = lane;
        laneEnds[lane] = m.x + m.chord.length;
      }
      const chordHeight =
        ms.length && !instrumental ? laneEnds.length * size * 1.44 : 0;
      rows.push({
        ...line,
        lyric: lyric.slice(offset, end),
        marks: ms,
        height: chordHeight + size * 1.44,
        lyricOffset: chordHeight,
        instrumental,
        offset,
      });
      offset = end;
    }
  }
  const pages = [];
  let page, col, y;
  function nextPage() {
    page = { columns: Array.from({ length: song.columns }, () => []) };
    pages.push(page);
    col = 0;
    y = margin + (pages.length === 1 ? headerHeight : 0);
  }
  function nextColumn() {
    col++;
    if (col >= song.columns) nextPage();
    else y = margin + (pages.length === 1 ? headerHeight : 0);
  }
  nextPage();
  for (const row of rows) {
    if (row.break) {
      if (page.columns[col].length) nextColumn();
      continue;
    }
    if (y + row.height > PAGE.height - Math.max(margin, 24)) nextColumn();
    page.columns[col].push({
      ...row,
      x: margin + col * (width + gap),
      y,
      width,
    });
    y += row.height;
  }
  return {
    pages,
    margin,
    size,
    cw,
    width,
    gap,
    titleLines,
    headerHeight,
    header,
  };
}

// Maximize readable type first. At equal size prefer one column, then a
// comfortable 10 mm margin; never shrink below 8 pt or force excess pages away.
export function fitToPage(song) {
  const text = song.text.replace(/^\s*\{(?:column|new_page)\}\s*$/gm, "");
  let best;
  for (let fontSize = 20; fontSize >= 8; fontSize -= 0.5) {
    for (const columns of [1, 2]) {
      for (const margin of [10, 9, 8, 7, 6]) {
        const candidate = { ...song, text, fontSize, columns, margin };
        const pages = layout(candidate).pages.length;
        if (pages === 1) return { text, fontSize, columns, margin };
        if (!best || pages < best.pages)
          best = { text, fontSize, columns, margin, pages };
      }
    }
  }
  const { pages, ...settings } = best;
  return settings;
}
