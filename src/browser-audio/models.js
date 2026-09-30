import catalog from "./catalog.json" with { type: "json" };
import { runtimeURLs } from "./runtime.js";

export const MODEL_CACHE = "chordleaf-audio-models-v1";
export const bundles = {
  chords: ["chords"],
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
  };
}
export async function browserReadiness() {
  if (!self.caches || !self.isSecureContext)
    return { available: false, neural: false, qwen: false };
  const cache = await caches.open(MODEL_CACHE);
  const cached = new Map();
  for (const file of resources("qwen"))
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
  const neural = installed("chords");
  const qwenDownloaded = installed("qwen");
  return {
    available: neural,
    neural,
    lyrics: false,
    qwen: qwenDownloaded && (await browserHardware()).gpu,
    qwenDownloaded,
    runtimeDownloaded: Object.values(runtimeURLs).every((url) =>
      cached.get(url),
    ),
    hasQwenFiles: hasFiles(["qwen", "aligner"]),
    hasChordFiles: hasFiles(["chords"]),
    missingBytes: {
      qwen: missingBytes("qwen"),
      chords: missingBytes("chords"),
    },
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
  const storage = await navigator.storage?.estimate();
  if (storage?.quota && storage.quota - storage.usage < required * 1.2)
    throw new Error(
      "No hay suficiente espacio en el navegador. Libera unos 3 GB y reintenta.",
    );
  let completed = 0;
  for (const file of missing) {
    signal.throwIfAborted();
    // Public weights only. Audio and transcripts never enter this function.
    const response = await fetch(absolute(file.url), {
      signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
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
      : bundle === "chords"
        ? ["chords"]
        : null;
  if (!names) throw new Error("Unknown browser model");
  const cache = await caches.open(MODEL_CACHE);
  for (const name of names)
    for (const file of catalog[name]) await cache.delete(absolute(file.url));
}
