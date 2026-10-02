import { t } from "../i18n.js";
import {
  browserHardware,
  browserReadiness,
  downloadBrowserModels,
  removeBrowserModels,
  bundleBytes,
} from "../browser-audio/models.js";

import {
  whisperModels,
  browserLyricModels,
  recommendedBrowserLyricModel,
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
    <div class="browser-voice-scroll"><fieldset class="browser-model-choices"><legend>Letra <span class="audio-section-badge">Opcional</span></legend>
      <p id="browser-model-hardware" class="browser-model-hardware"></p>
      <div class="browser-model-card" data-bundle="chords">
        <label for="browser-model-chords"><input type="radio" name="browser-audio-model" id="browser-model-chords" value="chords" />
          <span><strong>Ninguna</strong><small>Sólo acordes · Puedes añadir la letra después</small></span></label>
      </div>
      ${Object.entries(whisperModels)
        .map(
          ([
            id,
            model,
          ]) => t`<div class="browser-model-card" data-bundle="${id}">
        <label for="browser-model-${id}"><input type="radio" name="browser-audio-model" id="browser-model-${id}" value="${id}" aria-describedby="browser-${id}-state" />
          <span><span class="browser-model-title"><strong>${model.name}</strong><span class="audio-model-tag" data-kind="${model.kind}">${t(model.label)}</span><span id="browser-${id}-recommended" class="audio-model-tag" data-kind="recommended" hidden>Recomendado</span></span><small>${t(model.description)}</small></span></label>
        <div class="browser-model-storage"><span id="browser-${id}-state"></span><button type="button" id="browser-${id}-remove" class="audio-text-button" hidden>Borrar</button></div>
      </div>`,
        )
        .join("")}
      <div class="browser-model-card" data-bundle="qwen">
        <label for="browser-model-qwen"><input type="radio" name="browser-audio-model" id="browser-model-qwen" value="qwen" aria-describedby="browser-qwen-state browser-model-device" />
          <span><span class="browser-model-title"><strong>Qwen 0,6B</strong><span class="audio-model-tag" data-kind="balanced">Equilibrado</span><span id="browser-qwen-recommended" class="audio-model-tag" data-kind="recommended" hidden>Recomendado</span></span><small>WebGPU · Tiempos por palabra</small></span></label>
        <div class="browser-model-storage"><span id="browser-qwen-state"></span><button type="button" id="browser-qwen-remove" class="audio-text-button" hidden>Borrar</button></div>
        <small id="browser-model-device"></small>
      </div>
    </fieldset></div>
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
    bundle === "chords" ? ready.neural : ready.modelDownloads?.[bundle];
  function render() {
    const busy = Boolean(controller) || analyzing || checking;
    const recommended = recommendedBrowserLyricModel(hardware);
    const device = [
      hardware?.mobile ? t("Móvil") : null,
      hardware?.memory
        ? t`${hardware.memory} GB de memoria estimada`
        : t("Memoria no disponible"),
      hardware?.cores ? t`${hardware.cores} hilos de CPU` : null,
      t(hardware?.gpu ? "WebGPU disponible" : "Sin WebGPU"),
    ].filter(Boolean);
    $("browser-model-hardware").textContent =
      t`Recomendación orientativa · ${device.join(" · ")}`;
    for (const bundle of modelChoices) {
      const radio = $("browser-model-" + bundle);
      radio.disabled = busy || (bundle === "qwen" && !hardware?.gpu);
      radio.checked = selected === bundle;
      const recommendation = $("browser-" + bundle + "-recommended");
      if (recommendation) recommendation.hidden = recommended !== bundle;
      const card = radio.closest(".browser-model-card");
      card.classList.toggle("is-selected", radio.checked);
      card.classList.toggle("is-disabled", bundle === "qwen" && !hardware?.gpu);
      const state = $("browser-" + bundle + "-state");
      const saved =
        bundle === "chords" ? ready.neural : ready.voiceDownloads?.[bundle];
      state.classList.toggle("is-installed", Boolean(saved));
      state.textContent = saved
        ? t("✓ Ya en tu dispositivo")
        : t`Descarga · ${sizeLabel(Math.max(0, (ready.missingBytes?.[bundle] ?? bundleBytes(bundle)) - (bundle === "chords" ? 0 : (ready.missingBytes?.chords ?? bundleBytes("chords")))))}`;
      const remove = $("browser-" + bundle + "-remove");
      remove.hidden = !(bundle === "chords"
        ? ready.hasChordFiles
        : ready.modelFiles?.[bundle]);
      remove.disabled = busy;
    }
    $("browser-model-device").textContent = t(
      hardware?.gpu
        ? "Necesita WebGPU · 8 GB de memoria o más recomendados"
        : "Necesita WebGPU compatible. Puedes usar Whisper en este navegador.",
    );
    $("browser-model-note").textContent = t(
      ready.runtimeDownloaded
        ? "Se guardan en este navegador y se reutilizan entre canciones."
        : "Se guardan en este navegador y se reutilizan entre canciones. Motor local: 25 MB adicionales.",
    );
    $("browser-chords-download").hidden = Boolean(ready.neural);
    $("browser-chords-download").disabled = busy;
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
      modelChoices.includes(saved) && (saved !== "qwen" || hardware?.gpu)
        ? saved
        : recommendedBrowserLyricModel(hardware);
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
