import AnalysisWorker from "./analyze.worker.js?worker";

export async function analyzeBrowserAudio(
  file,
  { signal, lyrics, language, gpu, progress },
) {
  signal.throwIfAborted();
  if (file.size > 30 * 1024 * 1024)
    throw new Error("El audio supera el límite de 30 MB.");
  progress("Leyendo el audio en tu navegador…");
  const context = new AudioContext();
  let decoded;
  try {
    decoded = await context.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error("No se puede leer este audio. Prueba WAV o MP3.");
  } finally {
    await context.close();
  }
  signal.throwIfAborted();
  if (decoded.duration < 1 || decoded.duration > 600)
    throw new Error("El audio debe durar entre 1 segundo y 10 minutos.");
  const mono = new Float32Array(decoded.length);
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const values = decoded.getChannelData(c);
    for (let i = 0; i < values.length; i++)
      mono[i] += values[i] / decoded.numberOfChannels;
  }
  async function resample(rate) {
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * rate),
      rate,
    );
    const buffer = offline.createBuffer(1, mono.length, decoded.sampleRate);
    buffer.copyToChannel(mono, 0);
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.connect(offline.destination);
    source.start();
    return (await offline.startRendering()).getChannelData(0);
  }
  const audio = await resample(16000),
    harmony = await resample(22050);
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new AnalysisWorker();
    const finish = (value, error) => {
      signal.removeEventListener("abort", abort);
      worker.terminate();
      error ? reject(error) : resolve(value);
    };
    const abort = () =>
      finish(null, new DOMException("Cancelado", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = () =>
      finish(
        null,
        new Error(
          "No se pudo ejecutar el modelo. Prueba un fragmento más corto o libera memoria.",
        ),
      );
    worker.onmessage = ({ data }) => {
      if (data.status) progress(data.status);
      if (data.error) finish(null, new Error(data.error));
      if (data.result) finish(data.result);
    };
    worker.postMessage({ audio, harmony, lyrics, language, gpu }, [
      audio.buffer,
      harmony.buffer,
    ]);
  });
}
