# chordleaf changelog

## Unreleased

- Add a five-minute Spanish introduction with current desktop/phone controls and original demo screenshots, plus a browser audio guide covering model choices, downloads, removal and troubleshooting.
- Update README/wiki navigation and import/export instructions; explain local audio processing, model download request metadata and the difference between song backups and cached models.

## 1.4.1 · October 2, 2026

- Keep active lyric, chord, title and artist edits in browser saves, project downloads, reloads and workspace handoffs. Autosave preserves the focused field; Escape restores the previous value.
- Preserve every closed song until explicit removal. Offer View all in both Recent lists, save open and closed songs atomically, and include closed songs in workspace backups even with no open tabs. Existing backups and legacy Recent storage remain readable.
- Enforce the song text limit across direct edits, chord insertion/replacement and transposition. Reject oversized project and workspace downloads before reporting success, with a clear limit message.
- Preserve keyboard focus and expanded document options after settings changes. Enlarge smaller document controls, fix the tablet entry overflow and shorten informational notices.
- Correct public audio availability and model distribution notices, and update storage, backup and release documentation.
- The preceding post-1.4.0 changes make direct lyric editing preserve chord anchors and support separate chord renaming in desktop and mobile sheet views.

## 1.4.0 · October 2, 2026

- Show consistent resource badges and conservative browser hardware recommendations for voice models, preserve user choices, and describe word timestamps for both Qwen and Whisper. Mark Turbo as slow on CPU and demanding in memory.
- Explain that sung lyrics are likely to contain errors and provide an editable draft. Cap automatic song fitting at 12 pt while keeping readable multi-page layouts and existing margins.
- Offer explicitly downloadable Whisper Small (252 MB) and Whisper Large v3 Turbo (1.09 GB) alongside Whisper Base and Qwen 0.6B in the browser. All Whisper choices run locally in CPU/WASM and return word timestamps. Preserve each choice and remove its weights independently while retaining chords and the shared runtime.
- Identify the existing native Mac models as Whisper Small and Qwen 1.7B.

## 1.3.0 · October 2, 2026

- Match the required LV-Chordia selector to the lyric models’ circular indicators in browser and desktop audio setup. Use consistent outline icons for preview and chord-editing actions; the floating controls show only the selected chord name.
- Align chords directly on the document with drag, tap-to-place, character step controls, keyboard navigation and undo. Compact floating controls appear on selection, with no instruction banner. Phones use readable sheet zoom and large touch targets; completed moves update the original bracket tokens.
- Commit mobile lyric taps on pointer release even when the browser omits a synthesized click after a chord drag; cancelled gestures and scrolling leave the chord in place.
- Use discreet underlines and soft selection backgrounds while editing the sheet instead of large green frames. Title, artist and source editor fields also use a thinner, muted focus border. Keyboard focus remains visible on lyrics, headers and chords.
- Place the middle character of odd-length chord labels and the left middle character of even-length labels over their lyric anchor: E, Em and Em7 use E, E and m respectively. Preview, PDF and Word preserve the same placement.
- Upgrade ONNX to 1.22.0 in the experimental browser-model conversion requirements.
- Fix both Ubuntu mirror URLs and mirror-file sources in browser CI dependency setup.

## 1.2.1 · October 1, 2026

- Protect unsaved work when switching browser tabs: a failed save keeps the current editing session, and an unresponsive tab no longer has its lock stolen automatically. The requesting tab shows a translated warning and can retry.
- Render the same entry layout before and after JavaScript loads, reducing mobile startup layout shifts while keeping the no-JavaScript page and guides readable.
- Separate import and export controllers from workspace coordination, preserving cancellation, format validation and snapshot-based document exports.
- Center the homepage, README and desktop description on correcting chord sheets, preparing a personal version and printing/exporting it. Clarify that browser installation support varies.
- Add reproducible desktop/mobile laboratory measurements, startup/no-JavaScript and failed-save/timeout regression tests, and a full Spanish audit with prioritized product, security and distribution findings.
- Update architecture/development documentation and prepare reviewed GitHub wiki source in the main repository; wiki publication remains separate.
- Use the official Ubuntu package mirror for browser CI dependencies and bound installation time, avoiding stalled runner downloads without reducing browser coverage.
- Security follow-up: the experimental model-conversion requirements still pin ONNX 1.19.1. Existing PR #45 proposes 1.22.0; this release does not include that independent update.
- macOS distribution remains a candidate: no signed/notarized installer is published with this release.

## 1.2.0 · September 30, 2026

- Import audio locally in the browser with LV-Chordia for chords and optional Whisper or Qwen3-ASR for lyrics. Download models explicitly, reuse them on the device and open the resulting song directly in the editor. The audio importer remains experimental.
- Make the required chord model a selected card alongside the optional lyric choices, with matching download controls and clearer section headings.
- Emit chords at detected changes, without repeating held harmony at each new lyric line. Keep introductions separate from the first sung phrase and avoid piling a solo above one sustained syllable.
- Balance lyric line lengths and keep crowded chord labels in one row across the preview, PDF and Word exports.
- Add independent build-time flags for audio and web import. Audio processing stays on the user’s device; public desktop installers still require signing and notarization.

## 1.2.0-beta.2 · September 30, 2026 · Candidate

- Simplify audio import with a one-time model setup dialog, explicit downloads, memory-based recommendations and saved model preferences. Use neural chord detection only, add drag-and-drop and a focused review screen, and offer ten shared lyric languages.
- Improve lyric phrasing and chord placement, preserve transcription punctuation and add a live chord-over-lyric preview. Bound Qwen decoding per fragment and retry pathological repetition loops without losing the rest of the song; mark incomplete lyrics and approximate alignment repairs for review.

## 1.2.0-beta.1 · September 30, 2026 · Candidate

- Add local audio import with timed chord and lyric review, editable drafts, interval playback and JSON timing export.
- Use LV-Chordia for extended chords and offer Qwen3-ASR with forced alignment or Whisper for lyrics. Preserve chord results if transcription fails and mark approximate word groups.
- Package an Apple Silicon desktop candidate with its own Python runtime and in-app model installation, cancellation and removal. Audio inference remains on each user’s device.
- Keep desktop storage on a stable private origin, isolate the renderer, authenticate the internal service and preserve libraries across restarts.
- Add pinned runtime/model manifests, desktop CI and a signing/notarization release gate. Public installer availability remains disabled until that gate is completed.
- Document actual model comparisons and the experimental GuitarSet training result; the trained research model is not deployed.

## 1.1.1 · September 30, 2026

- Chords to review open one after another: saving a fix or choosing **Leave for later** moves to the next one, with progress ("1 of 3"), and closing the panel stops the review.
- When the same unrecognised chord appears several times, one fix corrects all of them (the option is on by default).

## 1.1.0 · September 30, 2026

- Save without thinking about it: open songs are kept in the browser and return on the next visit, with no warning when leaving the page. Closing a song needs no confirmation and moves it to **Recent** (start page and New song), where it can be reopened or removed. Chordleaf asks the browser for persistent storage once there is real work to keep.
- New start page with the Chordleaf brand, one short promise, **New song**, an original **example song** and your recent songs, instead of a long feature list and "No songs open".
- A second tab no longer waits forever: **Use here** asks the other tab to save and pause, then opens your songs.
- ChordPro: import `{title}`, `{subtitle}`, comments, verse/chorus/bridge sections (with labels), `{chorus}`, column and page breaks, and ignore other directives and `#` comments instead of printing them as lyrics. Export omits empty metadata and a zero capo and writes `{column_break}`.
- Imports recognise chord rows ending in repeat marks (`x2`, `(x4)`) and chords after section labels (`Intro:`, `Coro:`), keep names such as O'Sullivan, and no longer name untitled pastes "Imported song".
- **Latin notation** for the sheet, PDF, Word and diagrams: choose **C D E** or **Do Re Mi** in the document settings. The editor, TXT and ChordPro keep letter names.
- Transposition spells chords in the resulting key (Ab major gives `Db`, not `C#`; B major gives `D#`, not `Eb`), and the key panel uses the same names.
- Chords on the sheet are a single Tab stop; arrow keys, Home and End move between them.
- The web import server limits each client to 30 imports every 10 minutes and answers 429 with `Retry-After`.
- Export menu with menu semantics and arrow-key navigation, grouped into sharing formats and portable copies. Ctrl/⌘ + S confirms the browser save and Ctrl/⌘ + Shift + S downloads the editable project.
- Smaller details: capo 0 is no longer printed on PDF, Word or the preview; phone toasts no longer cover the page controls; a single `h1` in the app; a bilingual 404 page; the service worker skips jsPDF extras Chordleaf never uses (~350 KB); feedback link, code of conduct and a release badge that follows GitHub releases.

## 1.0.3 · September 26, 2026

- Replace Cifra Club in the import screen with providers that still answer server downloads: LaCuerda, AcordesWeb, TusAcordes, Chordie and Ultimate Guitar. Saved Cifra Club HTML keeps parsing offline.
- Add provider parsers for AcordesWeb (`#chordsPre`), TusAcordes (Spanish `(LA )` notation), Chordie text lines and Acordes.cc preformatted sheets, with real-page import checks.
- Decode pages that mislabel latin-1 bytes as UTF-8 with the charset they declare, keeping accents in legacy sheets intact.
- Add a **Clean text** action that removes a lone blank line and collapses a run of several into one, without touching chord columns, with a count in the confirmation toast.
- Auto-fit now prefers a one-page layout that keeps every source line intact (one column on ties); when one page is impossible it uses two columns with the fewest pages, then the fewest broken lines.
- Update the import guide, policy and related content pages to the new host list.

## 1.0.2 · September 26, 2026

- Simplify website imports to the URL action. Only an upstream 403 shows the upcoming browser-extension notice and a collapsed saved-HTML option.
- Keep text pasting in the existing text/file import screen. Hide and reset the HTML fallback on URL changes, retries and new imports; other errors do not reveal it.
- Distinguish source 403 errors with a structured code and cover the conditional flow, local HTML safety and English/Spanish copy.

## 1.0.1 · September 26, 2026

- Make offline use reliable after the first successful installation: precache the editor, all entry routes, fonts, workers and lazy PDF/Word libraries. Cache names follow build contents automatically; updates wait until open tabs close before replacing their cache.
- Import with your own browser connection: open the original song page, paste its lyrics and chords, or import a saved HTML page locally. Preserve provider markup and chord spacing without executing scripts or loading embedded resources. Blocked link downloads reveal this fallback directly.
- Explain rate-limit responses from the hosting firewall and retain cancellable server-side imports for providers that accept them.
- Link the home page to the bilingual guides, print/transposition pages, privacy and import policy. Pin the CORS origin in deployment configuration instead of leaving a wildcard.
- Expose version and source commit in `release.json` so the production deployment can be checked against its release tag. Include the 14 on-domain content pages added after 1.0.0.
- Cover first-visit offline editing and first-time PDF/Word exports after clearing the HTTP cache, local HTML/clipboard imports, inert markup, mobile accessibility and oversized files.

## 1.0.0 · September 25, 2026

- Install Chordleaf as an app and keep editing offline: web app manifest, service worker with a versioned shell cache, cache-first hashed assets and stale-while-revalidate fonts and icons. API responses are never cached.
- Print the sheet as real A4 paper: the workspace chrome disappears, the point-based layout is scaled to paper and pages never split. New **Print** entry in the Export menu.
- Export and re-import portable **ChordPro (.cho)** files next to TXT, PDF and Word.
- Phone and accessibility pass: visible focus and 3:1 control borders, success/warning/error toasts, 44 px touch targets, a move handle for chord diagrams, correct string numbering for screen readers, keyboard chord tooltips, safe-area layout and `visualViewport` keyboard handling.
- Show the semitone stepper as 0 until the song is transposed, and explain server-side import blocks with the manual paste fallback.
- Security: DOCX decompression budget before the parser, streamed PDF text budget, per-block and per-song diagram caps, bounded sticker rendering, fixed server error copy, hardened i18n lookups and download names, plus COOP/CORP and long-lived static caching.
- Search engines: search-intent titles and H1 copy, JSON-LD, complete social tags, sitemap with `lastmod` and locale alternates, all validated in CI.
- Reliability: dynamic browser-suite harness with Playwright cache and failure artifacts, empty-state resize regression test and a deterministic workspace-lock compatibility test.

## 0.6.4 · September 25, 2026

- Keep the reset-to-original symbol visible in muted gray while unavailable, then highlight it when the song is transposed without moving the semitone controls.

## 0.6.3 · September 25, 2026

- Split the desktop workspace into document settings, lyrics, song chords, key guidance, chord search and chord identification; keep matching navigation icons on phones.
- Make guitar shapes editable by touching a compact fretboard, including chords with missing positions, and show possible chord names while drawing.
- Keep mobile song tabs a consistent width and leave the semitone up button in place while offering a reset to the original key on its left.
- Simplify the key and chord panel copy, and keep transpose feedback inside the control.

## 0.6.2 · September 25, 2026

- Group document controls around chords, capo and page layout; move the optional `chordleaf.com` footer setting to the last, collapsed section.
- Transpose one semitone per tap, and label the optional capo behavior by what it does to the sounding key.
- Flatten the phone Harmony navigation into Key, Chords, Search and Identify views.
- Put editable projects first in the new-song menu, remove the mobile tab divider, and clarify the Harmony tabs.
- Compact mobile chord search and identification so diagrams and suggested names fit more comfortably.
- Prevent the mobile song tabs from showing a vertical scrollbar beside the add button.

## 0.6.1 · September 24, 2026

- Align the `chordleaf.com` footer checkbox with its label and match the document settings typography.
- Place the transposition interval inside its stepper so the controls and lyrics editor remain visible at common desktop and phone sizes.

## 0.6.0 · September 24, 2026

- Save and reopen a single song as a versioned `.chordleaf.json` project with its text, chord anchors, page settings, custom positions and diagrams intact.
- Keep PDF downloads distinct from editable project saves; warn clearly before discarding unsaved songs or later edits.
- Offer a document option for the `chordleaf.com` footer, enabled by default and shared by preview, PDF and Word.
- Keep manual column and page breaks during automatic fitting, and route text around diagram blocks in one or two columns.
- Show transposition intervals, source and result chords, and an immediate undo; retain unresolved chords for review.
- Add export and project browser coverage, clearer recovery messages, and a visual PDF/Word corpus. Use a portable monospace font in Word to avoid blank pages in LibreOffice.

## 0.5.3 · September 24, 2026

- Split the phone workspace into Document, Edit, Music and Preview views so lyrics and chords have the full editor height in portrait and landscape.
- Keep key analysis and chord tools together inside Music, with accessible tabs and keyboard navigation.
- Remember each song's mobile view and Music tab; show the editor when a chord is inserted from the key guide.
- Keep all document settings visible in their own phone view while preserving the desktop layout.

## 0.5.2 · September 24, 2026

- Make the mobile song sheet easier to inspect with pinch zoom, fit-to-width controls and a compact floating toolbar.
- Keep lyrics visible when opening a song on a phone; tuck document layout controls behind a clear button and wrap long editor lines without changing saved text.
- Give chord actions and dialogs larger touch targets, keep the active song tab visible and place mobile song creation beside the tabs.
- Arrange settings and lyrics side by side on short landscape screens, and open new blank songs in the editor from any section.

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
