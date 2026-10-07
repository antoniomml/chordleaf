# Audio import experiment

This branch adds **New song → Import audio · Experiment**. It runs on your own computer, with an isolated Python worker. Both local Vite and the opt-in built-app launcher are supported. Public deployments (chordleaf.com/Vercel and the default production server) do not provide audio inference.

## Run

Use Python 3.13 (tested on macOS ARM) and the normal project Node/pnpm environment. One explicit command prepares the isolated environment and downloads Whisper without receiving any audio:

```sh
pnpm audio:setup
```

Set `CHORDLEAF_SETUP_PYTHON` if Python 3.13 has a different executable path. `pnpm audio:setup medium` prepares the optional larger model. This is a developer installer, not a packaged desktop application. Manual installation remains available:

```sh
python3.13 -m venv experiments/audio/.venv
experiments/audio/.venv/bin/pip install --require-hashes -r experiments/audio/requirements-neural.lock.txt
CHORDLEAF_AUDIO_PYTHON="$PWD/experiments/audio/.venv/bin/python" pnpm dev --host 127.0.0.1
```

Open the local URL, select **New song → Import audio · Experiment**, choose a recording and press **Analyze audio**. Leave lyrics enabled for the complete pipeline, or disable them to test chords without Whisper. Spanish, English and automatic voice language selection are available. The setup command downloads the `small` Whisper model from Hugging Face to its normal cache. The audio endpoint uses cached models only; it never downloads during analysis. Each request loads the model into a new process. A readiness check verifies local dependencies and weight files before enabling the controls; results are cached for up to 30 seconds. No API key or paid service is required.

For a quick, lower-quality smoke test, set `CHORDLEAF_WHISPER_MODEL=tiny` when starting Vite. A local model directory is also supported. Larger models require more memory and time. A three-passage comparison of `small` and `medium` is recorded in the full-corpus report; it is not a general singing benchmark.

The UI accepts MP3, WAV, M4A, FLAC and OGG, up to 30 MiB and 10 minutes. The worker probes the audio contents with PyAV, converts to mono 16 kHz and limits decoded duration. Browser playback depends on the browser's codec support; analysis can support a format that the browser cannot play.

Listen using the interval buttons, edit the draft and create a song. **Download timing · JSON** preserves original word and chord intervals and engine names. The regular editable project currently saves only the text sheet: it does not embed audio or timing. The JSON includes a separate `draftText` copy of your corrections while preserving the original model intervals. It is an export, not yet a resumable review project. Interval buttons play only the selected interval; optional looping and the current-chord highlight help review it.

## Run the built app locally, offline

After the Python setup above, download Whisper once (this command receives no audio):

```sh
experiments/audio/.venv/bin/python -c 'from faster_whisper import WhisperModel; WhisperModel("small", device="cpu", compute_type="int8")'
pnpm build
pnpm start:local-audio
```

Open `http://127.0.0.1:3000` (override `PORT` if needed). The launcher forces loopback binding and cached-model-only transcription, and enables a Python audit guard against network connections. Missing models cause an error rather than an automatic download. `CHORDLEAF_AUDIO_PYTHON` can point to another installed environment; `CHORDLEAF_WHISPER_MODEL` can select a predownloaded model. Python's network guard is a regression safeguard, not an OS-level sandbox for native libraries.

Each user's own computer serves its UI and performs inference. There is **no central processing server**. This is a developer distribution, not a packaged desktop installer; it still requires Node and Python. Hosting the static site alone does not install or start these components on visitors' computers. Browser-only deployment needs a separate ONNX/WASM/WebGPU port; see the [local deployment report](../../docs/audio-local-production.es.md).

## What actually runs

- Lyrics: optional Qwen3-ASR 1.7B + forced alignment on Apple Silicon (see below), or `faster-whisper`, CPU/int8, word timestamps, no speech VAD (sustained sung vowels should not automatically be discarded by a speech gate). This is a speech-trained model used on singing, not a validated singing model.
- Default chords: the pretrained **lv-chordia 1.1.0** ensemble (five CNN/LSTM networks from Jiang et al., ISMIR 2019), with the `submission` dictionary: 301 labels including seventh/ninth/eleventh/thirteenth, suspended, diminished and augmented chords and selected inversions. These are vocabulary capabilities, not guarantees of correct detection. Original Harte labels remain in JSON as `rawLabel`. The application uses these pretrained weights; a separate newly trained research model underperformed and is not deployed.
- Optional baseline: our small signal-processing detector, available in the detector selector. Centered 256 ms FFT windows sampled every 100 ms, pitch-class energy, temporal smoothing, 24 major/minor templates and Viterbi continuity. A silence/similarity gate emits `N`. It assumes A4 = 440 Hz and does not infer sevenths, inversions, capo, key or guitar fingering.
- Alignment: both branches analyze the same decoded samples. Chord changes within a word snap to that word's start in the editable text. Instrumental changes remain separate chord-only lines. Exact source intervals are retained in JSON. Neither the baseline’s 100 ms sampling grid nor the neural model’s approximately 23 ms frame hop is a claim of equivalent recognition accuracy.
- The local endpoint accepts a single job at a time, checks loopback socket/Host and same-origin requests, enforces byte/duration limits, kills inference on cancellation or a 15-minute timeout, and removes temporary uploads. No audio is sent to a remote inference service. Explicit setup downloads still need network access. If lyric transcription fails after chord inference, the response preserves the chords with a `lyrics-failed` warning, so the user can add lyrics manually. Do not expose this development server publicly.

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

## Full-song corpus audit

`corpus.py` matches names ignoring accents/punctuation, records missing or ambiguous references, excludes PDFs without extracted text from scoring eligibility, and runs full-song neural inference with Python network connections blocked. Its outputs are **operational checks, not accuracy scores**. It preserves source hashes, errors and intervals and can resume existing results. Use a new output directory after changing models or inference code.

```sh
experiments/audio/.venv/bin/python experiments/audio/corpus.py \
  /absolute/path/to/MP3 artifacts/audio-benchmark/pdf-inventory.json \
  artifacts/audio-benchmark/full-corpus/results
```

`evaluate-passages.py` takes a manually reviewed manifest with `id`, `start`, `end`, `chords` and `split`; it compares only these passages, with a single transposition per passage, against saved full-song predictions. It keeps extensions, inversions and sequence gaps separate. Its optional short A–X–A smoothing variants are research comparisons, not enabled in the app. Partial sheets and alternate arrangements must not be silently expanded into training labels.

## Compare lyric models

`benchmark-lyrics.py` runs cached models with network connections blocked on explicit windows and manually reviewed text references. It reports token edit counts and latency, not a general accuracy claim. Install selected models first; its manifest contains local paths and should remain in ignored artifacts.

```sh
experiments/audio/.venv/bin/python experiments/audio/benchmark-lyrics.py \
  artifacts/audio-benchmark/full-corpus/lyrics-manifest.json \
  artifacts/audio-benchmark/full-corpus/lyrics-offline.json --models small medium
```

## Qwen, Parakeet and actual chord training (September 29)

The [measured comparison](../../docs/audio-model-comparison.es.md) covers four local ASR models and a newly trained chord network. Qwen3-ASR 1.7B performed best on this small bilingual lyric benchmark. The app supports it with Qwen3-ForcedAligner on Apple Silicon:

```sh
pnpm audio:setup qwen
pnpm build
pnpm start:local-audio
```

The optional `requirements-qwen.txt` dependencies extend the same Python environment. Setup downloads pinned model revisions; inference never downloads. The UI selects Qwen when ready, or Whisper otherwise. Approximate alignments group words without dropping text and retain raw alignment separately in JSON. Their temporal error has not yet been quantitatively evaluated.

To reproduce public research data acquisition (explicit network stage, evaluation recordings retain their individual licenses):

```sh
experiments/audio/.venv/bin/python experiments/audio/prepare-research.py jam artifacts/audio-benchmark/model-comparison
experiments/audio/.venv/bin/python experiments/audio/prepare-research.py guitarset artifacts/audio-benchmark/guitarset
experiments/audio/.venv/bin/python experiments/audio/prepare-research.py models artifacts/audio-benchmark/model-comparison
```

For the alternative ASR benchmark, create a separate Python 3.13 environment with the base audio requirements, `requirements-qwen.txt` and `parakeet-mlx==0.5.2`. For chord training, install `mir_eval==0.8.2` in the main research environment. Do not add research dependencies to the web bundle. Model paths come from the generated `models.json`; `small` selects the already cached Whisper model. Use an engine name of `whisper`, `parakeet`, `qwen06` or `qwen17`:

```sh
experiments/audio/.venv/bin/python experiments/audio/benchmark-asr.py \
  artifacts/audio-benchmark/model-comparison/jam-manifest.json whisper small \
  artifacts/audio-benchmark/reproduction/whisper
experiments/audio/.venv/bin/python experiments/audio/train-guitarset.py \
  artifacts/audio-benchmark/guitarset artifacts/audio-benchmark/reproduction/training
experiments/audio/.venv/bin/python experiments/audio/evaluate-guitarset.py \
  artifacts/audio-benchmark/guitarset artifacts/audio-benchmark/reproduction/training
```

Inference/training run with Python network connections blocked. The training split groups complete compositions, selects the checkpoint only on validation and scores a held-out split. The small trained network **underperformed LV-Chordia** and is not deployed. The exact root/quality metric covers only the representable annotation subset and excludes inversion scoring. Use a fresh output directory when changing features, annotations or models; cached intermediate results are deliberately reused.

## Conversión para navegador

La aplicación web ejecuta Qwen ASR 0,6B, ForcedAligner y las cinco redes LV-Chordia en un Worker. Consultar [descargas, pruebas reales y límites](../../docs/audio-browser-youtube.es.md). El detector conserva 301 estados de acordes y seis cabezas estructurales. La estimación de afinación y un banco CQT con 21 ajustes preceden a la inferencia. No es un detector reducido a mayor/menor.

Para reproducir la conversión, usar un entorno de investigación aislado con las dependencias neuronales y `requirements-browser-export.txt`:

```sh
python experiments/audio/download-browser-research.py
python experiments/audio/export-browser-chords.py
python experiments/audio/build-browser-catalog.py
python experiments/audio/prepare-browser-clips.py /ruta/local/a/los/MP3
python experiments/audio/benchmark-browser-chords.py
CHORDLEAF_AUDIO_RESEARCH=1 pnpm dev --host 127.0.0.1 --port 5190
```

La página `/experiments/browser-audio/` es una herramienta de desarrollo para comparar los tres fragmentos privados, no forma parte de la compilación pública. Los modelos de voz descargados, PCM, referencias y resultados quedan en `artifacts/browser-audio`, ignorado por Git. `prepare-browser-clips.py` requiere que estén disponibles los tres archivos nombrados en su lista; se puede adaptar esa lista para otras referencias. El middleware de investigación sólo sirve archivos estáticos y se activa explícitamente en desarrollo; la inferencia se hace en el navegador.

Los archivos de acordes distribuidos en `public/models/lv-chordia-web-v1` y su catálogo de integridad son datos públicos del modelo. No contienen canciones del usuario. Las pruebas automatizadas de navegador descargan esos pesos pequeños, calculan acordes reales en WASM y repiten sin conexión; no descargan los modelos de voz de unos 2 GB en CI.
