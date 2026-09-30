import { createSong } from "./song-state.js";

export const RECENT_KEY = "chordleaf-recent-v1";
export const MAX_RECENT = 12;

/** Closed songs stay available for reopening; storage keeps only known fields. */
export function readRecent(raw) {
  try {
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return [];
    return stored
      .filter(
        (entry) =>
          entry &&
          typeof entry.song?.text === "string" &&
          Number.isFinite(entry.closedAt),
      )
      .slice(0, MAX_RECENT)
      .map((entry) => ({
        song: createSong(entry.song),
        closedAt: entry.closedAt,
      }));
  } catch {
    return [];
  }
}

/** An untouched blank song is not worth remembering. */
export function worthKeeping(song) {
  return !!(song.text.trim() || song.title.trim() || song.artist.trim());
}

export function rememberClosed(recent, song, now = Date.now()) {
  return [
    { song, closedAt: now },
    ...recent.filter((entry) => entry.song.id !== song.id),
  ].slice(0, MAX_RECENT);
}

export function forget(recent, id) {
  return recent.filter((entry) => entry.song.id !== id);
}
