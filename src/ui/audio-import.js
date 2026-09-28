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
    result,
    readiness,
    playbackRange;
  const status = (message) => {
    $("audio-status").textContent = t(message);
  };
  function updateAvailability() {
    const ready =
      readiness?.available &&
      ($("audio-engine").value !== "neural" || readiness.neural !== false);
    const file = $("audio-file").files[0];
    $("audio-analyze").disabled =
      !ready || !file || file.size > 30 * 1024 * 1024;
    $("audio-file").disabled = !readiness?.available;
  }
  $("audio-engine").onchange = updateAvailability;
  const lyricsUnavailable = () =>
    readiness?.lyrics === false && !readiness?.qwen;
  function reset() {
    generation++;
    playbackRange = null;
    controller?.abort();
    $("audio-player").pause();
    $("audio-player").removeAttribute("src");
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = null;
    result = null;
    readiness = null;
    $("audio-capabilities").textContent = "";
    $("audio-warning").hidden = true;
    $("audio-file").value = "";
    $("audio-result").hidden = true;
    $("audio-player").hidden = true;
    $("audio-analyze").disabled = true;
    $("audio-cancel").hidden = true;
    $("audio-file").disabled = false;
    $("audio-create").disabled = false;
    $("audio-timeline").replaceChildren();
    $("audio-engine").disabled = false;
    $("audio-language").disabled = false;
    $("audio-lyrics-engine").disabled = false;
    $("audio-lyrics").disabled = false;
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
      readiness = data;
      $("audio-setup").hidden = Boolean(
        data?.available &&
        data.neural !== false &&
        (data.lyrics !== false || data.qwen),
      );
      const messages = [];
      if (data?.neural === false)
        messages.push(
          t("Falta el modelo de acordes. Puedes elegir el detector básico."),
        );
      if (lyricsUnavailable())
        messages.push(
          t(
            "No hay un transcriptor instalado en este equipo. Puedes analizar sólo los acordes.",
          ),
        );
      $("audio-capabilities").textContent = messages.join(" ");
      $("audio-lyrics-engine").querySelector('[value="qwen"]').disabled =
        !data?.qwen;
      $("audio-lyrics-engine").querySelector('[value="whisper"]').disabled =
        data?.lyrics === false;
      $("audio-lyrics-engine").value = data?.qwen ? "qwen" : "whisper";
      $("audio-lyrics").disabled = lyricsUnavailable();
      if (lyricsUnavailable()) $("audio-lyrics").checked = false;
      status(
        data?.available
          ? "Analizador local disponible."
          : "El analizador local no está activado.",
      );
      updateAvailability();
    } catch (error) {
      if (current !== generation || error.name === "AbortError") return;
      $("audio-setup").hidden = false;
      $("audio-file").disabled = true;
      status("El analizador local no está activado.");
    }
  }
  $("audio-file").onchange = () => {
    result = null;
    playbackRange = null;
    $("audio-result").hidden = true;
    $("import-error").hidden = true;
    $("audio-player").pause();
    $("audio-player").removeAttribute("src");
    $("audio-player").hidden = true;
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = null;
    const file = $("audio-file").files[0];
    updateAvailability();
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
    updateAvailability();
    $("audio-cancel").hidden = true;
    $("audio-engine").disabled = false;
    $("audio-language").disabled = false;
    $("audio-lyrics-engine").disabled = false;
    $("audio-lyrics").disabled = lyricsUnavailable();
    status("Análisis cancelado.");
  };
  $("audio-analyze").onclick = async () => {
    const file = $("audio-file").files[0];
    if (!file) return;
    controller?.abort();
    controller = new AbortController();
    const current = ++generation;
    result = null;
    playbackRange = null;
    $("audio-result").hidden = true;
    $("import-error").hidden = true;
    $("audio-analyze").disabled = true;
    $("audio-file").disabled = true;
    $("audio-cancel").hidden = false;
    for (const id of [
      "audio-engine",
      "audio-lyrics",
      "audio-language",
      "audio-lyrics-engine",
    ])
      $(id).disabled = true;
    status(
      "Analizando en tu equipo… El audio no se envía a servicios externos.",
    );
    try {
      const query = new URLSearchParams({
        engine: $("audio-engine").value,
        lyrics: String($("audio-lyrics").checked),
        lyricsEngine: $("audio-lyrics-engine").value,
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
        const body = await response.json().catch(() => ({}));
        const messages = {
          duration: "El audio debe durar entre 1 segundo y 10 minutos.",
          decode:
            "No se puede leer este audio. Prueba a convertirlo a WAV o MP3.",
          timeout:
            "El análisis ha superado el tiempo máximo. Prueba un fragmento más corto.",
          size: "El audio supera el límite de 30 MB.",
        };
        throw new Error(
          messages[body.error] ||
            "No se pudo analizar. Comprueba el formato, la duración y la instalación local.",
        );
      }
      const data = validateAnalysis(await response.json());
      if (current !== generation) return;
      result = data;
      $("audio-warning").hidden = !data.warnings?.includes("lyrics-failed");
      $("audio-timing-warning").hidden = !data.warnings?.includes(
        "alignment-approximate",
      );
      $("audio-engine-used").textContent = [
        data.engines?.chords,
        data.engines?.lyrics,
      ]
        .filter(Boolean)
        .join(" · ");
      $("audio-draft").value = analysisToText(data);
      $("audio-timeline").replaceChildren();
      for (const chord of data.chords) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${formatAudioTime(chord.start)}–${formatAudioTime(chord.end)} · ${chord.label === "N" ? t("Sin acorde") : chord.label}`;
        button.onclick = () => {
          playbackRange = chord;
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
        updateAvailability();
        $("audio-cancel").hidden = true;
        $("audio-engine").disabled = false;
        $("audio-language").disabled = false;
        $("audio-lyrics-engine").disabled = false;
        $("audio-lyrics").disabled = lyricsUnavailable();
      }
    }
  };
  $("audio-player").ontimeupdate = () => {
    const player = $("audio-player");
    if (playbackRange && player.currentTime >= playbackRange.end) {
      if ($("audio-loop").checked) player.currentTime = playbackRange.start;
      else {
        player.pause();
        playbackRange = null;
      }
    }
    if (playbackRange && player.currentTime < playbackRange.start - 0.1)
      playbackRange = null;
    if (!result) return;
    [...$("audio-timeline").children].forEach((button, index) => {
      const chord = result.chords[index];
      if (player.currentTime >= chord.start && player.currentTime < chord.end)
        button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
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
      new Blob(
        [
          JSON.stringify(
            { ...result, draftText: $("audio-draft").value },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "audio-analysis.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return { reset, open };
}
