import { escapeHtml as esc } from "./html.js";
import { exampleSong, chordRows } from "../example-song.js";

/** Shared by the built HTML and live editor to keep the entry layout stable. */
export function entrySheetMarkup(locale) {
  const example = exampleSong(locale);
  return `<div class="entry-page"><strong>${esc(example.title.toLocaleUpperCase())}</strong><small>${esc(example.artist)}</small><pre>${chordRows(
    example.text,
    6,
  )
    .map((row) => `<b>${esc(row.chords)}</b>\n${esc(row.lyric)}`)
    .join("\n")}</pre></div>`;
}
