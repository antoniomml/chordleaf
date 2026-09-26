# Architecture

chordleaf is a browser application built with ES modules and Vite. Editing and file import/export work without a backend. Importing a public website uses a small Node.js endpoint, shared by the local server and the Vercel function. Songs live in memory and are saved to `localStorage` under `chordleaf-v1`; legacy `chordi-v1` data is migrated on the next save. Exports provide portable backups.

## Modules

| File                   | Responsibility                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `src/app.js`           | Song state, document/key sections and control wiring.                              |
| `src/ui/pages.js`      | Escaped HTML for the document preview.                                             |
| `src/ui/intro-copy.js` | Shared English/Spanish introduction for the app and static entry pages.            |
| `src/chords-panel.js`  | Chord sidebar, catalog search, interactive fretboard and replacement workflow.     |
| `src/harmony.js`       | Guitar pitches, formula matching, theoretical note spelling and token replacement. |
| `src/dictionary-ui.js` | Song chord cards, custom shape editor and draggable sheet diagrams.                |
| `src/dictionary.js`    | Shared diagram geometry and rendering for preview and exports.                     |
| `src/editor-tools.js`  | Expanded editor and accessible workspace divider.                                  |
| `src/music.js`         | Symbols, transposition, line parsing, estimated keys and diagrams.                 |
| `src/data/guitar.json` | Local catalog of guitar positions using absolute frets.                            |
| `src/layout.js`        | Shared model for lines, collisions, columns and pages.                             |
| `src/files.js`         | Import/export with on-demand dependencies.                                         |
| `src/pdf-import.js`    | Geometric interpretation of extracted PDF text.                                    |
| `src/fonts.js`         | Document font loading and embedding.                                               |

Sections hide the entire inactive sidebar content without destroying the text editor. The expanded editor moves the existing textarea, retaining selection and undo history. The native dialog manages focus, an inert background and Escape.

## Musical positions

`parseSong` produces lyrics and `{ at, chord }` marks. `at` is the index into lyrics without chord tokens. `layout` adds `x` (the chord label's left edge in monospaced characters) and `lane` (vertical collision avoidance). The current layout aligns chord labels with their anchors, including imported legacy centered documents. Exports share this model.

Editor positions use UTF-16 indices, matching textarea APIs. Western lyrics and chord symbols are the primary target; emoji and combining characters do not have guaranteed monospaced alignment. Scanned PDFs need external OCR.

## Catalog and custom shapes

JSON keys use `pitchClass:suffix`, with pitch classes 0–11 (C–B). Slash bass notes become pitch classes. Positions contain six frets, low to high: `-1` muted, `0` open, positive absolute frets. The application preserves the chords-db positions rather than inventing approximate fingerings. `scripts/import-chords.mjs` transforms the upstream JSON; attribution is in `THIRD_PARTY_NOTICES.md`.

Diagram frames store independent `width`, `height` and `columns`. Shared geometry derives rows and a proportional cell size, so changing frame dimensions does not trigger unexpected column changes. Legacy frames derive their original column count once when opened; TXT preserves the explicit frame settings, and PDF/Word reuse the same geometry.

Custom shapes are keyed by the song's chord symbol. They travel with TXT metadata and feed the diagrams in preview and exports. A chord selection can replace one matching bracket token or all of them; replacing all also updates explicit diagram references. The immediate undo snapshot restores text, shapes and stickers and is invalidated by later text edits.

## Harmonic identification

The identifier is independent of the fingering catalog. It calculates MIDI pitches from standard tuning and selected frets, deduplicates pitch classes, finds the actual lowest pitch and compares every chromatic root against explicit formulas. It never discards extra sounding notes to force a match. See [the model, supported vocabulary and limits](https://github.com/antoniomml/chordleaf/wiki/Harmony-model).

## Verification and evolution

Unit tests cover import, anchors, harmony, specific voicings and pagination. Browser tests exercise editing, section isolation, dialogs, chord replacement, responsive layouts, the A4 print stylesheet and the TXT, ChordPro, PDF and Word exports. `artifacts/` and `output/` are ignored local outputs.

Keep model transformations separate from UI controls. Audio transcription remains future work and requires decisions about models, privacy, cost and manual review before introducing services or credentials.

## Language and untrusted data

`src/i18n.js` and `src/locales/en.js` translate UI literals into English; Spanish is the source locale. The browser language chooses the initial interface and the explicit EN / ES selection is saved separately under `chordleaf-language`; the previous `chordi-language` key remains readable for migration. Switching saves the workspace and reloads; if storage fails, it keeps the current language and document. In tagged templates, only literal segments are translated. Interpolated titles, lyrics and chord symbols are preserved and HTML callers still escape user content. Add new copy to the English catalog and use `t` for labels, status messages and templates.

`src/song-state.js` rebuilds known data fields when restoring storage or reading TXT metadata. It validates fret shapes, numeric settings and safe IDs. New imports are bounded to 10 MiB per file, 50 PDF pages and 50,000 text characters; existing song text is not truncated on restore. Malformed workspace JSON is not overwritten and can be downloaded for recovery.

`api/import-web.js` awaits `server/web-import.js`. The same handler supplies development, production preview and the standalone server. Vercel serves `dist/` through its CDN; it does not run `pnpm start`. `vercel.json` and `server/security.js` share security headers. The CSP allows inline styles for generated sheet geometry, but no inline scripts, remote scripts or remote connections from the browser.

Web extraction is provider-specific, not song-specific. `src/web-import.js` reads the structured Ultimate Guitar payload, LaCuerda's real `#t_body` sheet container, AcordesWeb's `#chordsPre`, TusAcordes' `.tablatura-content` (Spanish chord names), Chordie's `#song` text lines and Acordes.cc's preformatted sheet. Cifra Club containers are still parsed for saved HTML, although its server downloads are blocked. LaCuerda `/TXT/` responses are accepted as `text/plain` only on allowlisted LaCuerda hosts; their metadata header is separated from the chord sheet before normal text import. Downloaded markup remains inert and is never mounted.

## Production readiness modules

- `src/ui/shell.html`: static, bilingual application shell; user values never enter this template.
- `src/ui/language.js`: accessible language menu, persistence and route switching.
- `src/i18n.js` and `src/locales/en.js`: source-literal translations; interpolated song text is not translated. `/en/` and `/es/` select the interface language.
- `src/workspace-session.js`: exclusive Web Lock acquired before loading storage. The owner saves and releases on page exit; restored back/forward pages reload before editing.
- `src/workspace-backup.js`: versioned JSON backup and additive restore, with fresh song identifiers and known-field sanitization.
- `src/fit-song.js` and `src/fit-worker.js`: bounded auto-fit in a dedicated worker. It prefers a one-page layout that keeps every source line intact (one column on ties); when one page is impossible it picks the two-column layout with the fewest pages, then the fewest broken lines. Each search parses the song once; editing during a pending fit prevents stale results from being applied.
- `src/docx-limits.js`: ZIP central-directory preflight limits declared expanded content to 32 MiB and 2,000 entries. It rejects encrypted and unsupported archives; it is not a complete malicious-parser sandbox.
- `build/metadata.js`: static English/Spanish entry pages, canonical URLs, language links, social metadata and sitemap. English has one indexed canonical at `/`; `/en/` remains a direct language route and points to `/` as canonical.

The `src/ui/settings.js` render helpers and shared `src/ui/html.js` escaping utility keep presentation separate from application event/state wiring. `src/docx-import.js` owns the Word worker lifecycle; `src/docx-worker.js` validates and converts the archive without decoding images. `src/import-limits.js` applies cumulative PDF text/geometry budgets before canvas measurements. The import dialog aborts its current operation when closing or navigating back.
