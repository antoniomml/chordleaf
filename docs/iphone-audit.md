# Physical iPhone audit — 4 October 2026

The browser importer is viable on the tested iPhone 14 Pro with Whisper Base and Small. Keep it experimental: successful execution does not establish transcription or chord accuracy. Whisper Turbo is now unavailable on iPhone/iPad WebKit after Safari reloaded during its download. Qwen remains unavailable on WebKit.

## Device and method

The physical device runs iOS 27.0 and Safari 27.0. Safari's frozen user-agent token says `iPhone OS 18_7`; Device Hub identifies the actual OS. Tests use protected Vercel previews, Safari's remote inspector and Device Hub's real phone screen and software keyboard. Desktop WebKit emulation is reported separately.

Audio tests ran at `3b0da89` and were repeated with Base at `b5da57d`. UI changes progressed through `b5da57d`, `672a359` and `a11860f`. Temporary public reference recordings and an audit helper were served only from protected audit previews, outside Git and production. The release preview contains neither. No private user recording was uploaded.

## Audio results on the physical phone

| Model | Recording                | Duration | Worker time | Outcome                                                               |
| ----- | ------------------------ | -------- | ----------- | --------------------------------------------------------------------- |
| Base  | Spanish WAV              | 25 s     | 8.76 s      | Lyrics and chords                                                     |
| Base  | Spanish M4A/AAC          | 30 s     | 11.88 s     | Lyrics and chords                                                     |
| Base  | English M4A/AAC          | 30.02 s  | 12.81 s     | Lyrics and chords                                                     |
| Base  | Complete Spanish M4A/AAC | 193.34 s | 66.54 s     | 186 word intervals, 59 chord intervals; approximate alignment warning |
| Small | Spanish WAV              | 25 s     | 23.71 s     | Lyrics and chords; approximate alignment warning                      |
| Small | English M4A/AAC          | 30.02 s  | 38.76 s     | Lyrics and chords                                                     |

Base's initial download took 11.11 seconds and Small's 16.33 seconds on this connection. These worker times exclude model downloads and some decoding/UI work; they are single observations, not benchmarks. All inference ran on the phone. The first six recordings were assigned with the browser's `File`/`DataTransfer` API and processed by the ordinary import controls.

A separate native end-to-end test downloaded the owned 25-second WAV fixture to Files, selected it with Safari's actual file picker (`audio/x-wav`, 800,044 bytes), and tapped Analyze on the phone. It completed in 8.91 seconds, closed the dialog and opened a third saved song. A fresh Base download at `b5da57d` took 14.38 seconds; a second assigned WAV analysis took 8.28 seconds.

Cancellation during the complete recording terminated analysis after 3.00 seconds. The serialized saved workspace remained unchanged. Pausing Turbo's download with the on-screen control recorded `cancelled` and restored Continue. Completed verified files are reused on retry; partially downloaded files restart from their beginning.

Turbo's retry reached approximately 50% of its 1.09 GB download before Safari reloaded. The recovered diagnostic marked the attempt `interrupted`; all six existing songs remained saved. No Turbo inference ran on this phone. The implementation blocks mobile WebKit selection and downloads, and falls back to Base for an old Turbo preference, including previously cached weights.

### What the logs establish

The first protected preview failed before inference because `credentials: "omit"` stripped its same-origin authentication cookie. Vercel redirected to SSO, which CSP blocked. Using `same-origin` fixed this preview failure; external weight hosts still receive no credentials. Browser regression tests inspect actual outgoing cookie headers. Deployment protection and CSP stay enabled.

The original public-domain attempt from 3 October cannot be reconstructed. The hosting log query returned 403, and inference runs in a browser worker rather than a hosting function. There was no persistent local diagnostic for that attempt. This preview authentication issue does not establish its cause.

Read-only device crash-log inspection found a WebKit Networking disk-write resource report covering roughly 1.105 GB over 27 minutes, with **Action taken: none**. It does not prove a memory kill or the cause of the reload. An older jetsam report concerned a different process. Raw device logs and identifiers remain ignored and are not included here. Peak phone memory was not measured.

## Interface and keyboard

Portrait without the keyboard exposed a 393 × 695 CSS-pixel visual viewport. With the real software keyboard it exposed 393 × 365 at scale 1. Inputs use at least 16px text; tested fields did not trigger automatic zoom.

| Flow                       | Physical observation and change                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Title and artist           | Both editable with the software keyboard. Safari's focus pan could clip the header; the workspace now follows the visual viewport origin.                                                                                                                                                                                                                                                  |
| Lyrics                     | Hiding the hint/footer while typing increased the usable textarea from about 59px to about 161px. The clean `a11860f` preview exposed a 161px textarea with its end caret visible (`scrollTop` and maximum scroll both 459px). Native Return and A input succeeded after twelve invented lines. Resizing scrolls the textarea only when its caret is at the end.                           |
| Chord search               | `Am` returned matches with the real keyboard. The panel scrolls internally; its first explanatory paragraph is hidden while typing.                                                                                                                                                                                                                                                        |
| Numeric capo               | The real numeric keyboard edited and saved capo 2. The numeric target now has a minimum 44px height.                                                                                                                                                                                                                                                                                       |
| Direct sheet editing       | Editing the first lyric on the sheet preserved its C/G/Am chord anchors. The real keyboard appeared at scale 1; edited text survived export and navigation. Long lines at the sheet's current zoom can extend beyond the visible width and require horizontal panning; use Lyrics for longer corrections. Fitting this inline editor to the visible width remains a usability improvement. |
| Web import dialog          | Dialog bounds now follow the visible viewport. The URL field and action remain reachable by scrolling inside the dialog. The action's minimum height is 44px. On the final preview, the URL keyboard left 392px of visible height; the dialog was at y=16, height=360, and its action at y=303.59, height=44.                                                                              |
| Landscape without keyboard | At 852 × 283, the previous 760px breakpoint selected the desktop layout. The new touch/short-screen query retains phone panels/navigation, compact spacing and 59px left/right notch safe areas. A desktop window of the same size retains desktop layout.                                                                                                                                 |

Safari can pan a fixed document while focusing a textarea. An attempted window-scroll reset was removed; the final approach follows `visualViewport.offsetTop` for the workspace and dialogs without forcing window scrolling. Device Hub and the inspector occasionally displayed stale frames/results; refreshing their view was necessary. A blank remote frame observed during an intermediate trial is not conclusive evidence of an application crash.

**Remaining physical limitation:** landscape with the software keyboard reported a visual viewport height of **−9px**, including during a trial without the fixed-body rule. The browser chrome/tab strip and keyboard occupied almost the entire screen. Invalid heights now retain the last valid layout, but this guard does not establish usable landscape typing. Prefer portrait for text entry until this behavior is reproduced and resolved on the physical screen. No Safari-wide settings were changed to hide the browser chrome.

The clean final preview also verified positive focus offsets: title 0.66px, artist 74px, capo 91.66px and inline lyrics 23.66px. The body followed each offset, fields stayed visible and scale remained 1. Closing the keyboard restored offset 0. Chord search and the web dialog were rechecked with the final code.

![Physical iPhone software keyboard with an invented lyric in the final preview](images/iphone-keyboard-audit.png)

## Export and persistence

With an invented song and capo 2, the real PDF action opened a readable one-page PDF in the same Safari tab. Back restored the editor and its saved edits. Permanent PDF saving through Share/Files was not tested.

Word and editable-project export displayed native Safari download prompts; both were confirmed. The generated project contained the expected title, original text, capo and versioned format. Reimporting that generated JSON through `File`/`DataTransfer` restored the song; a separate native JSON picker selection was not tested. Switching ES to EN preserved the edits and capo.

## Validation and limits

`pnpm check` passes 194 unit tests, formatting, production build and metadata checks. The 37 browser suites and compatibility checks pass in Chromium/WebKit against the built local server. Tests cover the mobile Turbo policy, same-origin/external credentials, negative viewport values, visible viewport offsets, dialog bounds, landscape breakpoints and end-caret recovery. Synthetic keyboard tests supplement the physical checks; they cannot reproduce iOS keyboard behavior.

The local Firefox binary fails before visiting the application with “Could not find profile folder”, including a retry with another temporary directory. This is not a Chordleaf failure or a passing Firefox result; the Linux CI matrix must validate Firefox.

Not certified on this phone: private browsing, low/full storage, offline audio inference, battery/thermal limits, screen readers, 200% zoom, ten-minute recordings, every accepted codec or every iOS version. Whisper Base still made substantial sung-word errors in reviewed recordings. No WER, comparative accuracy benchmark or vocal separation test was performed. The lyric planner improves line/stanza presentation without changing recognized words, timing or the original analysis; it cannot recover incorrectly recognized lyrics.

Detailed local evidence remains in ignored `artifacts/iphone-audit/`. This report describes a tested branch/preview and does not imply production publication.
