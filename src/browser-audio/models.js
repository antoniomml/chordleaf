import catalog from "./catalog.json" with { type: "json" };
import { runtimeURLs } from "./runtime.js";
import { whisperModels, browserLyricModels } from "./lyric-models.js";

export const MODEL_CACHE = "chordleaf-audio-models-v1";
export const bundles = {
  chords: ["chords"],
  ...Object.fromEntries(
    Object.keys(whisperModels).map((name) => [name, ["chords", name]]),
  ),
  qwen: ["chords", "qwen", "aligner"],
};
export const bundleBytes = (bundle) =>
  bundles[bundle].flatMap((k) => catalog[k]).reduce((s, f) => s + f.bytes, 0);
const resources = (bundle) => [
  ...bundles[bundle].flatMap((k) => catalog[k]),
  ...Object.values(runtimeURLs).map((url) => ({ url })),
];
const absolute = (url) => new URL(url, self.location.origin).href;
export async function browserHardware() {
  const adapter = await navigator.gpu?.requestAdapter().catch(() => null);
  return {
    gpu: Boolean(adapter?.features.has("shader-f16")),
    memory: navigator.deviceMemory || null,
    cores: navigator.hardwareConcurrency || null,
    mobile:
      navigator.userAgentData?.mobile === true ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "") ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
  };
}
export async function browserReadiness() {
  if (!self.caches || !self.isSecureContext)
    return { available: false, neural: false, qwen: false };
  const cache = await caches.open(MODEL_CACHE);
  const cached = new Map();
  const allFiles = new Map(
    Object.keys(bundles)
      .flatMap(resources)
      .map((file) => [file.url, file]),
  );
  for (const file of allFiles.values())
    cached.set(file.url, Boolean(await cache.match(absolute(file.url))));
  const installed = (bundle) =>
    resources(bundle).every((file) => cached.get(file.url));
  const hasFiles = (modelNames) =>
    modelNames.some((name) =>
      catalog[name].some((file) => cached.get(file.url)),
    );
  const missingBytes = (bundle) =>
    resources(bundle).reduce(
      (sum, file) => sum + (cached.get(file.url) ? 0 : file.bytes || 0),
      0,
    );
  const voiceInstalled = (names) =>
    names.every((name) => catalog[name].every((file) => cached.get(file.url)));
  const neural = installed("chords");
  const qwenDownloaded = installed("qwen");
  const lyricModels = Object.fromEntries(
    browserLyricModels.map((name) => [name, installed(name)]),
  );
  return {
    available: neural,
    neural,
    lyrics: Object.keys(whisperModels).some((name) => lyricModels[name]),
    ...lyricModels,
    modelDownloads: lyricModels,
    voiceDownloads: Object.fromEntries(
      browserLyricModels.map((name) => [
        name,
        voiceInstalled(name === "qwen" ? ["qwen", "aligner"] : [name]),
      ]),
    ),
    modelFiles: Object.fromEntries(
      browserLyricModels.map((name) => [
        name,
        hasFiles(name === "qwen" ? ["qwen", "aligner"] : [name]),
      ]),
    ),
    whisper: installed("whisper"),
    whisperDownloaded: installed("whisper"),
    hasWhisperFiles: hasFiles(["whisper"]),
    qwen: qwenDownloaded && (await browserHardware()).gpu,
    qwenDownloaded,
    qwenVoiceDownloaded: voiceInstalled(["qwen", "aligner"]),
    whisperVoiceDownloaded: voiceInstalled(["whisper"]),
    runtimeDownloaded: Object.values(runtimeURLs).every((url) =>
      cached.get(url),
    ),
    hasQwenFiles: hasFiles(["qwen", "aligner"]),
    hasChordFiles: hasFiles(["chords"]),
    missingBytes: Object.fromEntries(
      Object.keys(bundles).map((name) => [name, missingBytes(name)]),
    ),
  };
}
export async function downloadBrowserModels(bundle, signal, progress) {
  if (!bundles[bundle]) throw new Error("Unknown browser model");
  const cache = await caches.open(MODEL_CACHE),
    files = resources(bundle);
  const missing = [];
  for (const file of files)
    if (!(await cache.match(absolute(file.url)))) missing.push(file);
  const required = missing.reduce((s, f) => s + (f.bytes || 25000000), 0);
  // Quota estimates can be conservative and do not measure free disk space.
  // Attempt the write; reject only an actual storage failure, keeping the
  // files already verified so retries download just the missing resources.
  let completed = 0;
  for (const file of missing) {
    signal.throwIfAborted();
    // Public weights only. Audio and transcripts never enter this function.
    let response;
    try {
      response = await fetch(absolute(file.url), {
        signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw new Error("No se pudo descargar el modelo. Comprueba la conexión.");
    }
    if (!response.ok)
      throw new Error("No se pudo descargar el modelo. Comprueba la conexión.");
    const reader = response.body.getReader(),
      parts = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      signal.throwIfAborted();
      parts.push(value);
      bytes += value.length;
      if (file.bytes && bytes > file.bytes) {
        await reader.cancel();
        throw new Error("Tamaño de modelo incorrecto");
      }
      progress(Math.min(1, (completed + bytes) / Math.max(required, 1)));
    }
    const blob = new Blob(parts),
      buffer = await blob.arrayBuffer();
    if (file.bytes && bytes !== file.bytes)
      throw new Error("Descarga incompleta");
    if (file.sha256) {
      const hash = [
        ...new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
      ]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      if (hash !== file.sha256)
        throw new Error(
          "El modelo descargado no coincide con la versión verificada.",
        );
    }
    signal.throwIfAborted();
    try {
      await cache.put(
        absolute(file.url),
        new Response(blob, {
          headers: {
            "Content-Type": file.url.endsWith(".wasm")
              ? "application/wasm"
              : file.url.endsWith(".mjs")
                ? "text/javascript"
                : "application/octet-stream",
          },
        }),
      );
    } catch (error) {
      if (error.name !== "QuotaExceededError")
        throw new Error(
          "No se pudo guardar el modelo en este navegador. Prueba fuera de la navegación privada o elige un modelo más ligero.",
        );
      throw new Error(
        "Este navegador ha alcanzado su límite de almacenamiento para Chordleaf. Los modelos ya guardados se conservan. Puedes reintentar, liberar datos de sitios en sus ajustes o usar otro navegador.",
      );
    }
    completed += bytes;
  }
  progress(1);
}
export async function readBrowserModel(model, filename, type) {
  const file = catalog[model]?.find((f) => f.name === filename);
  if (!file) throw new Error("Unknown model resource");
  const response = await (
    await caches.open(MODEL_CACHE)
  ).match(absolute(file.url));
  if (!response)
    throw new Error(
      "Falta un modelo local. Abre Modelos y ajustes para descargarlo.",
    );
  return type === "json" ? response.json() : response.arrayBuffer();
}
export async function removeBrowserModels(bundle) {
  if (!bundle) return caches.delete(MODEL_CACHE);
  const names =
    bundle === "qwen"
      ? ["qwen", "aligner"]
      : whisperModels[bundle]
        ? [bundle]
        : bundle === "chords"
          ? ["chords"]
          : null;
  if (!names) throw new Error("Unknown browser model");
  const cache = await caches.open(MODEL_CACHE);
  for (const name of names)
    for (const file of catalog[name]) await cache.delete(absolute(file.url));
}
