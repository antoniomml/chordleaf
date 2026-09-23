# chordleaf changelog

## 0.5.1 · September 23, 2026

- Open imported songs even when chord notation is uncertain; show unresolved chords in the sheet and let readers correct them without leaving the preview.
- Keep malformed chord tokens aligned with lyrics in supported web sources, and show a compact notice when no chords are detected.
- Recognize Spanish LaCuerda chord names, punctuation and written capo positions, including El Kanka's “Payaso”.
- Open imported songs in the preview on mobile and verify correction flows at desktop and phone widths.

## 0.5.0 · September 23, 2026

- Add accessible names for untitled preview headings and announce the selected document column count.
- Keep long-song typing responsive by scheduling preview updates and avoiding unnecessary chord tray and line-number rebuilds.
- Give the empty workspace useful bilingual feature descriptions, shared with the static HTML that search engines can read.
- Consolidate English indexing on `/`, retain `/en/` as a direct route and verify canonical, language and sitemap metadata in CI.
- Add automated accessibility and long-song browser checks, and validate overlong web-import requests before parsing their URLs.

## 0.4.0 · September 22, 2026

- Rename the product from Chordi to Chordleaf across the application, exports, documentation, metadata and generated artwork.
- Migrate existing browser data and language preferences on first save, while keeping legacy workspace backups and TXT metadata importable.
- Recognize LaCuerda chord shorthand in HTML and TXT imports, keep multi-chord intros on one instrumental line, and remove source-page indentation from lyrics.
- Accept Spanish Ultimate Guitar URLs and verify a real localized song import.
- Remove LaCuerda's six-string fingering legends and TXT footer from imported lyrics.
- Place chord-diagram blocks above printed chords. Ask for a custom position or omit unsupported diagrams instead of printing “No position”.
- Give the three new-song choices matching SVG icons on desktop and mobile.
- Recheck dependency advisories, repository history, tracked content and demo images before public release preparation.

## 0.3.0 · September 22, 2026

- Start new browser workspaces with a focused empty state instead of a preloaded example song.
- Import both the normal HTML and `/TXT/` variants of LaCuerda chord pages, with provider-specific parsing and live regression coverage.
- Replace the native language select and misaligned export glyphs with consistent, accessible menus and vector icons.
- Clarify the in-song chord dictionary: compact per-card Edit/Add actions no longer cover diagrams, and the full-set action is explicit.

## 0.2.0 · September 22, 2026

A bilingual workspace with safer local data, portable backups and verified Vercel hosting.

- License the original application code under MIT and retain third-party notices.
- Add full workspace JSON backups and additive restoration, rejecting oversized songs without truncating source backups.
- Prevent stale browser windows from overwriting songs with exclusive workspace ownership.
- Run automatic fitting in a cancellable worker and reuse parsed song data.
- Decode Word in a worker, skip embedded images, cap generated markup and stop cancelled or timed-out imports.
- Limit PDF text, fragment size and item counts before costly geometry measurement; destroy parsing tasks on cancellation or timeout.
- Cancel browser web requests and import fitting when leaving the import dialog.
- Extract document/key render helpers and remove 24 superseded CSS declarations; twelve screenshot comparisons remain pixel-identical.
- Add static English/Spanish URLs, language links and a share image.
- Verify Chromium, Firefox and WebKit workflows in CI and all three web providers on Vercel.
- Update build tooling to Vite 8.3.0; retain the same four application dependencies.

- Add English and Spanish UI selection without translating song content.
- Prepare Vercel functions, security headers and an explicit web-import activation switch.
- Validate restored song data, bound imports and preserve damaged sessions for recovery.
- Self-host DM Sans; remove third-party font requests.
- Improve keyboard access, contrast, dialog names and small-screen controls.
- Add page metadata and optional canonical URL, robots and sitemap generation.
- Run browser checks against production builds; add security and localization regressions.
- Add deployment, privacy, security and production-audit documentation.

## 0.1.0 · September 20, 2026

A chords workspace, public web imports and rehearsal-sheet layout that keep more of the song on the page.

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

Storage is local with no device synchronization. Scanned PDFs need prior OCR; review alignment after PDF or Word import. Key estimation is advisory and the catalog cannot cover every fingering. Audio transcription is not available. The original code is MIT licensed. A protected Vercel deployment is available; a public launch is pending.
