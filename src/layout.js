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
    title = song.title || "Sin título",
    artist = song.artist || "";
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
  const rows = [];
  for (const line of parseSong(song.text)) {
    if (line.break) {
      rows.push(line);
      continue;
    }
    let lyric = line.lyric,
      marks = line.marks.map((m) => ({ ...m }));
    const instrumental = marks.length > 0 && /^[\s|:–—−\-]*$/.test(lyric);
    if (instrumental) {
      let text = "",
        end = 0;
      marks = [];
      for (const m of line.raw.matchAll(/\[([^\]]+)\]/g)) {
        text += line.raw.slice(end, m.index);
        if (chordRE.test(m[1])) {
          marks.push({ at: text.length, chord: m[1] });
          text += " ".repeat(m[1].length);
        } else text += m[0];
        end = m.index + m[0].length;
      }
      lyric = text + line.raw.slice(end);
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
        let lane = laneEnds.findIndex((end) => m.at >= end + 0.5);
        if (lane < 0) lane = laneEnds.length;
        m.lane = lane;
        laneEnds[lane] = m.at + m.chord.length;
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
    if (y + row.height > PAGE.height - margin) nextColumn();
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
