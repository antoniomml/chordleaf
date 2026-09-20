# Architecture

chordi is a browser application built with ES modules and Vite. It needs no backend. Songs live in memory and are saved to `localStorage` under `chordi-v1`; exports provide portable backups.

## Modules

| File                   | Responsibility                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `src/app.js`           | Song state, document/key sections, controls and rendering.                         |
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

The identifier is independent of the fingering catalog. It calculates MIDI pitches from standard tuning and selected frets, deduplicates pitch classes, finds the actual lowest pitch and compares every chromatic root against explicit formulas. It never discards extra sounding notes to force a match. See [the model, supported vocabulary and limits](harmony.md).

## Verification and evolution

Unit tests cover import, anchors, harmony, specific voicings and pagination. Browser tests exercise editing, section isolation, dialogs, chord replacement, responsive layouts and all three exports. `artifacts/` and `output/` are ignored local outputs.

Keep model transformations separate from UI controls. Audio transcription remains future work and requires decisions about models, privacy, cost and manual review before introducing services or credentials.
