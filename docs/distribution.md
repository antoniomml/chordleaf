# Launch distribution

Checklist and drafts for announcing Chordleaf 1.0. Keep every claim true: no accounts, no tracking, local-first, and no public song index. Read each community's self-promotion rules before posting; prefer answering questions over dropping links.

## Before posting

- [ ] Release tag `v1.0.1` is published and the production deploy points at it.
- [ ] `pnpm check`, the browser suite and compatibility tests are green in CI.
- [ ] Sitemap submitted in Google Search Console and Bing Webmaster Tools.
- [ ] Social preview checked with a link debugger (WhatsApp, X, Slack).
- [ ] Demo recorded (60–90 s): create a song → place chords → transpose → print A4 → export ChordPro → install the PWA.
- [ ] Screenshots ready: empty state, editor and preview, chord workspace, printed sheet, phone preview.
- [ ] Support channel stated: GitHub Issues.

## Product Hunt

Tagline:

- EN: `Write lyrics, place chords, print A4 chord sheets.`
- ES: `Letras y acordes con diagramas y hoja A4 para imprimir.`

Short description:

- EN: `Chordleaf is a free, local-first editor for lyrics and guitar chords. Place chord diagrams on the sheet, transpose, import TXT/PDF/DOCX or a song link, and export PDF, Word, TXT or ChordPro. It installs as an app and works offline. No accounts, no tracking.`
- ES: `Chordleaf es un editor gratuito y local de letras y acordes. Coloca diagramas en la hoja, transporta, importa TXT/PDF/DOCX o un enlace, y exporta PDF, Word, TXT o ChordPro. Se instala como app y funciona sin conexión. Sin cuentas y sin tracking.`

First comment:

- EN: `Hi PH! I built Chordleaf because rehearsal sheets kept ending up as screenshots. It runs entirely in the browser, keeps your songs local, and the printed A4 sheet is the main output, not a side feature. Happy to answer anything about chord parsing, PDF/Word import or the offline setup.`
- ES: `Hola: hice Chordleaf porque las hojas de ensayo acababan siempre en capturas. Todo corre en el navegador, tus canciones se quedan en tu dispositivo y la hoja A4 es el objetivo principal, no un extra. Cualquier duda sobre importación, acordes o el modo offline, aquí estoy.`

## Show HN

Title:

`Show HN: Chordleaf – local-first chord sheet editor that prints A4 (PWA)`

Body:

`I wanted a chord editor where the final artifact is a clean A4 sheet, not a scrolling web page. Chordleaf is plain JavaScript (no framework), stores songs in the browser, and imports TXT, selectable PDF, DOCX and supported song links. It can transpose, keep the capo linked to the sounding key, place chord diagrams on the sheet and export PDF, Word, TXT or ChordPro. It installs as a PWA and edits offline. Privacy: no accounts, no analytics; web import is a server-side fetch limited to an allowlist. The trickiest parts were importing real-world chord sheets (alignment, LaCuerda grid legends, unresolved chords) and printing with correct A4 geometry. Feedback welcome.`

## Reddit

Rules first: most subreddits limit self-promotion. Share the demo and answer questions; do not post the same text everywhere.

- r/guitar: `I made a free chord sheet editor that prints proper A4 pages (no accounts, works offline)`.
- r/WeAreTheMusicMakers: angle on the rehearsal workflow, from a chord idea to a printed sheet without an app account.
- r/worshipleaders: angle on quick key changes and capo, with songs staying on the device.
- Spanish forums and communities: same body, mention Cifra Club and LaCuerda import and that some sites block server downloads, with pasting the lyrics as the fallback.

## AlternativeTo

Submit as an alternative to Cifra Club, Ultimate Guitar and Chordly.

- EN: `Free, local-first lyrics and chords editor focused on the printed sheet. Chord diagrams, transpose, capo, import TXT/PDF/DOCX and supported links, export PDF/Word/TXT/ChordPro, installable PWA with offline editing. MIT, no accounts, no tracking.`
- ES: `Editor gratuito y local de letras y acordes centrado en la hoja impresa. Diagramas, transporte, cejilla, importación de TXT/PDF/DOCX y enlaces compatibles, exportación PDF/Word/TXT/ChordPro, PWA instalable con edición offline. MIT, sin cuentas y sin tracking.`

## Sitemap

- Google Search Console: add the domain property if missing, submit `https://chordleaf.com/sitemap.xml`, then request indexing for the new content pages.
- Bing Webmaster Tools: import from Search Console or add the site and submit the same sitemap.

## Measurement

- Watch Search Console for `chord sheet maker`, `editor de acordes`, `hoja de acordes para imprimir`, `transportar acordes` and the import queries.
- No user-level analytics. Import errors stay aggregated in server logs.
