import { t } from "./i18n.js";

/** Terminate parsing on cancellation or timeout, even when the decoder is busy. */
export function decodeDocx(buffer, { signal } = {}) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./docx-worker.js", import.meta.url), {
      type: "module",
    });
    const finish = (value, error) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
      if (error) reject(error);
      else resolve(value);
    };
    const abort = () => finish(null, signal.reason);
    const timer = setTimeout(
      () =>
        finish(
          null,
          new Error(
            t(
              "La importación ha tardado demasiado. Prueba con TXT o un documento más sencillo.",
            ),
          ),
        ),
      15000,
    );
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({ data }) =>
      data.error ? finish(null, new Error(t(data.error))) : finish(data.html);
    worker.onerror = () =>
      finish(null, new Error(t("No se pudo leer el documento Word.")));
    worker.postMessage(buffer, [buffer]);
  });
}
