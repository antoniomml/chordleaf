import { t } from "./i18n.js";
/** The bounded search runs off the UI thread and always releases its worker. */
export function fitSong(song) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./fit-worker.js", import.meta.url), {
      type: "module",
    });
    const finish = (result, error) => {
      clearTimeout(timeout);
      worker.terminate();
      if (error)
        reject(
          new Error(
            t(
              "No se pudo ajustar la canción. Prueba con los controles del documento.",
            ),
          ),
        );
      else resolve(result);
    };
    const timeout = setTimeout(() => finish(null, true), 10000);
    worker.onmessage = ({ data }) => finish(data);
    worker.onerror = () => finish(null, true);
    worker.postMessage(song);
  });
}
