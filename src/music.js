import guitar from "./data/guitar.json" with { type: "json" };
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
  return value
    .replace(/\*$/, "")
    .replace(/♭/g, "b")
    .replace(/♯/g, "#")
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
    .replace(/\+$/, "aug");
}
const notationRE =
  /^[A-G][#b]?(?:(?:m|maj|dim|aug|sus|add)?(?:5|6|7|9|11|13|69)?(?:sus[24]|add(?:2|4|9|11|13)|[b#](?:5|9|11|13)|maj(?:7|9|11|13))*|alt|mmaj(?:7|9|11|13))(?:\/[A-G][#b]?)?$/;
// Shared validator used by text, PDF and ChordPro importers.
export const chordRE = {
  test: (value) => notationRE.test(normalizeChord(value)),
};
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
      p.marks.length &&
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
        name: NOTES[root] + (minor ? " menor" : " mayor"),
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
export function diagram(c, position = 0, custom) {
  const f = custom || fingerings(c)[position];
  if (!f) return "<p>Posición no disponible para este acorde.</p>";
  const min = Math.min(...f.filter((n) => n > 0)),
    start = Math.max(...f) > 5 ? min : 1;
  let svg =
    '<svg viewBox="0 0 140 148" aria-label="Diagrama de acorde" role="img">';
  for (let i = 0; i < 6; i++)
    svg += `<path d="M${30 + i * 17} 30v90" stroke="currentColor" opacity=".45"/>`;
  for (let i = 0; i < 6; i++)
    svg += `<path d="M30 ${30 + i * 18}h85" stroke="currentColor" stroke-width="${i === 0 && start === 1 ? 3 : 1}" opacity=".6"/>`;
  f.forEach((n, i) => {
    if (n <= 0)
      svg += `<text x="${30 + i * 17}" y="20" text-anchor="middle" fill="currentColor" font-size="13">${n < 0 ? "×" : "○"}</text>`;
    else
      svg += `<circle cx="${30 + i * 17}" cy="${30 + (n - start + 0.5) * 18}" r="6" fill="#c9e79c"/>`;
  });
  if (start > 1)
    svg += `<text x="7" y="44" fill="currentColor" font-size="12">${start}</text>`;
  return (
    svg +
    '<text x="72" y="141" text-anchor="middle" fill="currentColor" font-size="10">E A D G B e</text></svg>'
  );
}
