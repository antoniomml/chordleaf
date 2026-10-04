# Mobile polish tasks

Based on the physical iPhone 14 Pro / Safari audit on 4 October 2026. Work stays on `codex/safari-audio-import` and PR #59 until reviewed for production. Preserve song text and chord anchors; keep audio processing local.

## Completed baseline

- [x] Run Base/Small on the physical phone with Spanish/English WAV/AAC, including a complete 193-second song.
- [x] Verify Safari's native Files picker, analysis, saved song and reload persistence.
- [x] Reduce CPU/WASM and download/audio copies; fix protected same-origin downloads.
- [x] Keep Base/Small available; block Turbo on mobile WebKit and Qwen on WebKit, including old preferences.
- [x] Add local privacy-preserving diagnostics, cancellation and interrupted-attempt recovery. The original 3 October failure has insufficient evidence for an exact cause.
- [x] Fit portrait fields/dialogs above the keyboard, retain 16px inputs and 44px controls, and keep the lyric end caret visible.
- [x] Keep the phone workspace in landscape with notch safe areas.
- [x] Improve verse/stanza planning while preserving recognized words and timing.
- [x] Verify chord search, fretboard, transposition, capo, PDF display, Word/JSON download prompts, project reimport and language switching.
- [x] Pass 194 unit tests, all 37 browser suites, the Chromium/Firefox/WebKit compatibility matrix, Mac checks and CodeQL on the audited baseline.

## Current implementation

- [x] Make long direct lyric/chord edits fit the visible mobile screen without sheet scaling or horizontal panning; preserve anchors, autosave, cancellation and keyboard access.
- [x] Investigate the physical landscape keyboard reporting a negative visual viewport; provide a usable compact editing flow and a recovery control when Safari leaves no editing space.
- [x] Explain automatic language limitations and remember an explicitly chosen song language across dialogs/reloads, including blocked storage and UI language changes.
- [x] Extend conservative Whisper loop protection to longer repeated phrases; keep ordinary chorus repetitions and expose incomplete results instead of claiming accuracy.
- [ ] Recheck verse grouping on representative output, avoiding changes to recognized words or chord timing.
- [ ] Verify updated portrait/landscape keyboards and native audio import on the physical phone; repeat the relevant browser and persistence checks.
- [ ] Verify offline inference and accepted-codec handling where feasible with owned fixtures; record unsupported cases and actionable errors.
- [ ] Update the audit, user-facing guidance, screenshot and PR with measured results and remaining limitations.

## Limits requiring additional evidence

These are test coverage items, not confirmed application defects. Do not claim they pass without testing: private browsing, exhausted storage, prolonged battery/thermal stress, screen readers, 200% zoom, ten-minute recordings and other iOS versions. Permanent PDF saving through Share/Files and a native JSON reimport remain unverified. Sung-word and chord accuracy need a representative reference corpus; a successful import or a line-planning change cannot establish accuracy.
