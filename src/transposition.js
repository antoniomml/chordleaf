import { transpose, transposeChord, transposeSpelling } from "./music.js";
import { assertTextLength } from "./song-state.js";

function snapshot(song) {
  return structuredClone({
    text: song.text,
    chordShapes: song.chordShapes,
    chordStickers: song.chordStickers,
  });
}

function transposed(song, n) {
  if (n % 12 === 0) return snapshot(song);
  const names = transposeSpelling(song.text, n),
    text = transpose(song.text, n, names);
  assertTextLength(text);
  return {
    text,
    chordShapes: Object.fromEntries(
      Object.entries(song.chordShapes || {}).map(([name, shape]) => {
        let offset = n;
        const played = shape.frets.filter((f) => f >= 0);
        while (played.length && Math.min(...played) + offset < 0) offset += 12;
        while (played.length && Math.max(...played) + offset > 24) offset -= 12;
        return [
          transposeChord(name, n, names),
          {
            ...shape,
            frets: shape.frets.map((f) => (f < 0 ? -1 : f + offset)),
          },
        ];
      }),
    ),
    chordStickers: (song.chordStickers || []).map((sticker) => ({
      ...sticker,
      chords: Array.isArray(sticker.chords)
        ? sticker.chords.map((c) => transposeChord(c, n, names))
        : sticker.chords,
    })),
  };
}

/** Offset measures written chord changes from the original snapshot. With the
 * key locked, either control compensates the other, preserving sounding pitch. */
export function createTransposition() {
  const history = new Map();
  function initial(song) {
    return history.get(song.id) ?? { snapshot: snapshot(song), offset: 0 };
  }
  function apply(song, state, capo = song.capo) {
    // Calculate everything first: validation failures leave the song and its
    // history untouched. Always derive chords/diagrams from the same baseline.
    const next = transposed(state.snapshot, state.offset);
    Object.assign(song, next, { capo });
    if (!state.offset) history.delete(song.id);
    else history.set(song.id, state);
  }
  function canShift(song, n) {
    return (
      Number.isInteger(n) &&
      (!song.linked || (song.capo - n >= 0 && song.capo - n <= 12))
    );
  }
  function canUndo(song) {
    const offset = history.get(song.id)?.offset;
    return Boolean(offset) && canShift(song, -offset);
  }
  return {
    get: (id) => history.get(id),
    delete: (id) => history.delete(id),
    canShift,
    canUndo,
    shift(song, n) {
      if (!canShift(song, n)) return false;
      const previous = initial(song);
      apply(
        song,
        { ...previous, offset: previous.offset + n },
        song.linked ? song.capo - n : song.capo,
      );
      return true;
    },
    undo(song) {
      if (!canUndo(song)) return false;
      const previous = history.get(song.id);
      apply(
        song,
        { ...previous, offset: 0 },
        song.linked ? song.capo + previous.offset : song.capo,
      );
      return true;
    },
    setCapo(song, value) {
      const capo = Math.min(
        12,
        Math.max(0, Math.round(Number.isFinite(value) ? value : 0)),
      );
      if (capo === song.capo) return false;
      if (song.linked) {
        const previous = initial(song);
        apply(
          song,
          { ...previous, offset: previous.offset + song.capo - capo },
          capo,
        );
      } else song.capo = capo;
      return true;
    },
  };
}
