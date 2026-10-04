# Mobile polish tasks

Based on the physical iPhone 14 Pro / Safari audit on 4 October 2026. Prepared for the 1.5.0 release through PR #59 and its 1.5.1 model-panel follow-up through PR #60. Preserve song text and chord anchors; keep audio processing local.

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

- [x] Fix the optional Whisper model list collapsing to 6px in a short landscape viewport; make the entire model dialog scroll and verify reachable Small/continue controls at 283px and 393px in Chromium/WebKit.
- [x] Recheck the model-panel correction on the physical phone: native Small selection, native scrolling/continue, fresh Base download, Files import and exact reload persistence pass on the clean `a7d6ea4` preview.
- [x] Make long direct lyric/chord edits fit the visible mobile screen without sheet scaling or horizontal panning; preserve anchors, autosave, cancellation and keyboard access.
- [x] Investigate the physical landscape keyboard reporting a negative visual viewport; provide a usable compact editing flow and a recovery control when Safari leaves no editing space.
- [x] Explain automatic language limitations and remember an explicitly chosen song language across dialogs/reloads, including blocked storage and UI language changes.
- [x] Extend conservative Whisper loop protection to longer repeated phrases; keep ordinary chorus repetitions and expose incomplete results instead of claiming accuracy.
- [x] Recheck verse grouping on representative output, avoiding changes to recognized words or chord timing.
- [x] Verify the clean final preview's portrait keyboard, long verse Cancel/Done, independent chord renaming and reload persistence on the physical phone. Repeat native Files/Base import and verify remembered Spanish after reload.
- [x] Repeat the clean final landscape keyboard/settings-focus check: negative viewport recovery, native Safari-bar swipe, visible Artist/Done controls, source Return/A/Done and direct-verse Cancel/Done all passed without application overrides.
- [x] Verify offline inference and accepted-codec handling where feasible with owned fixtures; record unsupported cases and actionable errors.
- [x] Update the audit, user-facing guidance, screenshot and PR with measured results and remaining limitations.

## Limits requiring additional evidence

These are test coverage items, not confirmed application defects. Do not claim they pass without testing: private browsing, exhausted storage, prolonged battery/thermal stress, screen readers, 200% zoom, ten-minute recordings and other iOS versions. Permanent PDF saving through Share/Files and a native JSON reimport remain unverified. Sung-word and chord accuracy need a representative reference corpus; a successful import or a line-planning change cannot establish accuracy.

The functional changes are committed at `bd1566a`. All 196 unit tests, all 37 browser suites, the Chromium/Firefox/WebKit CI matrix and Mac checks pass, including the subsequent `1e35dd7` documentation/accessibility commit. Locally generated Spanish speech completed Base/chord inference as WAV, AAC/M4A, MP3, FLAC and Vorbis/OGG in Chromium and WebKit; the four non-WAV Chromium runs also completed with the browser offline. These are desktop engine tests, not additional physical iPhone codec/offline certifications. The updated editor passes automated accessibility checks; this does not certify screen readers. After reconnection, the clean `1e35dd7` preview passed the physical portrait editor, native Spanish WAV import (25 seconds of audio, 8.342 seconds of analysis) and final landscape keyboard replay, including the layout-height refinement.

The [Spanish release walkthrough](mobile-release-walkthrough.es.md) provides a concrete tour of the changes on the public domain.
