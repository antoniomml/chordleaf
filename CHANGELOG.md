# chordi changelog

## Unreleased

- Restore diagram hover on instrumental chords by keeping chord hit targets above the separator text.
- Give each new-song import option its own screen with Back navigation; reopen on a clean menu and ignore cancelled import results.

- Render instrumental chord sequences and Intro/Solo labels on one baseline, with automatic separators and whole-chord wrapping.

- Simplify chord identification, with −/+ fret navigation and explicit open/muted string labels.
- Print chord dots and barres in black while retaining green sidebar diagrams.
- Correct Cifra Club major-seventh and altered/extended symbols, preserving instrumental rows and chord anchors.

- Reorder new-song choices: pasted text/files, website URL, then blank song.
- Import accessible Cifra Club, LaCuerda and Ultimate Guitar chord pages through a bounded same-origin server endpoint.
- Automatically optimize font size, margins and columns after import, with a readable multipage fallback.
- Add the subtle Chordi footer to the preview, PDF and Word, and catalog-backed barre lines to chord diagrams.

- Compact navigation and document settings; remove the redundant quick chord browser and navigation footer.
- Align guitar string labels and use a fixed-size horizontal fretboard with a responsive interpretation panel.
- Resize sheet diagrams independently in both dimensions, with explicit columns and a millimeter-based layout preview.

- Rename the GitHub repository to `chordi` and translate project documentation and contribution templates to English.
- Make Document, Key and Chords switch the entire sidebar.
- Move the sheet chord dictionary into Chords with a three-column diagram grid and contextual editing controls.
- Add searchable guitar voicings and a clickable fretboard identifier with notes, bass, inversions, extensions, altered chords and explicit omissions.
- Insert identified voicings or replace one/all occurrences of a song chord, with immediate undo.

## 0.0.1 · September 20, 2026

First tagged release: a local workspace for preparing lyrics and chords, from the first verse to the rehearsal sheet.

### Writing and playing

- Tabbed songs, initially blank titles and browser autosave.
- Expanded editor and adjustable editor/document divider.
- Chords anchored to exact letters, with start/center alignment and collision avoidance in the initial release.
- Semitone transposition, optionally linked capo and estimated key.
- Browser for 828 chords and 3,283 guitar positions, including sevenths, extensions and inversions.
- A4 preview, margins, font size, one/two columns and editing directly on the sheet.
- TXT/PDF/DOCX import and PDF/Word/text export with metadata.

### Project

- Visual README, actual screenshots and a musician-oriented user guide.
- pnpm as the sole package manager, with a pinned version and reproducible lockfile.
- Architecture/contribution documentation, tests and automated checks.
- Attributed chord catalog and fonts with included licenses.
- Previous application removed from the current repository tree.

### Known limitations

Storage is local with no device synchronization. Scanned PDFs need prior OCR; review alignment after PDF or Word import. Key estimation is advisory and the catalog cannot cover every fingering. Audio transcription is not available. A license for original code and a public hosted instance are pending.
