import { t } from "../i18n.js";
import {
  browserHardware,
  browserReadiness,
  downloadBrowserModels,
  removeBrowserModels,
  bundleBytes,
} from "../browser-audio/models.js";

export function setupBrowserModels(refresh, busyChanged) {
  const dialog = document.createElement("dialog");
  dialog.id = "audio-browser-model-dialog";
  dialog.className = "audio-browser-model-dialog";
  dialog.innerHTML = t`<h2>Prepara la importación de audio</h2>
    <p>Los modelos se guardan en este navegador. Tu audio y la letra permanecen en tu equipo.</p>
    <div class="audio-model-card"><strong>Letra y acordes · Qwen 0,6B</strong><p>Qwen, alineador y acordes complejos. Necesita WebGPU; recomendamos 8 GB de memoria o más.</p><button type="button" id="browser-model-qwen" class="primary">Descargar · ${(bundleBytes("qwen") / 1e9).toFixed(2)} GB</button></div>
    <div class="audio-model-card"><strong>Sólo acordes · LV-Chordia</strong><p>También funciona sin WebGPU. Puedes añadir la letra después.</p><button type="button" id="browser-model-chords">Descargar · 13 MB</button></div>
    <p>Además se descarga el motor de ejecución, unos 25 MB. La primera descarga requiere conexión; después podrás analizar sin conexión. El navegador puede borrar modelos si necesita espacio.</p>
    <p id="browser-model-device" role="status"></p><progress id="browser-model-progress" max="1" hidden></progress><p id="browser-model-status" role="status" aria-live="polite"></p>
    <div class="dialog-actions"><button type="button" id="browser-model-stop" hidden>Pausar descarga</button><button type="button" id="browser-model-remove">Eliminar modelos</button><button type="button" id="browser-model-close">Cerrar</button></div>`;
  document.body.append(dialog);
  const $ = (id) => dialog.querySelector("#" + id);
  const settings = document.getElementById("audio-model-settings");
  settings.hidden = false;
  let controller,
    analyzing = false,
    ready = {},
    hardware;
  const init = browserHardware().then((value) => {
    hardware = value;
    render();
    return value;
  });
  function render() {
    const busy = Boolean(controller) || analyzing;
    $("browser-model-qwen").disabled = busy || !hardware?.gpu;
    $("browser-model-chords").disabled = busy;
    $("browser-model-remove").disabled = busy;
    $("browser-model-close").disabled = analyzing;
    $("browser-model-stop").hidden = !controller;
    $("browser-model-progress").hidden = !controller;
    $("browser-model-device").textContent = hardware?.gpu
      ? "WebGPU disponible. Qwen recomendado para este navegador."
      : "La letra necesita un navegador con WebGPU compatible. Prueba Chrome o Edge actualizado; mientras puedes importar sólo acordes.";
    $("browser-model-qwen").textContent = ready.qwen
      ? "Listo · Usar letra y acordes"
      : `Descargar letra y acordes · ${(bundleBytes("qwen") / 1e9).toFixed(2)} GB`;
    $("browser-model-chords").textContent = ready.neural
      ? "Listo · Usar sólo acordes"
      : "Descargar acordes · 13 MB";
    const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT);
    while (walker.nextNode())
      walker.currentNode.data = t(walker.currentNode.data);
    busyChanged(Boolean(controller));
  }
  async function download(bundle) {
    if (
      (bundle === "qwen" && ready.qwen) ||
      (bundle === "chords" && ready.neural)
    ) {
      const checkbox = document.getElementById("audio-lyrics");
      checkbox.checked = bundle === "qwen";
      checkbox.dispatchEvent(new Event("change"));
      dialog.close();
      await refresh();
      return;
    }
    controller = new AbortController();
    render();
    $("browser-model-status").textContent = t("Descargando modelos públicos…");
    try {
      await downloadBrowserModels(bundle, controller.signal, (value) => {
        $("browser-model-progress").value = value;
        $("browser-model-status").textContent =
          t`Descargando · ${Math.floor(value * 100)} %`;
      });
      $("browser-model-status").textContent = t(
        "Modelos listos en este navegador.",
      );
    } catch (error) {
      $("browser-model-status").textContent = t(
        error.name === "AbortError"
          ? "Descarga pausada. Los archivos completos se conservan para reintentar."
          : error.message,
      );
    } finally {
      controller = null;
      ready = await browserReadiness();
      render();
      await refresh();
    }
  }
  $("browser-model-qwen").onclick = () => download("qwen");
  $("browser-model-chords").onclick = () => download("chords");
  $("browser-model-stop").onclick = () => controller?.abort();
  $("browser-model-close").onclick = () => {
    controller?.abort();
    dialog.close();
  };
  dialog.addEventListener("cancel", (event) => {
    if (analyzing) event.preventDefault();
    else controller?.abort();
  });
  $("browser-model-remove").onclick = async () => {
    await removeBrowserModels();
    ready = await browserReadiness();
    render();
    await refresh();
  };
  async function show() {
    await init;
    if (!dialog.open) dialog.showModal();
  }
  settings.onclick = show;
  document.getElementById("audio-enable-lyrics").onclick = show;
  return {
    open() {
      browserReadiness().then((data) => {
        ready = data;
        render();
        if (!data.available) show();
      });
    },
    close() {
      controller?.abort();
      dialog.close();
    },
    configure(data) {
      ready = data;
      render();
    },
    setAnalyzing(value) {
      analyzing = value;
      render();
    },
  };
}
