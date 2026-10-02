<div align="center">
  <img src="public/logo.svg" width="76" height="76" alt="chordleaf logo">
  <h1>chordleaf</h1>
  <p><strong>Your song. Your chords. Everything in place.</strong></p>
  <p>A local-first chord sheet editor: correct imported chords, make your own version,<br>and export a clean PDF or print it.</p>
  <p>
    <a href="https://github.com/antoniomml/chordleaf/releases/latest"><img src="https://img.shields.io/github/v/release/antoniomml/chordleaf?style=flat-square&color=c9e79c&labelColor=263426&label=version" alt="Latest release"></a>
    <a href="https://github.com/antoniomml/chordleaf/actions/workflows/checks.yml"><img src="https://github.com/antoniomml/chordleaf/actions/workflows/checks.yml/badge.svg" alt="Automated checks"></a>
  </p>
  <p><a href="https://chordleaf.com/">Open Chordleaf</a> · <a href="#a-small-studio-for-your-songs">Features</a> · <a href="https://github.com/antoniomml/chordleaf/wiki">User wiki</a> · <a href="CHANGELOG.md">Changelog</a> · <a href="CONTRIBUTING.md">Contribute</a></p>
</div>

![chordleaf: lyrics and chord editor beside a song sheet](docs/images/workspace.png)

## A small studio for your songs

Chord sites are a starting point: the chords, alignment or arrangement may need corrections. Chordleaf helps you make your own version: import a supported page or document, edit the lyrics and chord changes, transpose when needed, then review the printed layout and export PDF or print directly.

It is for singers, guitarists, teachers and anyone preparing their own printable chord sheets. The interface is available in **English and Spanish**. Use **EN / ES** in the top bar; your songs keep their original language. Project documentation is in English.

| When you want to…             | chordleaf helps you…                                                   |
| ----------------------------- | ---------------------------------------------------------------------- |
| **Prepare a song**            | Start from a blank page, a website URL, or TXT, PDF or Word.           |
| **Time a chord change**       | Anchor a chord to an exact letter without adding spaces to the lyrics. |
| **Write comfortably**         | Resize the editor or open its expanded view.                           |
| **Suit your voice**           | Transpose by semitones and adjust the capo.                            |
| **Find a voicing**            | Browse 828 chords and 3,283 standard-tuning guitar positions.          |
| **Name a shape**              | Place notes on a fretboard and compare harmonic interpretations.       |
| **Try an alternative**        | Insert a voicing or replace one or all occurrences of a song chord.    |
| **Prepare a rehearsal sheet** | Choose font size, margins and one or two columns in an A4 preview.     |
| **Share the result**          | Export PDF, editable Word or text, or print the A4 sheet.              |

## From the first verse to rehearsal

**1. Name your song.** Choose **New song** to start from scratch or import a file. Several songs can stay open in separate tabs.

**2. Write lyrics and add chords.** Put each chord in brackets at the point where the harmony changes:

```text
[G]Keep the light of [D]this new morning
[C]in the strings of my [G]guitar.
```

The printed sheet shows chords above the lyrics, without brackets. For a change inside a word, `mor[G]ning` anchors the chord to the **n**.

**3. Make it comfortable to play.** The **Document**, **Key** and **Chords** sections each occupy the whole sidebar. Adjust the document, inspect the estimated key or work with guitar chords. When ready, choose **Export**. **Export → Print** sends the A4 pages to the browser print dialog without the workspace controls.

[Explore the controls in the user guide →](https://github.com/antoniomml/chordleaf/wiki/User-guide)

## Give every chord a place

The **Chords** section shows the song's chords as a three-column grid of diagrams. Select a card to edit its voicing, or drag a diagram onto the sheet. The search covers major, minor, seventh, diminished, suspended, extended and slash chords.

![The guitar chord workspace](docs/images/chord-library.png)

The interactive fretboard calculates sounding notes and the lowest pitch. Its formula-based identifier compares exact matches, inversions and explicitly labelled omissions. For example, the same notes can suggest C6 or Am7/C. Interpretations depend on context; the tool does not claim to enumerate every possible chord name. See [the harmony model](https://github.com/antoniomml/chordleaf/wiki/Harmony-model).

Choose an interpretation to insert it at the text cursor or replace a specific occurrence or all occurrences of an existing chord. The chosen voicing is saved with the song.

## Your music stays with you

Songs and imported files are processed in your browser. Link downloads send the song URL to the Chordleaf server, which downloads the public page; your edited songs are not uploaded. If the source returns 403, the dialog shows a notice about the upcoming browser extension and a collapsed **Have a saved copy of the page?** option for a local HTML file. For pasting lyrics or importing documents, use **New song → Import text or file**. The HTML file stays on your device. There are no accounts. Changes are saved automatically in that browser.

**Your work saves itself in this browser.** Open songs come back when you return, and closing a song moves it to **Recent** on the start page and in **New song**, so you can reopen it later. **View all** exposes every closed song; songs remain there until you explicitly remove them. Browser storage does not sync devices and can be cleared with site data, so download a portable copy when a song matters: **Export → Download editable project** saves a `.chordleaf.json` file you can open elsewhere through **New song → Open editable project**, and **Workspace backup · JSON** keeps open and closed songs. It remains available when all songs are closed. Ctrl/⌘ + Shift + S downloads the editable project directly.

Document settings include a checkbox for the `chordleaf.com` page footer. It is on for new songs and can be switched off for the preview, PDF and Word export.

Both interface and document fonts are served by the app itself. There are no third-party font requests or analytics scripts. See [privacy and storage](https://github.com/antoniomml/chordleaf/wiki/Privacy-and-storage).

## Install it, print it

Chordleaf works in Chromium, Firefox and Safari. In browsers that support installing websites, use the browser's install option, or add it to your home screen on a phone. After the first successful service-worker installation, the editor, fonts, file importers and PDF/Word exporters are available offline. Updates take over when existing Chordleaf tabs close; link downloads still need a connection. **Export → Print** paints just the A4 sheet, without the workspace chrome.

**Export → ChordPro (.cho)** writes a portable plain-text chord sheet with `{title}`, `{artist}` and `{capo}` directives, understood by apps such as SongBook, OnSong and the ChordPro toolchain, and it can be imported back here.

## A workspace with room to grow

The workspace gives phones separate Document, Edit, Harmony and Preview views. Harmony has one row for key analysis, song chords, chord search and chord identification. The lyrics editor fills the available space, songs remember their last view, and the sheet still supports pinch zoom. Scanned PDFs require external OCR, complex layouts may need corrections after import, and Word rendering depends on the reader and available fonts.

The public service includes experimental local audio import: LV-Chordia detects chords in the browser, with optional Whisper Base/Small/Large v3 Turbo or Qwen 0.6B for lyric drafts. Models download only on request and remain on the device; browser inference never uploads audio. Sung lyrics may contain errors and need review. Native Qwen/Whisper remains available in the desktop candidate. See [browser implementation and limits](docs/audio-browser-youtube.es.md), the [feasibility study](docs/audio-import-feasibility.md) and [real-audio pilot](docs/audio-import-benchmark.es.md). See also the [changelog](CHANGELOG.md) and [export QA notes](docs/export-qa.es.md).

## Take part

Musical ideas, missing explanations and awkward controls are all useful contributions. [Report an issue](https://github.com/antoniomml/chordleaf/issues/new?template=bug_report.yml) or [suggest a feature](https://github.com/antoniomml/chordleaf/issues/new?template=feature_request.yml), using short invented song examples.

To run your own copy, follow [the development guide](docs/development.md). To put it online, use the [step-by-step Vercel guide](docs/deployment.md). Try the public app at [chordleaf.com](https://chordleaf.com/). Preview deployments still require Vercel authentication.

The [user wiki](https://github.com/antoniomml/chordleaf/wiki) is the home for the illustrated guide, common questions, chord theory and storage guidance. The screenshots it uses and the development, architecture and deployment instructions remain in this repository. Report security issues [privately](SECURITY.md).

---

<div align="center">
  <p><strong>Make the sheet your own.</strong></p>
  <p><a href="https://github.com/antoniomml/chordleaf/wiki/User-guide">User guide</a> · <a href="docs/deployment.md">Deploy</a> · <a href="docs/architecture.md">Architecture</a> · <a href="THIRD_PARTY_NOTICES.md">Credits</a></p>
  <sub>Original application code is MIT licensed. See <a href="LICENSE">LICENSE</a>. Third-party data and fonts retain their respective licenses.</sub>
</div>
