import { chordRE } from "./music.js";

export const MAX_TEXT_LENGTH = 50000;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 50;
/** Diagrams allowed inside a single chord sticker. */
export const MAX_STICKER_CHORDS = 60;
/** Diagrams allowed across every sticker of one song. */
export const MAX_SONG_DIAGRAMS = 240;
const validChord = (value) =>
  typeof value === "string" && value.length <= 80 && chordRE.test(value);
const number = (value, fallback, min, max) =>
  Number.isFinite(Number(value))
    ? Math.max(min, Math.min(max, Number(value)))
    : fallback;
const id = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(value)
    ? value
    : crypto.randomUUID();
const string = (value, max) =>
  typeof value === "string" ? value.slice(0, max) : "";

// Rebuild known fields instead of spreading untrusted storage or TXT metadata.
export function songMetadata(data = {}) {
  const chordShapes = Object.fromEntries(
    Object.entries(data?.chordShapes || {})
      .filter(
        ([name, shape]) =>
          validChord(name) &&
          Array.isArray(shape?.frets) &&
          shape.frets.length === 6 &&
          shape.frets.every((n) => Number.isInteger(n) && n >= -1 && n <= 24),
      )
      .slice(0, 1000)
      .map(([name, shape]) => [
        name,
        { frets: [...shape.frets], star: shape.star === true },
      ]),
  );
  const chordStickers = (
    Array.isArray(data?.chordStickers) ? data.chordStickers : []
  )
    .filter(
      (s) =>
        s &&
        [s.x, s.y, s.width, s.page].every(Number.isFinite) &&
        s.x >= 0 &&
        s.y >= 0 &&
        s.width >= 28 &&
        s.width <= 595.28 &&
        Number.isInteger(s.page) &&
        s.page >= 0 &&
        s.page < MAX_PDF_PAGES &&
        (s.height === undefined ||
          (Number.isFinite(s.height) &&
            s.height >= 28 &&
            s.height <= 841.89)) &&
        (s.columns === undefined ||
          (Number.isInteger(s.columns) &&
            s.columns >= 1 &&
            s.columns <= 1000)) &&
        (s.chords === "all" ||
          (Array.isArray(s.chords) && s.chords.every(validChord))),
    )
    .slice(0, 100)
    .map((s) => ({
      id: id(s.id),
      x: s.x,
      y: s.y,
      width: s.width,
      page: s.page,
      ...(s.height === undefined ? {} : { height: s.height }),
      ...(s.columns === undefined ? {} : { columns: s.columns }),
      chords:
        s.chords === "all" ? "all" : [...s.chords].slice(0, MAX_STICKER_CHORDS),
    }));
  return { chordShapes, chordStickers };
}

export function createSong(data = {}) {
  data = data && typeof data === "object" ? data : {};
  return {
    id: id(data.id),
    title: string(data.title, 90),
    artist: string(data.artist, 100),
    text: typeof data.text === "string" ? data.text : "",
    capo: Math.round(number(data.capo, 0, 0, 12)),
    linked: data.linked === true,
    dirty: data.dirty === true,
    pdfExported: data.pdfExported === true,
    projectSignature:
      typeof data.projectSignature === "string" &&
      /^\d+:[0-9a-f]+:[0-9a-f]+$/.test(data.projectSignature)
        ? data.projectSignature
        : null,
    showBrand: data.showBrand !== false,
    fontSize: number(data.fontSize, 10, 7, 20),
    margin: number(data.margin, 10, 5, 35),
    columns: data.columns === 2 ? 2 : 1,
    ...songMetadata(data),
  };
}
