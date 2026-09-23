import { t } from "./i18n.js";
import guitar from "./data/guitar.json" with { type: "json" };
import barreData from "./data/barres.json" with { type: "json" };
export const NOTES = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
const pitch = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Normalize notation for lookup while preserving the author's spelling on the page. */
export function normalizeChord(value) {
  return (
    value
      .replace(/\*$/, "")
      .replace(/♭/g, "b")
      .replace(/♯/g, "#")
      // Cifra Club: 7M = major seventh; (5-)/(9-) lower that degree.
      .replace(/7M/g, "maj7")
      .replace(/5\+$/, "aug")
      .replace(
        /(5|9|11|13)([-+])/g,
        (_, degree, sign) => (sign === "-" ? "b" : "#") + degree,
      )
      .replace(/7\(11\)/g, "7sus4")
      .replace(/7\((9|13)\)/g, "$1")
      .replace(/[() ,]/g, "")
      .replace(/Δ/g, "maj")
      .replace(/ø7?/g, "m7b5")
      .replace(/[°º]/g, "dim")
      .replace(/^([A-G][#b]?)(?:min|-)/, "$1m")
      .replace(/Maj|M(?=\d|$)/g, "maj")
      .replace(/maj$/, "")
      .replace(/6\/9/g, "69")
      .replace(/\+(?=\d)/g, "aug")
      .replace(/5\+$/, "aug")
      .replace(/7\+$/, "aug7")
      .replace(/\+$/, "aug")
  );
}
const notationRE =
  /^[A-G][#b]?(?:(?:m|maj|dim|aug|sus|add)?(?:5|6|7|9|11|13|69)?(?:sus[24]|add(?:2|4|9|11|13)|[b#](?:5|9|11|13)|maj(?:7|9|11|13))*|alt|mmaj(?:7|9|11|13))(?:no[15])*(?:\/[A-G][#b]?)?$/;
// Shared validator used by text, PDF and ChordPro importers.
export const chordRE = {
  test: (value) => notationRE.test(normalizeChord(value)),
};
export const unresolvedChordRE = /^\?[^\[\]\n]{1,40}$/;
export function pc(n) {
  return (
    ((pitch[n[0]] ?? 0) +
      (["#", "♯"].includes(n[1]) ? 1 : ["b", "♭"].includes(n[1]) ? -1 : 0) +
      12) %
    12
  );
}
export function transposeChord(c, n) {
  return c.replace(
    /^[A-G][#b♯♭]?|(?<=\/)[A-G][#b♯♭]?/g,
    (r) => NOTES[(pc(r) + (n % 12) + 12) % 12],
  );
}
export function transpose(text, n) {
  return text.replace(/\[([^\]]+)\]/g, (all, c) =>
    chordRE.test(c) ? `[${transposeChord(c, n)}]` : all,
  );
}
export function chords(text) {
  return [
    ...new Set(
      [...text.matchAll(/\[([^\]]+)\]/g)]
        .map((m) => m[1])
        .filter((c) => chordRE.test(c)),
    ),
  ];
}
export function parseLine(raw, index = 0) {
  let lyric = "",
    marks = [];
  const re = /\[([^\]]+)\]/g;
  let end = 0,
    m;
  while ((m = re.exec(raw))) {
    lyric += raw.slice(end, m.index);
    if (chordRE.test(m[1])) marks.push({ at: lyric.length, chord: m[1] });
    else if (unresolvedChordRE.test(m[1]))
      marks.push({
        at: lyric.length,
        chord: m[1].slice(1),
        issue: true,
        rawIndex: m.index,
      });
    else lyric += m[0];
    end = re.lastIndex;
  }
  lyric += raw.slice(end);
  return { lyric: lyric, marks, index, raw };
}
export function parseSong(text) {
  const lines = text.split("\n"),
    out = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\{(?:column|new_page)\}\s*$/.test(lines[i])) {
      out.push({ break: true, index: i });
      continue;
    }
    let p = parseLine(lines[i], i);
    if (
      p.marks.length === 1 &&
      !p.lyric.trim() &&
      i + 1 < lines.length &&
      lines[i + 1].trim() &&
      !lines[i + 1].includes("[")
    ) {
      p.lyric = lines[++i];
      p.endIndex = i;
    }
    out.push(p);
  }
  return out;
}
export function keyInfo(text) {
  const cs = [...text.matchAll(/\[([^\]]+)\]/g)]
    .map((m) => m[1])
    .filter((c) => chordRE.test(c));
  if (!cs.length) return null;
  const candidates = [];
  for (let root = 0; root < 12; root++)
    for (const minor of [false, true]) {
      const intervals = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
      const qualities = minor
        ? ["m", "dim", "", "m", "m", "", ""]
        : ["", "m", "m", "", "", "m", "dim"];
      const scale = intervals.map(
        (v, i) => NOTES[(root + v) % 12] + qualities[i],
      );
      let score = 0;
      for (const c of cs) {
        const base = normalizeChord(c).split("/")[0];
        const degree = intervals.indexOf((pc(base) - root + 12) % 12);
        score += degree < 0 ? -3 : 2;
        if (degree >= 0) {
          const quality = /^[A-G][#b]?m(?!aj)/.test(base)
            ? "m"
            : base.includes("dim")
              ? "dim"
              : "";
          score += quality === qualities[degree] ? 2 : -2;
        }
      }
      if (pc(cs[0]) === root) score += 1;
      if (pc(cs.at(-1)) === root) score += 1;
      candidates.push({
        root,
        minor,
        scale,
        score,
        name: NOTES[root] + (minor ? t(" menor") : t(" mayor")),
        degrees: minor
          ? ["i", "ii°", "III", "iv", "v", "VI", "VII"]
          : ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
      });
    }
  return candidates.sort((a, b) => b.score - a.score)[0];
}
/** Frets are absolute, low E to high e; -1 means muted and 0 open. */
export function fingerings(chord) {
  const match = normalizeChord(chord).match(/^([A-G][#b]?)(.*)$/);
  if (!match) return [];
  let suffix = match[2].replace(/\/([A-G][#b]?)$/, (_, bass) => "/" + pc(bass));
  if (suffix === "sus") suffix = "sus4";
  return guitar[`${pc(match[1])}:${suffix}`] || [];
}
export function fingering(chord) {
  return fingerings(chord)[0] || null;
}
export function diagram(c, position = 0, custom, { ink = "#c9e79c" } = {}) {
  const f = custom || fingerings(c)[position];
  if (!f) return t("<p>Posición no disponible para este acorde.</p>");
  const positive = f.filter((n) => n > 0);
  const min = positive.length ? Math.min(...positive) : 1,
    start = Math.max(...f) > 5 ? min : 1,
    rows = Math.max(5, Math.max(...f) - start + 1),
    spacing = 90 / rows;
  let svg = t(
    '<svg viewBox="0 0 140 148" aria-label="Diagrama de acorde" role="img">',
  );
  for (let i = 0; i < 6; i++)
    svg += `<path d="M${30 + i * 17} 30v90" stroke="currentColor" opacity=".45"/>`;
  for (let i = 0; i <= rows; i++)
    svg += `<path d="M30 ${30 + i * spacing}h85" stroke="currentColor" stroke-width="${i === 0 && start === 1 ? 3 : 1}" opacity=".6"/>`;
  // Catalog metadata distinguishes a barre from separate fingers on one fret.
  // For unknown custom shapes infer only a broad, closed-position barre.
  const suggested =
    barreData[f.join(",")] ??
    (!f.includes(0) && f.filter((n) => n === min).length >= 2 ? [min] : []);
  const barres = suggested.flatMap((fret) => {
    const anchors = f.flatMap((n, i) => (n === fret ? [i] : []));
    const from = anchors[0],
      to = anchors.at(-1);
    return anchors.length > 1 && f.slice(from, to + 1).every((n) => n >= fret)
      ? [{ fret, from, to }]
      : [];
  });
  for (const { fret, from, to } of barres) {
    const y = 30 + (fret - start + 0.5) * spacing;
    svg += `<path class="diagram-barre" d="M${30 + from * 17} ${y}H${30 + to * 17}" stroke="${ink}" stroke-width="${Math.min(12, spacing * 0.8)}" stroke-linecap="round"/>`;
  }
  f.forEach((n, i) => {
    if (n <= 0)
      svg += `<text x="${30 + i * 17}" y="20" text-anchor="middle" fill="currentColor" font-size="13">${n < 0 ? "×" : "○"}</text>`;
    else if (!barres.some((b) => n === b.fret && i >= b.from && i <= b.to))
      svg += `<circle cx="${30 + i * 17}" cy="${30 + (n - start + 0.5) * spacing}" r="${Math.min(6, spacing * 0.4)}" fill="${ink}"/>`;
  });
  if (start > 1)
    svg += `<text x="7" y="44" fill="currentColor" font-size="12">${start}</text>`;
  return (
    svg +
    ["E", "A", "D", "G", "B", "e"]
      .map(
        (label, i) =>
          `<text class="diagram-string-label" x="${30 + i * 17}" y="141" text-anchor="middle" fill="currentColor" font-size="10">${label}</text>`,
      )
      .join("") +
    "</svg>"
  );
}
