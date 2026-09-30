import { recordTabAudio, youtubeURL } from "../browser-audio/capture.js";

export function setupAudioCapture(selectFile, reportError) {
  const host = document.createElement("details");
  host.className = "audio-capture";
  host.innerHTML = `<summary>Usar audio de YouTube</summary><p>Abre el vídeo y captura el audio mientras se reproduce. Elige su pestaña y activa «Compartir audio». Sólo guardamos el audio en este navegador.</p><label>Enlace de YouTube<input type="url" id="audio-youtube-url" placeholder="https://www.youtube.com/watch?v=…" /></label><div class="dialog-actions"><button type="button" id="audio-youtube-open">Abrir vídeo</button><button type="button" id="audio-capture-start">Capturar audio de una pestaña</button><button type="button" id="audio-capture-finish" hidden>Terminar y usar audio</button><button type="button" id="audio-capture-cancel" hidden>Cancelar captura</button></div><p id="audio-capture-status" role="status" aria-live="polite">Disponible en navegadores que permiten compartir el audio de una pestaña, como Chrome y Edge. Máximo 10 minutos.</p>`;
  document.getElementById("audio-upload-controls").append(host);
  const $ = (id) => host.querySelector("#" + id);
  let capture,
    timer,
    generation = 0,
    pending = false,
    busy = false;
  function render() {
    $("audio-capture-start").disabled =
      busy ||
      pending ||
      Boolean(capture) ||
      !navigator.mediaDevices?.getDisplayMedia ||
      !window.MediaRecorder;
    $("audio-youtube-open").disabled = busy || pending || Boolean(capture);
    $("audio-youtube-url").disabled = busy || pending || Boolean(capture);
    $("audio-capture-finish").hidden = !capture;
    $("audio-capture-cancel").hidden = !capture && !pending;
  }
  function close() {
    generation++;
    capture?.cancel();
    capture = null;
    pending = false;
    clearInterval(timer);
    render();
  }
  $("audio-youtube-open").onclick = () => {
    try {
      window.open(
        youtubeURL($("audio-youtube-url").value),
        "_blank",
        "noopener,noreferrer",
      );
    } catch (error) {
      reportError(error);
    }
  };
  $("audio-capture-start").onclick = async () => {
    const current = ++generation;
    pending = true;
    render();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        preferCurrentTab: false,
        systemAudio: "exclude",
        selfBrowserSurface: "exclude",
      });
      if (current !== generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      capture = recordTabAudio(stream);
      pending = false;
      render();
      const start = Date.now();
      const update = () => {
        $("audio-capture-status").textContent =
          `Capturando sólo audio · ${Math.floor((Date.now() - start) / 1000)} s. Reproduce el vídeo desde el principio.`;
      };
      update();
      timer = setInterval(update, 1000);
      const blob = await capture.done;
      if (current !== generation) return;
      if (blob?.size) {
        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
        selectFile(
          new File([blob], `Audio de YouTube.${extension}`, {
            type: blob.type,
          }),
        );
        $("audio-capture-status").textContent =
          "Audio listo para analizar en tu equipo.";
      }
    } catch (error) {
      if (current === generation)
        $("audio-capture-status").textContent =
          error.name === "NotAllowedError"
            ? "Captura cancelada. Puedes seleccionar un archivo de audio."
            : error.message;
    } finally {
      if (current === generation) {
        clearInterval(timer);
        capture = null;
        pending = false;
        render();
      }
    }
  };
  $("audio-capture-finish").onclick = () => capture?.finish();
  $("audio-capture-cancel").onclick = () => {
    close();
    $("audio-capture-status").textContent = "Captura cancelada.";
  };
  render();
  return {
    close,
    setBusy(value) {
      busy = value;
      render();
    },
  };
}
