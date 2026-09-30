import { t } from "../i18n.js";
import {
  recommendedLyricModel,
  readAudioSettings,
  saveAudioSettings,
} from "../audio-models.js";

export function setupDesktopModels(refresh, busyChanged) {
  const bridge = window.chordleafDesktop;
  const $ = (id) => document.getElementById(id);
  if (!bridge)
    return { open() {}, close() {}, configure() {}, setAnalyzing() {} };
  const dialog = $("audio-model-dialog");
  $("audio-model-settings").hidden = false;
  let timer,
    generation = 0,
    previousActive = false,
    analyzing = false,
    checking = false,
    lastState = { stage: "idle" },
    readiness = {},
    settings = readAudioSettings(),
    selected,
    system;
  const hardware = Promise.resolve()
    .then(() => bridge.system?.())
    .catch(() => null);
  const radios = [...dialog.querySelectorAll('[name="audio-model"]')];
  const installed = (model) =>
    model === "qwen" ? Boolean(readiness.qwen) : Boolean(readiness.lyrics);
  function render(state = lastState) {
    lastState = state;
    const busy = Boolean(state.active || analyzing || checking);
    busyChanged(Boolean(state.active || checking));
    $("audio-model-settings").textContent = t(
      state.active ? "Descargando modelo…" : "Modelos y ajustes",
    );
    const messages = {
      idle: "",
      download: "Descargando… Puedes continuar más tarde.",
      complete: "Modelo listo. Continúa para importar tu canción.",
      cancelled: "Descarga pausada. Puedes reintentar cuando quieras.",
      error:
        state.error === "space"
          ? "Necesitas al menos 6 GB libres. Libera espacio y reintenta."
          : "No se pudo descargar. Comprueba la conexión y reintenta.",
    };
    const status = $("audio-model-status");
    const message = t(
      checking ? "Comprobando la instalación…" : messages[state.stage] || "",
    );
    if (status.textContent !== message) status.textContent = message;
    status.hidden = !status.textContent;
    status.classList.toggle("is-loading", Boolean(state.active || checking));
    for (const radio of radios)
      radio.disabled =
        busy ||
        (radio.value === "qwen" &&
          system &&
          (system.platform !== "darwin" || system.arch !== "arm64"));
    $("audio-qwen-installed").hidden = !installed("qwen");
    $("audio-whisper-installed").hidden = !installed("whisper");
    $("audio-chord-model-state").textContent = t(
      readiness.neural === false
        ? "No disponible. Reinstala la aplicación para recuperar los acordes."
        : "Incluido en la aplicación. Sin descarga adicional.",
    );
    $("audio-model-continue").disabled =
      busy || !selected || radios.find((r) => r.value === selected)?.disabled;
    $("audio-model-continue").textContent = t(
      installed(selected)
        ? "Usar este modelo"
        : state.stage === "cancelled" || state.stage === "error"
          ? "Reintentar descarga"
          : selected === "qwen"
            ? "Descargar Qwen · 3,8 GB"
            : "Descargar Whisper · 0,5 GB",
    );
    $("audio-cancel-models").hidden = !state.active;
    $("audio-remove-models").disabled =
      busy || (!readiness.qwen && !readiness.lyrics);
    $("audio-model-later").disabled = analyzing;
    $("audio-model-later").textContent = t(
      readiness.qwen || readiness.lyrics
        ? "Cerrar ajustes"
        : "Ahora sólo acordes",
    );
  }
  async function show() {
    const current = generation;
    system = await hardware;
    if (
      current !== generation ||
      !$("new-dialog").open ||
      $("audio-import").hidden
    )
      return;
    const recommended = recommendedLyricModel(system);
    selected =
      settings.model ||
      (readiness.qwen ? "qwen" : readiness.lyrics ? "whisper" : recommended);
    for (const radio of radios) radio.checked = radio.value === selected;
    $("audio-qwen-recommended").hidden = recommended !== "qwen";
    $("audio-whisper-recommended").hidden = recommended !== "whisper";
    $("audio-recommendation").textContent = system
      ? `${system.memoryGB} GB RAM · ${t(recommended === "qwen" ? "Recomendamos Qwen para este equipo." : "Recomendamos Whisper para consumir menos memoria.")}`
      : t(
          "Whisper es la opción más ligera. Puedes elegir Qwen si tienes Apple Silicon.",
        );
    settings.seen = true;
    saveAudioSettings(settings);
    render();
    if (!dialog.open) dialog.showModal();
  }
  async function refreshModels() {
    checking = true;
    render();
    try {
      await refresh();
    } finally {
      checking = false;
      render();
    }
  }
  async function poll(current) {
    try {
      const state = await bridge.models();
      if (current !== generation) return;
      render(state);
      const completed = previousActive && !state.active;
      previousActive = Boolean(state.active);
      if (completed) await refreshModels();
    } catch {
      if (current === generation) render({ stage: "error" });
    }
    if (current === generation) timer = setTimeout(() => poll(current), 1000);
  }
  async function action(callback) {
    const current = generation;
    try {
      const state = await callback();
      if (current !== generation) return;
      render(state);
      previousActive = Boolean(state.active || state.stage === "download");
      if (!previousActive) await refreshModels();
    } catch {
      if (current === generation) render({ stage: "error" });
    }
  }
  for (const radio of radios)
    radio.onchange = () => {
      selected = radio.value;
      render();
    };
  $("audio-model-settings").onclick = show;
  $("audio-model-close").onclick = () => dialog.close();
  $("audio-model-later").onclick = () => dialog.close();
  $("audio-model-continue").onclick = async () => {
    if (installed(selected)) {
      settings.model = selected;
      saveAudioSettings(settings);
      await refreshModels();
      dialog.close();
    } else await action(() => bridge.install(selected));
  };
  $("audio-cancel-models").onclick = () => action(() => bridge.cancel());
  $("audio-remove-models").onclick = () => action(() => bridge.remove());
  return {
    configure(data) {
      readiness = data || {};
      render();
      if (!settings.seen) {
        if (readiness.qwen || readiness.lyrics) {
          settings.seen = true;
          saveAudioSettings(settings);
        } else show();
      }
    },
    setAnalyzing(value) {
      analyzing = value;
      render();
    },
    open() {
      clearTimeout(timer);
      poll(++generation);
    },
    close() {
      generation++;
      clearTimeout(timer);
      if (dialog.open) dialog.close();
    },
  };
}
