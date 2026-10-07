import { t } from "../i18n.js";
import { beginAudioDiagnostic } from "../browser-audio/diagnostics.js";
import { supportsBrowserModel } from "../browser-audio/hardware.js";
import {
  browserHardware,
  browserReadiness,
  downloadBrowserModels,
  removeBrowserModels,
  bundleBytes,
  bundleRuntimeBytes,
} from "../browser-audio/models.js";

import {
  whisperModels,
  browserLyricModels,
} from "../browser-audio/lyric-models.js";

const modelChoices = [...browserLyricModels, "chords"];
const preferenceKey = "chordleaf-browser-audio-mode";
export function browserAudioPreference() {
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
    <h2 id="browser-model-heading">Modelos de audio</h2>
    <fieldset class="browser-model-choices browser-chord-models"><legend>Acordes <span class="audio-section-badge">Obligatorio</span></legend>
      <div class="browser-model-card is-selected browser-chord-required">
        <label for="browser-required-chords"><input type="radio" name="browser-chord-model" value="lv-chordia" id="browser-required-chords" checked disabled aria-describedby="browser-chords-state" />
          <span><strong>LV-Chordia</strong><small>Detector de acordes · 13 MB</small></span></label>
        <div class="browser-model-storage"><span id="browser-chords-state"></span><button type="button" id="browser-chords-download" class="primary browser-model-download">Descargar</button><button type="button" id="browser-chords-remove" class="audio-text-button" hidden>Borrar</button></div>
      </div>
    </fieldset>
    <div class="browser-voice-heading" id="browser-voice-heading">Letra <span class="audio-section-badge">Opcional</span></div>
    <div class="browser-voice-scroll" role="radiogroup" aria-labelledby="browser-voice-heading">
      ${["whisper", "whisper-small", "qwen", "whisper-turbo"]
        .map((id) => [id, whisperModels[id]])
        .map(([id, model]) =>
          id === "qwen"
            ? t`<div class="browser-model-card" data-bundle="qwen">
        <label for="browser-model-qwen"><input type="radio" name="browser-audio-model" id="browser-model-qwen" value="qwen" aria-describedby="browser-qwen-state browser-model-device" />
          <span><span class="browser-model-title"><strong>Qwen 0,6B</strong><span class="audio-model-tag" data-kind="balanced">Equilibrado</span></span><small>WebGPU</small></span></label>
        <div class="browser-model-storage"><span id="browser-qwen-state"></span><button type="button" id="browser-qwen-remove" class="audio-text-button" hidden>Borrar</button></div>
        <small id="browser-model-device" hidden></small>
      </div>`
            : t`<div class="browser-model-card" data-bundle="${id}">
        <label for="browser-model-${id}"><input type="radio" name="browser-audio-model" id="browser-model-${id}" value="${id}" aria-describedby="browser-${id}-state" />
          <span><span class="browser-model-title"><strong>${model.name}</strong><span class="audio-model-tag" data-kind="${model.kind}">${t(model.label)}</span></span><small>${t(model.description)}</small></span></label>
        <div class="browser-model-storage"><span id="browser-${id}-state"></span><button type="button" id="browser-${id}-remove" class="audio-text-button" hidden>Borrar</button></div>
        ${id === "whisper-turbo" ? '<small id="browser-turbo-device" hidden></small>' : ""}
      </div>`,
        )
        .join("")}
      <div class="browser-model-card" data-bundle="chords">
        <label for="browser-model-chords"><input type="radio" name="browser-audio-model" id="browser-model-chords" value="chords" />
          <span><strong>No extraer letra</strong><small>Sólo acordes</small></span></label>
      </div>
    </div>
    <progress id="browser-model-progress" max="1" hidden></progress><p id="browser-model-status" role="status" aria-live="polite" hidden></p>
    <p id="browser-runtime-size" class="browser-runtime-size"></p>
    <div class="dialog-actions browser-model-footer"><p id="browser-model-note" class="browser-model-note"></p><button type="button" id="browser-model-stop" hidden>Pausar descarga</button><button type="button" id="browser-model-next" class="primary">Siguiente</button></div>`;
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
    bundle === "chords" ? ready.neural : ready.modelDownloads?.[bundle];
  function render() {
    const busy = Boolean(controller) || analyzing || checking;
    for (const bundle of modelChoices) {
      const radio = $("browser-model-" + bundle);
      const supported = supportsBrowserModel(bundle, hardware);
      radio.disabled = busy || !supported;
      radio.checked = selected === bundle;
      const card = radio.closest(".browser-model-card");
      card.classList.toggle("is-selected", radio.checked);
      card.classList.toggle("is-disabled", !supported);
      const state = $("browser-" + bundle + "-state");
      const saved =
        bundle === "chords" ? ready.neural : ready.voiceDownloads?.[bundle];
      state.classList.toggle("is-installed", Boolean(saved));
      state.textContent = saved
        ? t("✓ Ya en tu dispositivo")
        : t`Descarga · ${sizeLabel(Math.max(0, (ready.missingModelBytes?.[bundle] ?? bundleBytes(bundle)) - (bundle === "chords" ? 0 : (ready.missingModelBytes?.chords ?? bundleBytes("chords")))))}${t(" de modelo")}`;
      const remove = $("browser-" + bundle + "-remove");
      remove.hidden = !(bundle === "chords"
        ? ready.hasChordFiles
        : ready.modelFiles?.[bundle]);
      remove.disabled = busy;
    }
    $("browser-model-device").hidden = Boolean(hardware?.gpu);
    $("browser-model-device").textContent = t(
      hardware?.webkit
        ? "En Safari usamos Whisper para reducir el consumo de memoria."
        : "Necesita WebGPU compatible.",
    );
    $("browser-turbo-device").hidden = supportsBrowserModel(
      "whisper-turbo",
      hardware,
    );
    $("browser-turbo-device").textContent = t(
      "Turbo no está disponible en iPhone y iPad para evitar que Safari recargue la página. Usa Base o Small.",
    );
    $("browser-model-whisper-turbo").setAttribute(
      "aria-describedby",
      "browser-whisper-turbo-state browser-turbo-device",
    );
    $("browser-model-note").textContent = t(
      hardware?.mobile && ["whisper-small", "whisper-turbo"].includes(selected)
        ? "En móvil empieza con Whisper Base. Small y Turbo necesitan más memoria."
        : ready.runtimeDownloaded
          ? "Se guardan aquí para próximas canciones."
          : "Los modelos y el motor se guardan aquí para próximas canciones.",
    );
    const runtimeMissing =
      ready.missingRuntimeBytes?.[selected] ??
      bundleRuntimeBytes(selected || "chords");
    $("browser-runtime-size").textContent = runtimeMissing
      ? t`Motor compartido · ${(runtimeMissing / 1e6).toFixed(1)} MB pendientes de guardar. La transferencia puede ser menor por compresión.`
      : t("Motor compartido guardado. Se reutiliza entre modelos y canciones.");
    $("browser-chords-download").hidden = Boolean(ready.neural);
    $("browser-chords-download").disabled = busy;
    $("browser-model-next").disabled =
      busy || !selected || !supportsBrowserModel(selected, hardware);
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
    checkbox.checked =
      browserLyricModels.includes(selected) && Boolean(ready[selected]);
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
    const saved = browserAudioPreference();
    selected =
      modelChoices.includes(saved) && supportsBrowserModel(saved, hardware)
        ? saved
        : "whisper";
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
  for (const bundle of modelChoices)
    $("browser-model-" + bundle).onchange = () => {
      selected = bundle;
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
  async function download(bundle, continueToSong = true) {
    const current = generation;
    let success = installed(bundle);
    if (!success) {
      const diagnostic = beginAudioDiagnostic("download", { model: bundle });
      let checkpoint = -1;
      controller = new AbortController();
      $("browser-model-progress").value = 0;
      $("browser-model-status").hidden = false;
      $("browser-model-status").textContent = t("Descargando modelos…");
      render();
      try {
        await downloadBrowserModels(bundle, controller.signal, (value) => {
          const step = Math.floor(value * 10);
          if (step !== checkpoint) {
            checkpoint = step;
            diagnostic.step("downloading", {
              percent: Math.floor(value * 100),
            });
          }
          $("browser-model-progress").value = value;
          $("browser-model-status").textContent =
            t`Descargando · ${Math.floor(value * 100)} %`;
        });
        success = true;
        diagnostic.finish("completed");
      } catch (error) {
        diagnostic.finish(
          error.name === "AbortError" ? "cancelled" : "failed",
          error,
        );
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
      if (success && continueToSong) applySelection();
      await refresh();
      if (success && continueToSong && current === generation) {
        dialog.close();
        document.getElementById("audio-drop").focus();
      }
    } finally {
      checking = false;
      render();
    }
  }
  $("browser-model-next").onclick = () => download(selected);
  $("browser-chords-download").onclick = () => download("chords", false);
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
  for (const bundle of modelChoices)
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
