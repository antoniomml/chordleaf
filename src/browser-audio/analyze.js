import AnalysisWorker from "./analyze.worker.js?worker";
import { beginAudioDiagnostic } from "./diagnostics.js";

export async function analyzeBrowserAudio(file, options) {
  const diagnostic = beginAudioDiagnostic("analysis", {
    model: options.lyrics ? options.lyricsEngine : "chords",
    language: options.lyrics ? options.language : undefined,
    runtime:
      options.lyrics && options.lyricsEngine === "qwen" && options.gpu
        ? "gpu"
        : "cpu",
    bytes: file.size,
    mime: file.type,
  });
  let lastStage;
  try {
    const result = await analyze(file, {
      ...options,
      diagnostic,
      progress: (status) => {
        if (status.stage !== lastStage) {
          diagnostic.step(status.stage, status);
          lastStage = status.stage;
        }
        options.progress(status);
      },
    });
    diagnostic.finish("completed");
    return result;
  } catch (error) {
    diagnostic.finish(
      error.name === "AbortError" ? "cancelled" : "failed",
      error,
    );
    throw error;
  }
}

async function analyze(
  file,
  { signal, lyrics, language, gpu, progress, lyricsEngine, diagnostic },
) {
  signal.throwIfAborted();
  if (file.size > 30 * 1024 * 1024)
    throw new Error("El audio supera el límite de 30 MB.");
  progress({ stage: "Preparando el audio…", percent: 1 });
  // decodeAudioData resamples to its context's rate. Decode straight to the
  // chord rate rather than keeping stereo 44/48 kHz PCM plus two render copies.
  const context = new OfflineAudioContext(1, 1, 22050);
  let decoded;
  try {
    decoded = await context.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error("No se puede leer este audio. Prueba WAV o MP3.");
  }
  signal.throwIfAborted();
  if (decoded.duration < 1 || decoded.duration > 600)
    throw new Error("El audio debe durar entre 1 segundo y 10 minutos.");
  diagnostic.step("decoded", { duration: decoded.duration });
  const mono = decoded.getChannelData(0);
  const channels = decoded.numberOfChannels;
  for (let i = 0; i < mono.length; i++) mono[i] /= channels;
  for (let c = 1; c < channels; c++) {
    const values = decoded.getChannelData(c);
    for (let i = 0; i < values.length; i++) mono[i] += values[i] / channels;
  }
  const duration = decoded.duration,
    sampleRate = decoded.sampleRate;
  decoded = null;
  async function resample(rate) {
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(duration * rate),
      rate,
    );
    const buffer = offline.createBuffer(1, mono.length, sampleRate);
    buffer.copyToChannel(mono, 0);
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.connect(offline.destination);
    source.start();
    return (await offline.startRendering()).getChannelData(0);
  }
  const audio = lyrics ? await resample(16000) : null,
    harmony = mono;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new AnalysisWorker();
    let completed = false;
    let timeout;
    const watchdog = () => {
      clearTimeout(timeout);
      timeout = setTimeout(
        () =>
          finish(
            null,
            new Error(
              "El análisis lleva demasiado tiempo. Prueba un fragmento más corto o Whisper Base.",
            ),
          ),
        300000,
      );
    };
    const finish = (value, error) => {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      worker.terminate();
      error ? reject(error) : resolve(value);
    };
    const abort = () =>
      finish(null, new DOMException("Cancelado", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) return abort();
    worker.onerror = (event) => {
      diagnostic.step("worker-failed", {
        error: event.error || new Error(event.message),
      });
      finish(
        null,
        new Error(
          "No se pudo ejecutar el modelo. Prueba un fragmento más corto o libera memoria.",
        ),
      );
    };
    worker.onmessage = ({ data }) => {
      if (completed) return;
      watchdog();
      if (data.diagnostic) {
        diagnostic.step(data.stage || "lyrics-failed", {
          error: new Error(data.diagnostic),
        });
        console.warn("Local audio analysis failed:", data.diagnostic);
      }
      if (data.status) progress(data.status);
      if (data.error) finish(null, new Error(data.error));
      if (data.result) finish(data.result);
    };
    try {
      watchdog();
      diagnostic.step("worker-started");
      worker.postMessage(
        { audio, harmony, lyrics, language, gpu, lyricsEngine },
        [harmony.buffer, ...(audio ? [audio.buffer] : [])],
      );
    } catch (error) {
      finish(null, error);
    }
  });
}
