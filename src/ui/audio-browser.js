import { t } from "../i18n.js";
import {
  browserHardware,
  browserReadiness,
  downloadBrowserModels,
  removeBrowserModels,
  bundleBytes,
} from "../browser-audio/models.js";

const preferenceKey = "chordleaf-browser-audio-mode";
function preference() {
  try {
    return localStorage.getItem(preferenceKey);
  } catch {
    return null;
  }
}
const sizeLabel = (bytes) =>
  bytes >= 1e9
    ? `${(bytes / 1e9).toFixed(2)} GB`
    : `${Math.ceil(bytes / 1e6)} MB`;

export function setupBrowserModels(refresh, busyChanged) {
  const dialog = document.createElement("dialog");
  dialog.id = "audio-browser-model-dialog";
  dialog.className = "audio-browser-model-dialog";
  dialog.setAttribute("aria-labelledby", "browser-model-heading");
  dialog.innerHTML = t`<button type="button" id="browser-model-close" class="dialog-close" aria-label="Cerrar">×</button>
    <h2 id="browser-model-heading">¿Qué quieres obtener?</h2>
    <p>Elige los modelos para analizar en tu equipo.</p>
    <fieldset class="browser-model-choices"><legend class="visually-hidden">Modelos de audio</legend>
      <div class="browser-model-card" data-bundle="qwen">
        <label for="browser-model-qwen"><input type="radio" name="browser-audio-model" id="browser-model-qwen" value="qwen" aria-describedby="browser-qwen-state browser-model-device" />
          <span><strong>Letra y acordes</strong><small>Qwen 0,6B + LV-Chordia</small></span><span id="browser-model-recommended" class="choice-beta" hidden>Recomendado</span></label>
        <div class="browser-model-storage"><span id="browser-qwen-state"></span><button type="button" id="browser-qwen-remove" class="audio-text-button" hidden>Borrar</button></div>
        <small id="browser-model-device"></small>
      </div>
      <div class="browser-model-card" data-bundle="chords">
        <label for="browser-model-chords"><input type="radio" name="browser-audio-model" id="browser-model-chords" value="chords" aria-describedby="browser-chords-state" />
          <span><strong>Sólo acordes</strong><small>LV-Chordia · Puedes añadir la letra después</small></span></label>
        <div class="browser-model-storage"><span id="browser-chords-state"></span><button type="button" id="browser-chords-remove" class="audio-text-button" hidden>Borrar</button></div>
      </div>
    </fieldset>
    <p id="browser-model-note" class="browser-model-note"></p>
    <progress id="browser-model-progress" max="1" hidden></progress><p id="browser-model-status" role="status" aria-live="polite" hidden></p>
    <div class="dialog-actions"><button type="button" id="browser-model-stop" hidden>Pausar descarga</button><button type="button" id="browser-model-next" class="primary">Siguiente</button></div>`;
  document.body.append(dialog);
  const $ = (id) => dialog.querySelector("#" + id);
  const settings = document.getElementById("audio-model-settings");
  settings.hidden = false;
  let controller,
    analyzing = false,
    checking = false,
    generation = 0,
    ready = {},
    selected,
    hardware;
  const init = browserHardware().then((value) => {
    hardware = value;
    return value;
  });
  const installed = (bundle) =>
    bundle === "qwen" ? ready.qwenDownloaded : ready.neural;
  function render() {
    const busy = Boolean(controller) || analyzing || checking;
    for (const bundle of ["qwen", "chords"]) {
      const radio = $("browser-model-" + bundle);
      radio.disabled = busy || (bundle === "qwen" && !hardware?.gpu);
      radio.checked = selected === bundle;
      const card = radio.closest(".browser-model-card");
      card.classList.toggle("is-selected", radio.checked);
      card.classList.toggle("is-disabled", bundle === "qwen" && !hardware?.gpu);
      const state = $("browser-" + bundle + "-state");
      state.classList.toggle("is-installed", Boolean(installed(bundle)));
      state.textContent = installed(bundle)
        ? t("✓ Ya en tu dispositivo")
        : t`Descarga · ${sizeLabel(ready.missingBytes?.[bundle] ?? bundleBytes(bundle))}`;
      const remove = $("browser-" + bundle + "-remove");
      remove.hidden = !(bundle === "qwen"
        ? ready.hasQwenFiles
        : ready.hasChordFiles);
      remove.disabled = busy;
    }
    $("browser-model-device").textContent = t(
      hardware?.gpu
        ? "Necesita WebGPU · Recomendado con 8 GB de memoria o más"
        : "La letra no está disponible en este navegador. Necesita WebGPU compatible.",
    );
    $("browser-model-recommended").hidden = !hardware?.gpu;
    $("browser-model-note").textContent = t(
      ready.runtimeDownloaded
        ? "Se guardan en este navegador y se reutilizan entre canciones."
        : "Se guardan en este navegador y se reutilizan entre canciones. Motor local: 25 MB adicionales.",
    );
    $("browser-model-next").disabled =
      busy || !selected || (selected === "qwen" && !hardware?.gpu);
    $("browser-model-next").textContent = t(
      installed(selected) ? "Siguiente" : "Descargar y continuar",
    );
    $("browser-model-close").disabled = analyzing;
    $("browser-model-stop").hidden = !controller;
    $("browser-model-progress").hidden = !controller;
    settings.disabled = analyzing || Boolean(controller);
    busyChanged(Boolean(controller) || checking);
  }
  function applySelection() {
    const checkbox = document.getElementById("audio-lyrics");
    checkbox.checked = selected === "qwen" && Boolean(ready.qwen);
    checkbox.dispatchEvent(new Event("change"));
    try {
      localStorage.setItem(preferenceKey, selected);
    } catch {
      /* Optional preference. */
    }
  }
  async function check(current) {
    await init;
    const data = await browserReadiness();
    if (current !== generation) return false;
    ready = data;
    const saved = preference();
    selected =
      saved === "chords" || !hardware?.gpu
        ? "chords"
        : saved === "qwen" || ready.qwen || !ready.available
          ? "qwen"
          : "chords";
    render();
    return true;
  }
  async function show() {
    if (dialog.open || controller || checking) return;
    const current = generation;
    if (!(await check(current))) return;
    if (
      current !== generation ||
      dialog.open ||
      controller ||
      checking ||
      !document.getElementById("new-dialog").open ||
      document.getElementById("audio-import").hidden
    )
      return;
    $("browser-model-status").hidden = true;
    if (!dialog.open) {
      dialog.showModal();
      $("browser-model-" + selected).focus();
    }
  }
  $("browser-model-qwen").onchange = () => {
    selected = "qwen";
    render();
  };
  $("browser-model-chords").onchange = () => {
    selected = "chords";
    render();
  };
  for (const card of dialog.querySelectorAll(".browser-model-card"))
    card.onclick = (event) => {
      if (event.target.closest("button, input, label")) return;
      const radio = card.querySelector("input");
      if (!radio.disabled) {
        selected = radio.value;
        render();
      }
    };
  $("browser-model-next").onclick = async () => {
    const current = generation;
    const bundle = selected;
    let success = installed(bundle);
    if (!success) {
      controller = new AbortController();
      $("browser-model-progress").value = 0;
      $("browser-model-status").hidden = false;
      $("browser-model-status").textContent = t("Descargando modelos…");
      render();
      try {
        await downloadBrowserModels(bundle, controller.signal, (value) => {
          $("browser-model-progress").value = value;
          $("browser-model-status").textContent =
            t`Descargando · ${Math.floor(value * 100)} %`;
        });
        success = true;
      } catch (error) {
        if (current === generation) {
          $("browser-model-status").hidden = false;
          $("browser-model-status").textContent = t(
            error.name === "AbortError"
              ? "Descarga pausada. Puedes continuar más tarde."
              : error.message,
          );
        }
      } finally {
        controller = null;
      }
    }
    if (current !== generation) {
      render();
      return;
    }
    checking = true;
    render();
    try {
      ready = await browserReadiness();
      if (current !== generation) return;
      if (success) applySelection();
      await refresh();
      if (success && current === generation) {
        dialog.close();
        document.getElementById("audio-drop").focus();
      }
    } finally {
      checking = false;
      render();
    }
  };
  $("browser-model-stop").onclick = () => controller?.abort();
  function close() {
    generation++;
    controller?.abort();
    if (dialog.open) dialog.close();
  }
  $("browser-model-close").onclick = close;
  dialog.addEventListener("cancel", (event) => {
    if (analyzing) event.preventDefault();
    else close();
  });
  for (const bundle of ["qwen", "chords"])
    $("browser-" + bundle + "-remove").onclick = async () => {
      const current = generation;
      checking = true;
      render();
      try {
        await removeBrowserModels(bundle);
        ready = await browserReadiness();
        if (current !== generation) return;
        await refresh();
      } finally {
        checking = false;
        render();
      }
    };
  settings.onclick = show;
  return {
    async open() {
      const current = generation;
      if (!(await check(current))) return;
      if (
        current !== generation ||
        document.getElementById("audio-import").hidden
      )
        return;
      if (!ready.available) await show();
      else applySelection();
    },
    close,
    configure(data) {
      ready = data || {};
      render();
    },
    setAnalyzing(value) {
      analyzing = value;
      render();
    },
  };
}
