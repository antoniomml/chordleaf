import { t } from "../i18n.js";
import {
  analysisToText,
  validateAnalysis,
  formatAudioTime,
} from "../audio-import.js";

export function setupAudioImport({ accept, reportError }) {
  const $ = (id) => document.getElementById(id);
  let controller,
    generation = 0,
    objectURL,
    result;
  const status = (message) => {
    $("audio-status").textContent = t(message);
  };
  function reset() {
    generation++;
    controller?.abort();
    $("audio-player").pause();
    $("audio-player").removeAttribute("src");
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = null;
    result = null;
    $("audio-file").value = "";
    $("audio-result").hidden = true;
    $("audio-player").hidden = true;
    $("audio-analyze").disabled = true;
    $("audio-cancel").hidden = true;
    $("audio-file").disabled = false;
    $("audio-create").disabled = false;
    $("audio-timeline").replaceChildren();
    status("");
  }
  async function open() {
    const current = generation;
    controller = new AbortController();
    status("Comprobando el analizador local…");
    try {
      const response = await fetch("/api/audio-import", {
        signal: controller.signal,
      });
      const data = response.ok && (await response.json());
      if (current !== generation) return;
      $("audio-setup").hidden = Boolean(data?.available);
      status(
        data?.available
          ? "Analizador local disponible."
          : "El analizador local no está activado.",
      );
      $("audio-analyze").disabled =
        !data?.available || !$("audio-file").files.length;
      $("audio-file").disabled = !data?.available;
    } catch (error) {
      if (current !== generation || error.name === "AbortError") return;
      $("audio-setup").hidden = false;
      $("audio-file").disabled = true;
      status("El analizador local no está activado.");
    }
  }
  $("audio-file").onchange = () => {
    result = null;
    $("audio-result").hidden = true;
    $("import-error").hidden = true;
    $("audio-player").pause();
    $("audio-player").removeAttribute("src");
    $("audio-player").hidden = true;
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = null;
    const file = $("audio-file").files[0];
    $("audio-analyze").disabled = !file || file.size > 30 * 1024 * 1024;
    if (!file) return;
    if (file.size > 30 * 1024 * 1024)
      return reportError(new Error("El audio supera el límite de 30 MB."));
    objectURL = URL.createObjectURL(file);
    $("audio-player").src = objectURL;
    $("audio-player").hidden = false;
    status("Listo para analizar. Máximo 10 minutos.");
  };
  $("audio-cancel").onclick = () => {
    generation++;
    controller?.abort();
    $("audio-file").disabled = false;
    $("audio-analyze").disabled = !$("audio-file").files.length;
    $("audio-cancel").hidden = true;
    status("Análisis cancelado.");
  };
  $("audio-analyze").onclick = async () => {
    const file = $("audio-file").files[0];
    if (!file) return;
    controller?.abort();
    controller = new AbortController();
    const current = ++generation;
    result = null;
    $("audio-result").hidden = true;
    $("import-error").hidden = true;
    $("audio-analyze").disabled = true;
    $("audio-file").disabled = true;
    $("audio-cancel").hidden = false;
    status(
      "Analizando audio… La primera vez se descarga Whisper; puede tardar varios minutos.",
    );
    try {
      const query = new URLSearchParams({
        engine: $("audio-engine").value,
        lyrics: String($("audio-lyrics").checked),
        language: $("audio-language").value,
      });
      const response = await fetch(`/api/audio-import?${query}`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": "application/octet-stream" },
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 409)
          throw new Error("Ya hay un análisis en curso. Espera unos segundos.");
        throw new Error(
          "No se pudo analizar. Comprueba el formato, la duración y la instalación local.",
        );
      }
      const data = validateAnalysis(await response.json());
      if (current !== generation) return;
      result = data;
      $("audio-engine-used").textContent = data.engines?.chords || "";
      $("audio-draft").value = analysisToText(data);
      $("audio-timeline").replaceChildren();
      for (const chord of data.chords) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${formatAudioTime(chord.start)}–${formatAudioTime(chord.end)} · ${chord.label === "N" ? t("Sin acorde") : chord.label}`;
        button.onclick = () => {
          $("audio-player").currentTime = chord.start;
          $("audio-player")
            .play()
            .catch(() => {});
        };
        $("audio-timeline").append(button);
      }
      $("audio-result").hidden = false;
      status(
        data.words.length
          ? "Borrador listo. Escucha y corrige antes de crear la canción."
          : "Sin letra transcrita. Puedes revisar los acordes y añadir la letra.",
      );
    } catch (error) {
      if (current === generation && error.name !== "AbortError") {
        status("El análisis no se ha completado.");
        reportError(error);
      }
    } finally {
      if (current === generation) {
        $("audio-analyze").disabled = false;
        $("audio-file").disabled = false;
        $("audio-cancel").hidden = true;
      }
    }
  };
  $("audio-create").onclick = async () => {
    const text = $("audio-draft").value.trim();
    if (!result || !text)
      return reportError(
        new Error("Añade letra o acordes antes de crear la canción."),
      );
    $("audio-create").disabled = true;
    try {
      await accept({
        title: $("audio-file").files[0].name.replace(/\.[^.]+$/, ""),
        text,
      });
    } catch (error) {
      reportError(error);
    } finally {
      $("audio-create").disabled = false;
    }
  };
  $("audio-download").onclick = () => {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "audio-analysis.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return { reset, open };
}
