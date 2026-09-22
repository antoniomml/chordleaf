import { t } from "./i18n.js";
/** The bounded search runs off the UI thread and always releases its worker. */
export function fitSong(song, { signal } = {}) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./fit-worker.js", import.meta.url), {
      type: "module",
    });
    const finish = (result, error) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
      if (signal?.aborted) reject(signal.reason);
      else if (error)
        reject(
          new Error(
            t(
              "No se pudo ajustar la canción. Prueba con los controles del documento.",
            ),
          ),
        );
      else resolve(result);
    };
    const abort = () => finish(null, true);
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(() => finish(null, true), 10000);
    worker.onmessage = ({ data }) => finish(data);
    worker.onerror = () => finish(null, true);
    worker.postMessage(song);
  });
}
