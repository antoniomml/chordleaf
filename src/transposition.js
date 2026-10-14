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

/** Semitones track explicit transposition. A linked capo changes both the
 * current chords and their reset baseline, preserving that audible offset. */
export function createTransposition() {
  const history = new Map();
  function initial(song) {
    return (
      history.get(song.id) ?? {
        snapshot: snapshot(song),
        offset: 0,
        compensation: 0,
      }
    );
  }
  function apply(song, state) {
    const next = transposed(state.snapshot, state.offset + state.compensation);
    Object.assign(song, next);
    if (!state.offset && !state.compensation) history.delete(song.id);
    else history.set(song.id, state);
  }
  return {
    get: (id) => (history.get(id)?.offset ? history.get(id) : undefined),
    delete: (id) => history.delete(id),
    shift(song, n) {
      const previous = initial(song);
      const offset = previous.offset + n;
      // Derive every result from the baseline: repeated up/down changes cannot
      // accumulate enharmonic respellings or octave shifts of custom shapes.
      apply(song, { ...previous, offset });
    },
    undo(song) {
      const previous = history.get(song.id);
      if (!previous) return;
      apply(song, { ...previous, offset: 0 });
    },
    setCapo(song, value) {
      const capo = Math.min(
        12,
        Math.max(0, Math.round(Number.isFinite(value) ? value : 0)),
      );
      if (capo === song.capo) return;
      if (song.linked) {
        const previous = initial(song);
        const delta = song.capo - capo;
        apply(song, {
          ...previous,
          compensation: previous.compensation + delta,
        });
      }
      song.capo = capo;
    },
  };
}
