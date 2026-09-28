# Audio → timed lyrics and chords: feasibility

Research date: 2026-09-27. **Follow-up:** a neural chord engine is now integrated and tested on four real audio excerpts against user-provided PDFs; see the [pilot results](audio-import-benchmark.es.md). The initial feasibility notes below describe the first baseline and research plan. Recommendation: proceed with a measured experiment. An automatic editable draft is feasible; a reliably correct, unattended transcription of arbitrary music is not established. No accuracy percentage for Chordleaf can be claimed without evaluating representative recordings.

## Architecture

```text
Original audio → common sample clock
                ├─ optional vocal separation → lyrics ASR → word alignment
                └─ mixture/accompaniment → chord recognition → timed intervals
                          ↓
             editable sheet + original timing + audio review
```

Your proposed two-model approach is the right structure. Analyze overlapping windows, not independent whole seconds. Chord changes can occur between seconds; words can span several changes. Keep start/end intervals in seconds with a shared origin. Do not trim leading silence separately, and restore offsets after chunking or source separation. Beat-aware smoothing can help, but forcing every change onto a beat would erase anticipations and expressive timing.

The prototype in this branch implements the complete path with Whisper and a simple chroma baseline. Neural chord models, vocal separation, forced alignment, persistent timing in editable projects and training are follow-up work. It has not been evaluated on a representative set of real songs.

Observed smoke tests on this machine: a 12-second synthesized C–Am–F–G progression produced those four labels, with transitions at 3.1, 6.1 and 9.0 seconds (reference: 3, 6 and 9). Silence produced `N`. A separate 4.13-second synthesized speech recording ran through `faster-whisper/tiny` and returned timed words, but several were wrong; the chord baseline also produced spurious chords over speech. These fixtures establish plumbing and expose limitations, not singing accuracy. The default `small` configuration has not been benchmarked here.

## Models worth comparing

| Component                   | Candidate and primary source                                                                                      | Assessment for Chordleaf                                                                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lyrics                      | [faster-whisper](https://github.com/SYSTRAN/faster-whisper)                                                       | Practical local inference with CPU int8 and word timestamps. Used in the prototype. Start with small for iteration; compare larger multilingual models on Spanish singing.                                                                                                              |
| Word alignment              | [WhisperX](https://github.com/m-bain/whisperX)                                                                    | Adds phoneme-based forced alignment. Useful after transcription or after the user corrects lyrics. Its speech alignment models still need testing on melisma, choirs and sustained vowels.                                                                                              |
| Vocal separation            | [Demucs](https://github.com/facebookresearch/demucs)                                                              | Separates vocals and accompaniment. Compare mixture vs separated inputs rather than assuming separation always helps. The original repository is archived; budget for dependency maintenance.                                                                                           |
| Neural chords               | [BTC, ISMIR 2019](https://github.com/jayg996/BTC-ISMIR19)                                                         | Bidirectional Transformer over musical features, with major/minor and larger-vocabulary inference paths. Strong research baseline for contextual recognition and later adaptation. Verify checkpoint provenance/availability when integrating; this branch does not bundle its weights. |
| Neural chords               | [Large-Vocabulary Chord Recognition](https://github.com/music-x-lab/ISMIR2019-Large-Vocabulary-Chord-Recognition) | Official code includes pretrained models and timed `.lab` output. Structured chord decomposition is especially relevant to extensions and inversions. Older research dependencies need a separate environment and reproducible port.                                                    |
| Classical chords            | [Chordino](https://github.com/c4dm/nnls-chroma/blob/master/README)                                                | NNLS chroma plus chord templates and HMM/Viterbi. Useful established non-neural comparator. The authors explicitly describe it as a simple, non-state-of-the-art method.                                                                                                                |
| Alternative neural baseline | [madmom](https://github.com/CPJKU/madmom)                                                                         | Contains music-analysis models; model/data licensing differs from code licensing. Its distributed models have noncommercial restrictions. Do not assume a permissive library license covers weights.                                                                                    |
| Note transcription          | [Spotify Basic Pitch](https://github.com/spotify/basic-pitch)                                                     | Converts audio to notes/MIDI and works best on one instrument at a time. Useful for guitar-only recordings or separated instruments. Notes are not contextual chord labels; it is not a drop-in full-song chord recognizer.                                                             |

The code repositories for BTC and the large-vocabulary model display MIT licensing. Before shipping weights, record the exact checkpoint and its terms separately from code and training-data terms. Chordino uses GPL licensing; evaluate its packaging separately. None of those external chord engines is redistributed here.

Lyrics are also a research problem: [a 2025 study of source separation with Whisper](https://arxiv.org/abs/2506.15514) studies precisely this task. This supports testing separation as an experimental factor, rather than promising that speech recognition will automatically work on all singing. The [WhisperX paper](https://arxiv.org/abs/2303.00747) addresses timing for speech, so its conclusions should not be treated as measured singing accuracy.

## Expected limits

These are engineering expectations to validate, not benchmark results:

- Clean guitar/piano and a prominent solo voice should be the easiest starting point. Distortion, heavy percussion, reverb, backing vocals and live crowd noise will be harder.
- Shared notes make relative major/minor chords ambiguous. Bass notes, inversions, omitted thirds and sus/add chords need context. A major/minor-only score can look good while losing precisely the harmony a musician wants.
- A chord label does not reveal which guitar shape was played or the capo position. Preserve concert-pitch labels and leave capo/voicing as separate choices.
- Whisper can omit sung words, repeat text or invent words over instrumental sections. A high model score is not proof of correctness. An empty lyric result should still allow a chord-only import.
- A word timestamp cannot locate a chord on a specific syllable. Keep the audio and allow manual alignment; add phoneme or singing-specific alignment only when measured improvements justify it.

## Can we train our own model?

Yes. The sensible first training experiment is adaptation of a pretrained chord recognizer, after establishing a baseline. Training a small classifier on synthetic chords is possible, but its success on clean synthesized triads would not establish usefulness on complete songs.

Proposed approach:

1. Collect recordings we can use with time-aligned chord labels, including silence/no-chord intervals. Start with 30–50 representative songs as a **pilot evaluation set**, not as a sufficient training corpus. Include Spanish vocals, acoustic guitar, piano, full mixes and difficult examples.
2. Separate train, validation and held-out test data by song and artist. Alternate mixes, pitch shifts and excerpts of the same recording must remain in one split. Freeze test labels before tuning.
3. Reproduce inference from an existing model, then adapt on corrected examples from the intended repertoire. Start with root and major/minor, then add sevenths, suspended chords and bass/inversions based on real errors.
4. Use pitch shifts with transposed labels, modest time stretches with transformed timestamps, and realistic mixing/noise augmentation. Synthetic data can supplement real audio, not replace its validation.
5. Consider pseudo-labels from a stronger teacher followed by human corrections. A [2026 study](https://arxiv.org/abs/2602.19778) investigates BTC teacher/student training on over 1,000 hours of unlabeled audio and subsequent supervised adaptation. This is evidence for a possible approach, not a guarantee or a dataset-size prescription for our project.

The practical bottleneck is reliable annotated audio and review time. BTC's authors note that their cited chord datasets provide annotations without the copyrighted audio. Lyrics resources such as [DALI](https://arxiv.org/abs/1906.10606) provide synchronized lyrics and vocal notes; those are not interchangeable with harmony annotations. Dataset access and permitted uses must be checked per source.

A model-training script can be built here, but calling it a useful trained model requires an actual corpus, training run, held-out evaluation and reproducible weights. None has been performed in this experiment. I would not incur GPU training costs before the pretrained-model comparison.

## Measurement and decision gates

Use the same recordings and reference annotations for every system:

| Dimension          | Measurement                                                                                                                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chords             | Duration-weighted root, maj/min, triads and sevenths scores, plus no-chord errors, with [mir_eval](https://github.com/mir-evaluation/mir_eval/blob/main/mir_eval/chord.py). Report coverage and per-class errors so common chords do not conceal rare-class failures. |
| Change timing      | Boundary precision/recall at explicit ±100/250/500 ms tolerances.                                                                                                                                                                                                     |
| Lyrics             | Word/character error rates with a documented punctuation/case policy, separated by language and recording type; separately count hallucinated instrumental lyrics.                                                                                                    |
| Word timing        | Median and 90th-percentile boundary errors for correctly matched words.                                                                                                                                                                                               |
| Product usefulness | Minutes of manual correction versus entering a sheet from scratch. This is the main release criterion.                                                                                                                                                                |
| Runtime            | Model load/download separated from inference time, peak memory, audio duration and hardware.                                                                                                                                                                          |

Suggested product gate, explicitly a target: median correction time at least 50% below manual entry on the pilot, with failures clearly recoverable. Select the chord model after that comparison. Model adaptation is justified only if it addresses a recurring, measurable weakness.

## Deployment and cost

The current local worker avoids remote audio uploads and API charges; it uses CPU, memory and model-download storage. It loads Whisper per job and is intentionally limited to one analysis at a time. The optional Python environment does not change the web app's package dependencies or offline bundle.

**Updated requirement (27 September 2026): no centralized audio processing.** The earlier server-based deployment option is superseded. Each user must run inference on their own device. The branch now includes an opt-in launcher for the built app plus local Python worker; the default public server still does not enable inference. A browser-only ONNX/WASM/WebGPU port remains separate work, with model parity, memory, download size and device variability to validate. See [local production architecture](audio-local-production.es.md).
