import { t } from "./i18n.js";
import { chordRE, unresolvedChordRE } from "./music.js";
const separatorRE = /^[|:–—−\-]+$/;
const cleanChord = (t) => t.replace(/[\[\]]/g, "");
const chordToken = (t) =>
  chordRE.test(cleanChord(t)) || unresolvedChordRE.test(cleanChord(t));
const tokens = (t) => [...t.matchAll(/\S+/g)];
export function chordRow(items) {
  const ts = items.flatMap((i) => tokens(i.text));
  return (
    ts.some((t) => chordToken(t[0])) &&
    ts.every((t) => chordToken(t[0]) || separatorRE.test(t[0]))
  );
}
function rowsOf(items) {
  const rows = [];
  for (const i of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    let row = rows.find(
      (r) => Math.abs(r.y - i.y) < Math.min(2.5, i.size * 0.23),
    );
    if (!row) {
      row = { y: i.y, items: [] };
      rows.push(row);
    }
    row.items.push(i);
  }
  for (const r of rows) r.items.sort((a, b) => a.x - b.x);
  return rows;
}
function joinItems(items) {
  let text = "",
    positions = [];
  let lastRight;
  for (const it of items) {
    const charWidth = it.width / Math.max(1, it.text.length);
    if (
      text &&
      lastRight !== undefined &&
      it.x - lastRight > charWidth * 0.4 &&
      !text.endsWith(" ") &&
      !it.text.startsWith(" ")
    ) {
      text += " ";
      positions.push(lastRight);
    }
    for (let j = 0; j < it.text.length; j++) {
      positions.push(
        it.x + (it.advances?.[j] ?? j / it.text.length) * it.width,
      );
      text += it.text[j];
    }
    lastRight = it.x + it.width;
  }
  return { text, positions };
}
function standalone(items) {
  const joined = joinItems(items).text;
  return joined.replace(/\S+/g, (t) =>
    chordRE.test(cleanChord(t)) ? `[${cleanChord(t)}]` : t,
  );
}
function readColumn(items) {
  const rows = rowsOf(items);
  const gaps = rows
    .slice(1)
    .map((r, i) => r.y - rows[i].y)
    .filter((n) => n > 3)
    .sort((a, b) => a - b);
  const step = gaps[Math.floor(gaps.length / 2)] || 12;
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i],
      next = rows[i + 1],
      isChords = chordRow(row.items);
    if (
      isChords &&
      next &&
      !chordRow(next.items) &&
      next.y - row.y < step * 1.65 &&
      !row.items.some((it) => /[|]/.test(it.text))
    ) {
      const lyric = joinItems(next.items),
        marks = [];
      for (const it of row.items)
        for (const t of tokens(it.text)) {
          if (!chordRE.test(cleanChord(t[0]))) continue;
          const x =
            it.x +
            (it.advances?.[t.index] ?? t.index / it.text.length) * it.width;
          let at = 0;
          for (let j = 1; j < lyric.positions.length; j++)
            if (
              Math.abs(lyric.positions[j] - x) <
              Math.abs(lyric.positions[at] - x)
            )
              at = j;
          const last = next.items.at(-1);
          const cell = last.width / Math.max(1, last.text.length);
          const right = last.x + last.width;
          if (x >= right - cell * 0.4)
            at =
              lyric.text.length + Math.max(0, Math.round((x - right) / cell));
          marks.push({ at, chord: cleanChord(t[0]) });
        }
      lyric.text = lyric.text.padEnd(
        Math.max(lyric.text.length, ...marks.map((m) => m.at)),
        " ",
      );
      for (const m of marks.sort((a, b) => b.at - a.at))
        lyric.text =
          lyric.text.slice(0, m.at) + `[${m.chord}]` + lyric.text.slice(m.at);
      out.push(lyric.text);
      i++;
    } else
      out.push(isChords ? standalone(row.items) : joinItems(row.items).text);
    if (rows[i + 1]) {
      const blanks = Math.max(
        0,
        Math.round((rows[i + 1].y - rows[i].y) / step) - 1,
      );
      for (let b = 0; b < Math.min(blanks, 3); b++) out.push("");
    }
  }
  return { lines: out, step, start: rows[0]?.y || 0 };
}
// Column detection uses repeated left edges of lyric rows, not every chord's x.
// A long verse may cross the gutter without turning the page into one column.
function columnSplit(items, width) {
  const lyric = items.filter((i) => !chordRow([i]) && i.text.trim().length > 6);
  const clusters = [];
  for (const i of lyric) {
    let c = clusters.find((c) => Math.abs(c.x - i.x) < 5);
    if (!c) {
      c = { x: i.x, count: 0 };
      clusters.push(c);
    }
    c.count++;
  }
  const left = clusters
    .filter((c) => c.x < width * 0.35)
    .sort((a, b) => b.count - a.count)[0];
  const right = clusters
    .filter((c) => c.x > width * 0.38 && c.x < width * 0.7)
    .sort((a, b) => b.count - a.count)[0];
  return left && right && left.count >= 3 && right.count >= 3
    ? right.x - 3
    : null;
}
export function parsePdfPages(pages, fallback) {
  let title = "",
    artist = "",
    capo = 0;
  const headerTexts = new Set();
  let fontSize = 10,
    margin = 10,
    columns = 1;
  const all = [];
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const p = pages[pageIndex];
    let items = p.items.filter(
      (i) =>
        i.text.trim() &&
        !(
          /^(?:chordleaf\.com|Chordleaf|Chordi|Jordi)$/.test(i.text.trim()) &&
          i.y > p.height - 24 &&
          i.size <= 8
        ),
    );
    const initialRows = rowsOf(items);
    const metadataItems = new Set();
    for (const row of initialRows) {
      const match = joinItems(row.items).text.match(
        /^(?:capo|cejilla)\s*[:=]?\s*(\d+)\s*$/i,
      );
      if (match) {
        if (pageIndex === 0) capo = Number(match[1]);
        row.items.forEach((i) => metadataItems.add(i));
      }
    }
    if (pageIndex === 0 && items.length) {
      const sizes = items.map((i) => i.size).sort((a, b) => a - b);
      const body = sizes[Math.floor(sizes.length / 2)];
      fontSize = Math.max(7, Math.min(16, Math.round(body * 2) / 2));
      margin = Math.max(
        5,
        Math.min(
          25,
          Math.round((Math.min(...items.map((i) => i.x)) * 25.4) / 72),
        ),
      );
      const firstMusic = initialRows.find((r) => chordRow(r.items));
      const header = initialRows.filter(
        (r) => r.y < (firstMusic?.y ?? p.height * 0.15) && r.y < p.height * 0.2,
      );
      const candidate = header
        .flatMap((r) => r.items)
        .filter((i) => !metadataItems.has(i) && !/capo|cejilla/i.test(i.text))
        .sort((a, b) => b.size - a.size || a.y - b.y)[0];
      if (candidate) {
        const titleItems = header
          .flatMap((r) => r.items)
          .filter(
            (i) =>
              Math.abs(i.size - candidate.size) < 0.6 &&
              !metadataItems.has(i) &&
              !/capo|cejilla/i.test(i.text),
          );
        title = joinItems(titleItems).text.trim();
        titleItems.forEach((i) => headerTexts.add(i.text));
        const artistItems = header
          .flatMap((r) => r.items)
          .filter(
            (i) =>
              !headerTexts.has(i.text) &&
              !metadataItems.has(i) &&
              !/capo|cejilla/i.test(i.text),
          );
        artist = joinItems(artistItems).text.trim();
        artistItems.forEach((i) => headerTexts.add(i.text));
      }
    }
    items = items.filter((i) => {
      if (metadataItems.has(i)) return false;
      const m = i.text.match(/(?:capo|cejilla)\s*[:=]?\s*(\d+)/i);
      if (m) {
        if (pageIndex === 0) capo = Number(m[1]);
        return false;
      }
      return (
        !(headerTexts.has(i.text) && i.y < p.height * 0.2) &&
        !(/^\d+$/.test(i.text.trim()) && i.y > p.height * 0.9)
      );
    });
    const split = columnSplit(items, p.width);
    if (split) columns = 2;
    const groups = split
      ? [items.filter((i) => i.x < split), items.filter((i) => i.x >= split)]
      : [items];
    const parsed = groups.map(readColumn);
    for (let c = 0; c < parsed.length; c++) {
      if (all.length) all.push("{column}");
      if (c && parsed[c].start > parsed[0].start) {
        const blanks = Math.round(
          (parsed[c].start - parsed[0].start) / parsed[c].step,
        );
        all.push(...Array(Math.min(blanks, 6)).fill(""));
      }
      all.push(...parsed[c].lines);
    }
  }
  if (!all.join("").trim())
    throw Error(
      t(
        "Este PDF no tiene texto seleccionable. Necesita reconocimiento OCR antes de importarlo.",
      ),
    );
  return {
    title: title || fallback,
    artist,
    capo,
    columns,
    fontSize,
    margin,
    text: all.join("\n").trimEnd(),
    notice: t(
      "PDF importado. Se han conservado el orden de las columnas y los saltos; puedes corregirlos en el editor con {column}.",
    ),
  };
}
