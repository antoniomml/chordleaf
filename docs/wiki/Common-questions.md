# Common questions

[← User guide](https://github.com/antoniomml/chordleaf/wiki/User-guide) · [Open Chordleaf](https://chordleaf.com/)

## Where are my songs saved?

Chordleaf saves your open and closed songs in this browser, on this website. Closing a song moves it to **Recent**; **View all** shows every stored closed song. Songs stay there until you explicitly remove them. It has no account or cloud sync. Other devices, browsers and website addresses have separate storage. Export a **Workspace backup · JSON** to keep everything, even when all songs are closed, or choose **Export → Download editable project** to preserve one song as `.chordleaf.json`. Open it through **New song → Open editable project**. TXT and ChordPro remain useful interchange formats. See [privacy and storage](https://github.com/antoniomml/chordleaf/wiki/Privacy-and-storage).

## How do I put a chord over a particular syllable?

Put the chord in brackets immediately before the letter: `mor[G]ning` puts G over the **n**. The brackets disappear from the printed sheet. See [the illustrated guide](https://github.com/antoniomml/chordleaf/wiki/User-guide#place-a-chord-precisely).

## Which files can I import?

Use **New song → Open document** for TXT, CHO, ChordPro, text-based PDF and DOCX. A scanned PDF needs OCR before Chordleaf can read it. A legacy `.doc` file needs conversion to `.docx`. Use **Open editable project** for `.chordleaf.json` projects or workspace backups, and **Paste from clipboard** for copied text. Review imported chord positions before exporting.

## Can I create a song from audio?

Yes. **New song → Import audio** creates an experimental draft of chords and optional lyrics. Models download only after you request them; analysis runs on your device. Sung lyrics, chord names and timing can be wrong, so review the result. See the [audio import guide](https://github.com/antoniomml/chordleaf/wiki/Audio-import) for model sizes, requirements, deletion and troubleshooting.

## Why did importing a website fail?

Website import supports accessible chord pages from LaCuerda, AcordesWeb, TusAcordes, Chordie, Acordes.cc and Ultimate Guitar. Cifra Club commonly blocks server downloads; saved HTML can still be parsed locally when the dialog offers that fallback. A provider can change its page, block automated requests or require access Chordleaf cannot provide. Try a supported chord page, then use text or file import if it still fails. Chordleaf does not bypass provider restrictions.

## How do I print or share a song?

Use **Export → Download PDF** for a fixed printable page, **Export Word · DOCX** for further editing, or **Text · TXT** for a song you plan to reimport. Save **Download editable project** as well when you want to preserve the complete song for later editing. Word may look slightly different in another editor. Check the preview and exported file before sharing.

## Can I use Chordleaf on a phone?

Yes. Phones use separate **Settings**, **Lyrics**, **Harmony** and **Preview** views. Switch views with the bottom navigation, and pinch the sheet to zoom. Export a copy before switching devices: songs do not sync automatically. The [five-minute introduction in Spanish](https://github.com/antoniomml/chordleaf/wiki/First-song.es) describes the phone controls too.

## What if my saved workspace cannot open?

Use **Recover data** to download the original JSON, then keep that file private because it can contain your songs. Export any new work before clearing this site's browser storage. The [recovery section](https://github.com/antoniomml/chordleaf/wiki/User-guide#recover-a-damaged-browser-session) explains the steps.

## Does changing the interface language translate my song?

No. **EN / ES** changes the controls; your lyrics, chords and titles stay as written.

## Does Chordleaf upload my music?

Editing, local file imports, audio analysis and exports happen in your browser. Audio-model downloads contact Chordleaf and Hugging Face to fetch public files, without sending your recording or transcription. For **Import from a website**, the server receives the URL you provide and downloads that public page. It does not receive your edited song. See [privacy and storage](https://github.com/antoniomml/chordleaf/wiki/Privacy-and-storage).

## Can I install it on Mac?

The website works in current Mac browsers. Browser installation depends on the browser; Firefox desktop does not generally offer the same built-in PWA installation as Chromium or Safari. A separate Electron candidate targets Apple Silicon and macOS 15+, but it is not a public verified installer until signing, notarization and release checks pass. Check the official [releases](https://github.com/antoniomml/chordleaf/releases) for actual downloadable assets. Web and desktop libraries are separate; transfer editable projects or a workspace backup.
