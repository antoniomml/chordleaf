# Audio import experiment

This branch adds **New song → Import audio · Experiment**. It runs on a local Vite server, with an isolated Python worker. It is not enabled on chordleaf.com, the standalone production server or Vercel.

## Run

Use Python 3.13 (tested on macOS ARM) and the normal project Node/pnpm environment:

```sh
python3.13 -m venv experiments/audio/.venv
experiments/audio/.venv/bin/pip install -r experiments/audio/requirements-neural.lock.txt
CHORDLEAF_AUDIO_PYTHON="$PWD/experiments/audio/.venv/bin/python" pnpm dev --host 127.0.0.1
```

Open the local URL, select **New song → Import audio · Experiment**, choose a recording and press **Analyze audio**. Leave lyrics enabled for the complete pipeline, or disable them to test chords without downloading Whisper. Spanish, English and automatic voice language selection are available. The first transcription downloads the `small` Whisper model from Hugging Face to its normal cache. Subsequent runs reuse the download, but load the model into a new process for each request. No API key or paid service is required.

For a quick, lower-quality smoke test, set `CHORDLEAF_WHISPER_MODEL=tiny` when starting Vite. A local model directory is also supported. Larger models require more memory and time; no song-level latency benchmark has been established.

The UI accepts MP3, WAV, M4A, FLAC and OGG, up to 30 MiB and 10 minutes. The worker probes the audio contents with PyAV, converts to mono 16 kHz and limits decoded duration. Browser playback depends on the browser's codec support; analysis can support a format that the browser cannot play.

Listen using the interval buttons, edit the draft and create a song. **Download timing · JSON** preserves original word and chord intervals and engine names. The regular editable project currently saves only the text sheet: it does not embed audio or timing. Draft corrections do not update the original analysis JSON.

## What actually runs

- Lyrics: `faster-whisper`, CPU/int8, word timestamps, no speech VAD (sustained sung vowels should not automatically be discarded by a speech gate). This is a speech-trained model used on singing, not a validated singing model.
- Default chords: the pretrained **lv-chordia 1.1.0** ensemble (five CNN/LSTM networks from Jiang et al., ISMIR 2019), with the `submission` dictionary: 301 labels including seventh/ninth/eleventh/thirteenth, suspended, diminished and augmented chords and selected inversions. These are vocabulary capabilities, not guarantees of correct detection. Original Harte labels remain in JSON as `rawLabel`. No new model has been trained.
- Optional baseline: our small signal-processing detector, available in the detector selector. Centered 256 ms FFT windows sampled every 100 ms, pitch-class energy, temporal smoothing, 24 major/minor templates and Viterbi continuity. A silence/similarity gate emits `N`. It assumes A4 = 440 Hz and does not infer sevenths, inversions, capo, key or guitar fingering.
- Alignment: both branches analyze the same decoded samples. Chord changes within a word snap to that word's start in the editable text. Instrumental changes remain separate chord-only lines. Exact source intervals are retained in JSON. Neither the baseline’s 100 ms sampling grid nor the neural model’s approximately 23 ms frame hop is a claim of equivalent recognition accuracy.
- The local endpoint accepts a single job at a time, checks loopback socket/Host and same-origin requests, enforces byte/duration limits, kills inference on cancellation or a 15-minute timeout, and removes temporary uploads. No audio is sent to a remote inference service. Initial model downloads still need network access. Do not expose this development server publicly.

## Checks

```sh
pnpm test
experiments/audio/.venv/bin/python -m unittest discover -s experiments/audio -p 'test_*.py'
# With the Vite server running:
CHORDLEAF_URL=http://127.0.0.1:5173 node tests/audio-import-browser.mjs
```

The Python tests distinguish silence and a synthetic C–Am–F–G progression. Browser tests exercise preview/import, JSON download, failure and cancellation using fixture analysis; these are software integration checks, not model accuracy measurements. See the [feasibility report](../../docs/audio-import-feasibility.md) and the [real-audio pilot](../../docs/audio-import-benchmark.es.md) for measured results and remaining limits.

## Reproduce the real-audio pilot

Private PDFs, downloaded preview audio and all extracted text/results remain under ignored `artifacts/audio-benchmark/`; they are not bundled or published. The original Drive files are never edited. `sources.json` records official preview URLs and audio SHA-256 hashes; `model-checksums.json` records the five checkpoints.

`requirements-neural.lock.txt` pins the complete tested macOS/Python 3.13 environment. `requirements-neural.txt` lists direct dependencies. For the baseline alone, install `requirements.txt` and select the baseline detector (or pass `--engine baseline`); selecting neural without its dependencies returns an error, never a silent fallback.

```sh
experiments/audio/.venv/bin/python experiments/audio/benchmark.py \
  artifacts/audio-benchmark/references.json artifacts/audio-benchmark/evaluation
```

A manifest entry has `id`, a local `audio` path, `pdf` filename, visually verified `chords`, optional `shift` in semitones (PDF → recording), `freeEnds` for an unknown excerpt location and a provenance `note`. The script decodes the same audio for both engines and saves raw intervals, timings, software versions and alignment traces. Without a fixed shift it searches all 12. Its untimed sequence agreement is **not** audio accuracy or a substitute for held-out timestamp annotations.
