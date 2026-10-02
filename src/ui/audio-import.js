import { desktopDownloadURL } from "../desktop-release.js";
import { setupDesktopModels } from "./audio-desktop.js";
import { setupBrowserModels, browserAudioPreference } from "./audio-browser.js";
import { browserReadiness, browserHardware } from "../browser-audio/models.js";
import languages from "../audio-languages.json" with { type: "json" };
import { installedLyricModel, readAudioSettings } from "../audio-models.js";
import { t } from "../i18n.js";
import { analysisToText, validateAnalysis } from "../audio-import.js";

export function setupAudioImport({ accept, reportError }) {
  const $ = (id) => document.getElementById(id);
  // Bind specifically to an audio element; a generic .src sink could target
  // an executable element if the shell were accidentally changed.
  const player = document.querySelector("audio#audio-player");
  if (!(player instanceof HTMLAudioElement))
    throw new Error("Missing audio playback element");
  const desktopURL = desktopDownloadURL(
    import.meta.env.VITE_DESKTOP_DOWNLOAD_URL,
  );
  if (desktopURL) {
    $("audio-desktop-download").href = desktopURL;
    $("audio-desktop-download").hidden = false;
    $("audio-desktop-pending").hidden = true;
  }
  for (const [value, language] of Object.entries(languages)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = language.label;
    $("audio-language").append(option);
  }
  let lyricModel = "whisper";
  let controller,
    generation = 0,
    objectURL,
    readiness,
    modelsBusy = false,
    analysisRunning = false,
    analysisPercent = 0;
  const status = (message) => {
    if (message && typeof message === "object") {
      analysisPercent = Math.max(
        analysisPercent,
        Math.min(99, message.percent || 0),
      );
      $("audio-progress-stage").textContent = t(message.stage);
      $("audio-progress-percent").textContent =
        `${Math.floor(analysisPercent)} %`;
      $("audio-analysis-progress").value = analysisPercent;
      $("audio-status").textContent = "";
    } else {
      $("audio-status").textContent = t(message);
      if (analysisRunning) $("audio-progress-stage").textContent = t(message);
    }
  };
  function showAnalysis(value) {
    $("audio-progress-view").hidden = !value;
    $("audio-upload-controls").hidden = value;
    $("audio-analysis-actions").hidden = value;
    player.hidden = value || !objectURL;
    $("new-dialog").classList.toggle("is-analyzing-audio", value);
  }
  function updateAvailability() {
    const ready = readiness?.available && readiness.neural !== false;
    const file = $("audio-file").files[0];
    $("audio-analyze").disabled =
      !ready ||
      modelsBusy ||
      analysisRunning ||
      !file ||
      file.size > 30 * 1024 * 1024;
    $("audio-file").disabled = !ready || analysisRunning;
    $("audio-drop").setAttribute(
      "aria-disabled",
      String(!ready || analysisRunning),
    );
    $("audio-language").disabled =
      analysisRunning ||
      !$("audio-lyrics").checked ||
      $("audio-lyrics").disabled;
    $("audio-language-field").classList.toggle(
      "is-disabled",
      !$("audio-lyrics").checked,
    );
    $("audio-lyrics-option").classList.toggle(
      "is-disabled",
      $("audio-lyrics").disabled,
    );
    $("audio-lyrics-option").setAttribute(
      "aria-disabled",
      String($("audio-lyrics").disabled),
    );
    $("audio-drop").tabIndex = $("audio-file").disabled ? -1 : 0;
    $("audio-analyze").textContent = t(
      $("audio-lyrics").checked ? "Obtener letra y acordes" : "Obtener acordes",
    );
    const names = {
      qwen: window.chordleafDesktop ? t("Qwen 1,7B") : t("Qwen 0,6B"),
      whisper: window.chordleafDesktop ? "Whisper Small" : "Whisper Base",
      "whisper-small": "Whisper Small",
      "whisper-turbo": "Whisper Large v3 Turbo",
    };
    $("audio-model-name").textContent = $("audio-lyrics").checked
      ? `${names[lyricModel]} · LV-Chordia`
      : "LV-Chordia";
  }
  $("audio-lyrics").onchange = updateAvailability;
  const lyricsUnavailable = () =>
    readiness?.lyrics === false && !readiness?.qwen;
  const desktopModels = (
    window.chordleafDesktop ? setupDesktopModels : setupBrowserModels
  )(
    () => open(true),
    (busy) => {
      modelsBusy = busy;
      updateAvailability();
    },
  );
  function reset() {
    analysisRunning = false;
    showAnalysis(false);
    desktopModels.close();
    desktopModels.setAnalyzing(false);
    generation++;
    controller?.abort();
    window.chordleafDesktop?.cancelAnalysis().catch(() => {});
    player.pause();
    player.removeAttribute("src");
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = null;
    readiness = null;
    $("audio-capabilities").textContent = "";
    $("audio-capabilities").hidden = true;
    $("audio-upload-controls").hidden = false;
    $("audio-analysis-actions").hidden = false;
    $("audio-file-name").textContent = t("Elige una grabación");
    $("audio-file").value = "";
    player.hidden = true;
    $("audio-analyze").disabled = true;
    $("audio-cancel").hidden = true;
    $("audio-file").disabled = false;
    $("audio-language").disabled = false;
    $("audio-lyrics").disabled = false;
    status("");
  }
  async function open(refreshOnly = false) {
    if (!refreshOnly) desktopModels.open();
    const current = generation;
    controller = new AbortController();
    status("Comprobando el analizador local…");
    try {
      const data = window.chordleafDesktop
        ? await fetch("/api/audio-import", { signal: controller.signal }).then(
            (r) => (r.ok ? r.json() : null),
          )
        : await browserReadiness();
      if (current !== generation) return;
      const hadNoLyrics = readiness?.lyrics === false && !readiness?.qwen;
      readiness = data;
      $("audio-setup").hidden = true;
      const missingChords = data?.available && data.neural === false;
      $("audio-capabilities").hidden = !missingChords;
      $("audio-capabilities").textContent = missingChords
        ? t(
            "El modelo de acordes no está disponible. Revisa la instalación local.",
          )
        : "";
      lyricModel = window.chordleafDesktop
        ? installedLyricModel(data, readAudioSettings().model)
        : installedLyricModel(data, browserAudioPreference());
      $("audio-model-name").dataset.model = lyricModel;
      $("audio-lyrics").disabled = lyricsUnavailable();
      if (
        window.chordleafDesktop &&
        (hadNoLyrics || !refreshOnly) &&
        !lyricsUnavailable()
      )
        $("audio-lyrics").checked = readAudioSettings().model !== "none";
      if (
        lyricsUnavailable() ||
        (window.chordleafDesktop && readAudioSettings().model === "none")
      )
        $("audio-lyrics").checked = false;
      desktopModels.configure(data);
      status(
        data?.available
          ? ""
          : window.chordleafDesktop
            ? "El analizador local no está activado."
            : "",
      );
      updateAvailability();
    } catch (error) {
      if (current !== generation || error.name === "AbortError") return;
      $("audio-setup").hidden = Boolean(window.chordleafDesktop);
      $("audio-file").disabled = true;
      status("El analizador local no está activado.");
    }
  }
  $("audio-file").onchange = () => {
    $("import-error").hidden = true;
    player.pause();
    player.removeAttribute("src");
    player.hidden = true;
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = null;
    const file = $("audio-file").files[0];
    updateAvailability();
    if (!file) return;
    if (file.size > 30 * 1024 * 1024)
      return reportError(new Error("El audio supera el límite de 30 MB."));
    $("audio-file-name").textContent = file.name;
    objectURL = URL.createObjectURL(file);
    if (!objectURL.startsWith("blob:"))
      throw new Error("Playback requires a local blob URL");
    player.src = encodeURI(objectURL);
    player.hidden = false;
    status("");
  };
  const drop = $("audio-drop");
  drop.onclick = (event) => {
    if (event.target !== $("audio-file") && !$("audio-file").disabled)
      $("audio-file").click();
  };
  drop.onkeydown = (event) => {
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!$("audio-file").disabled) $("audio-file").click();
    }
  };
  drop.ondragover = (event) => {
    event.preventDefault();
    if (!$("audio-file").disabled) drop.classList.add("is-dragging");
  };
  drop.ondragleave = () => drop.classList.remove("is-dragging");
  drop.ondrop = (event) => {
    event.preventDefault();
    drop.classList.remove("is-dragging");
    if ($("audio-file").disabled || !event.dataTransfer?.files.length) return;
    const transfer = new DataTransfer();
    transfer.items.add(event.dataTransfer.files[0]);
    $("audio-file").files = transfer.files;
    $("audio-file").dispatchEvent(new Event("change"));
  };
  $("audio-cancel").onclick = () => {
    analysisRunning = false;
    showAnalysis(false);
    generation++;
    controller?.abort();
    window.chordleafDesktop?.cancelAnalysis().catch(() => {});
    $("audio-file").disabled = false;
    $("audio-cancel").hidden = true;
    $("audio-language").disabled = false;
    $("audio-lyrics").disabled = lyricsUnavailable();
    desktopModels.setAnalyzing(false);
    updateAvailability();
    status("Análisis cancelado.");
  };
  $("audio-analyze").onclick = async () => {
    const file = $("audio-file").files[0];
    if (!file) return;
    controller?.abort();
    await window.chordleafDesktop?.cancelAnalysis().catch(() => {});
    controller = new AbortController();
    const current = ++generation;
    analysisRunning = true;
    analysisPercent = 0;
    player.pause();
    showAnalysis(true);
    $("audio-progress-file").textContent = file.name;
    $("audio-analysis-progress").removeAttribute("value");
    $("audio-progress-percent").textContent = "";
    desktopModels.setAnalyzing(true);
    $("import-error").hidden = true;
    $("audio-analyze").disabled = true;
    $("audio-file").disabled = true;
    $("audio-cancel").hidden = false;
    $("audio-cancel").focus();
    for (const id of ["audio-lyrics", "audio-language"]) $(id).disabled = true;
    updateAvailability();
    status("Preparando el audio…");
    try {
      let analysis;
      if (!window.chordleafDesktop) {
        const { analyzeBrowserAudio } =
          await import("../browser-audio/analyze.js");
        analysis = await analyzeBrowserAudio(file, {
          signal: controller.signal,
          lyrics: $("audio-lyrics").checked,
          lyricsEngine: lyricModel,
          language: $("audio-language").value,
          gpu: (await browserHardware()).gpu,
          progress: status,
        });
      } else {
        status(
          $("audio-lyrics").checked
            ? "Obteniendo letra y acordes…"
            : "Detectando acordes…",
        );
        const query = new URLSearchParams({
          engine: "neural",
          lyrics: String($("audio-lyrics").checked),
          lyricsEngine: lyricModel,
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
            throw new Error(
              "Ya hay un análisis en curso. Espera unos segundos.",
            );
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
        analysis = await response.json();
      }
      const data = validateAnalysis(analysis);
      if (current !== generation) return;
      const text = analysisToText(data);
      if (!text.trim())
        throw new Error(
          "No se han detectado letra ni acordes. Prueba otra grabación.",
        );
      const notices = {
        "lyrics-failed":
          "No se pudo obtener la letra. Puedes añadirla en el editor.",
        "lyrics-partial":
          "Hay tramos de letra incompletos. Puedes corregirlos en el editor.",
        "alignment-approximate":
          "Algunos tiempos son aproximados. Revisa la posición de los acordes.",
      };
      status({ stage: "Abriendo la canción…", percent: 98 });
      await accept(
        {
          title: file.name.replace(/\.[^.]+$/, ""),
          text,
          notice: (data.warnings || [])
            .map((warning) => t(notices[warning] || ""))
            .filter(Boolean)
            .join(" "),
        },
        { signal: controller.signal },
      );
    } catch (error) {
      if (current === generation && error.name !== "AbortError") {
        status("El análisis no se ha completado.");
        reportError(error);
      }
    } finally {
      if (current === generation) {
        analysisRunning = false;
        showAnalysis(false);
        desktopModels.setAnalyzing(false);
        $("audio-cancel").hidden = true;
        $("audio-language").disabled = false;
        $("audio-lyrics").disabled = lyricsUnavailable();
        updateAvailability();
      }
    }
  };
  return { reset, open };
}
