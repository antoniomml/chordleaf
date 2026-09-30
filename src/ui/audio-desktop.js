import { t } from "../i18n.js";

export function setupDesktopModels(refresh, busyChanged) {
  const bridge = window.chordleafDesktop;
  const $ = (id) => document.getElementById(id);
  if (!bridge) return { open() {}, close() {}, setAnalyzing() {} };
  $("audio-desktop-setup").hidden = false;
  let timer,
    generation = 0,
    previousActive = false,
    analyzing = false,
    lastState = { stage: "idle" };
  function render(state) {
    lastState = state;
    busyChanged(Boolean(state.active));
    const messages = {
      idle: "Los modelos se guardan en este equipo. Tus canciones no se suben.",
      download: "Descargando modelos… Puedes cancelar y continuar más tarde.",
      complete: "Modelos instalados. Ya puedes transcribir la letra.",
      cancelled: "Descarga cancelada. Puedes continuar más tarde.",
      error:
        state.error === "space"
          ? "Necesitas al menos 6 GB libres para instalar los modelos."
          : "No se pudo completar la descarga. Comprueba la conexión y vuelve a intentarlo.",
    };
    $("audio-model-status").textContent = t(
      messages[state.stage] || messages.idle,
    );
    for (const id of [
      "audio-install-qwen",
      "audio-install-whisper",
      "audio-remove-models",
    ])
      $(id).disabled = Boolean(state.active || analyzing);
    $("audio-cancel-models").hidden = !state.active;
  }
  async function poll(current) {
    try {
      const state = await bridge.models();
      if (current !== generation) return;
      render(state);
      const completed = previousActive && !state.active;
      previousActive = state.active;
      if (completed) await refresh();
    } catch {
      if (current === generation) render({ stage: "error" });
    }
    if (current === generation) timer = setTimeout(() => poll(current), 1000);
  }
  async function action(callback) {
    try {
      const state = await callback();
      render(state);
      previousActive = state.active || state.stage === "download";
      if (!previousActive) await refresh();
    } catch {
      render({ stage: "error" });
    }
  }
  $("audio-install-qwen").onclick = () => action(() => bridge.install("qwen"));
  $("audio-install-whisper").onclick = () =>
    action(() => bridge.install("whisper"));
  $("audio-cancel-models").onclick = () => action(() => bridge.cancel());
  $("audio-remove-models").onclick = () => action(() => bridge.remove());
  return {
    setAnalyzing(value) {
      analyzing = value;
      render(lastState);
    },
    open() {
      clearTimeout(timer);
      poll(++generation);
    },
    close() {
      generation++;
      clearTimeout(timer);
    },
  };
}
