import { t } from "../i18n.js";
import { createSong as create, MAX_TEXT_LENGTH } from "../song-state.js";
import { fitSong } from "../fit-song.js";
import { layout } from "../layout.js";
import { restoreWorkspace } from "../workspace-backup.js";
import { restoreProject } from "../project.js";
import { importWebSong } from "../web-import.js";
import { importFile, importText } from "../files.js";
import { setupLocalWebImport } from "./local-web-import.js";
import { setupAudioImport } from "./audio-import.js";
import { setupClipboardImport } from "./clipboard-import.js";

/** Own import dialogs, cancellation and validation; commit songs only when
 * the user still has the matching operation open. Workspace state stays in app. */
export function setupSongImport({ features, onBlank, onSongs, toast }) {
  const $ = (selector) => document.querySelector(selector);
  let importGeneration = 0,
    importController;

  $("#audio").hidden = !features.audioImport;
  $("#web").hidden = !features.webImport;
  const audioImport = features.audioImport
    ? setupAudioImport({
        accept: (data, options) =>
          acceptImport(data, { ...options, edit: true }),
        reportError: importError,
      })
    : { reset() {}, open() {} };
  const clipboardImport = setupClipboardImport({
    active: () => $("#new-dialog").open && !$("#new-menu").hidden,
    accept: (text) => acceptImport(importText(text, "")),
    reportError: importError,
  });
  $("#audio").onclick = () => importScreen("audio");
  function importScreen(screen) {
    if (
      (screen === "audio" && !features.audioImport) ||
      (screen === "web" && !features.webImport)
    )
      return;
    $("#new-dialog").dataset.screen = screen;
    audioImport.reset();
    importController?.abort();
    importController = new AbortController();
    importGeneration++;
    clipboardImport.reset();
    localWebImport.reset();
    $("#new-menu").hidden = screen !== "menu";
    $("#text-import").hidden = screen !== "text";
    $("#web-import").hidden = screen !== "web";
    $("#audio-import").hidden = screen !== "audio";
    $("#import-back").hidden = screen === "menu";
    $("#new-heading").textContent = {
      menu: t("Una nueva canción."),
      text: t("Abrir documento"),
      web: t("Importar desde una web."),
      audio: t("Importar audio"),
    }[screen];
    $("#new-description").textContent = {
      menu: t("De una idea a tu próxima hoja de acordes."),
      text: t(
        "PDF, Word, TXT o ChordPro. Se convierten en letra y acordes editables.",
      ),
      web: t("Pega el enlace de la canción que quieres tocar."),
      audio: t(
        "En canciones, la letra probablemente tendrá errores. Úsala como borrador y revisa los acordes y su posición.",
      ),
    }[screen];
    $("#import-privacy").textContent =
      screen === "audio"
        ? t("Tu audio permanece en este equipo.")
        : screen === "web"
          ? t("El servidor descarga únicamente la página del enlace.")
          : t("Los archivos se procesan aquí, en tu navegador.");
    $("#import-error").hidden = true;
    $("#import-error").textContent = "";
    $("#web-submit").disabled = false;
    $("#web-submit").textContent = t("Importar canción");
    $("#choose-file").disabled = false;
    $("#choose-file").textContent = t("Elegir documento");
    $("#file").accept = ".txt,.pdf,.docx,.cho,.chordpro";
    $("#new-dialog").scrollTop = 0;
    if (screen === "web") $("#web-url").focus();
    else if (screen === "audio") {
      audioImport.open();
      $("#audio-drop").focus();
    } else if (screen === "text") $("#choose-file").focus();
    else {
      $("#new-menu .choice:not([hidden])").focus();
      if ($("#new-dialog").open) clipboardImport.refresh();
    }
  }
  function openNewSong() {
    $("#web-url").value = "";
    $("#file").value = "";
    importScreen("menu");
    $("#new-dialog").showModal();
    $("#new-menu .choice:not([hidden])").focus();
    clipboardImport.refresh();
  }
  $("#new").onclick = openNewSong;
  $("#mobile-tab-plus").onclick = openNewSong;
  $("#empty-new").onclick = openNewSong;
  $("#import-back").onclick = () => importScreen("menu");
  $("#new-dialog").addEventListener("close", () => {
    audioImport.reset();
    importController?.abort();
    importGeneration++;
    clipboardImport.reset();
  });
  $("#new-dialog .dialog-close").onclick = () => $("#new-dialog").close();
  $("#blank").onclick = onBlank;
  async function acceptImport(data, { edit = false, signal } = {}) {
    const generation = importGeneration;
    const importSignal = signal
      ? AbortSignal.any([signal, importController.signal])
      : importController.signal;
    if (data.text.length > MAX_TEXT_LENGTH)
      throw new Error(
        t(
          "El texto es demasiado largo. Importa hasta 50.000 caracteres por canción.",
        ),
      );
    const s = create({ ...data, dirty: true });
    Object.assign(s, await fitSong(s, { signal: importSignal }));
    importSignal.throwIfAborted();
    if (generation !== importGeneration || !$("#new-dialog").open) return;
    $("#new-dialog").close();
    onSongs([s], s.id, { edit, imported: true });
    const fit =
      layout(s).pages.length === 1
        ? t("Ajustada a una página. Puedes cambiar los ajustes.")
        : t(
            "Es demasiado larga para una página con letra legible. Se han optimizado los ajustes.",
          );
    toast([data.notice, fit].filter(Boolean).join(" "));
  }
  function importError(error) {
    $("#import-error").hidden = false;
    $("#import-error").textContent = t(error.message);
  }
  $("#import").onclick = () => {
    importScreen("text");
    $("#file").click();
  };
  $("#open-project").onclick = () => {
    importScreen("text");
    $("#new-heading").textContent = t("Abrir proyecto editable.");
    $("#new-description").textContent = t(
      "Selecciona el archivo .chordleaf.json de una canción guardada.",
    );
    $("#choose-file").textContent = t("Seleccionar proyecto");
    $("#file").accept = ".chordleaf.json,.json";
    $("#choose-file").focus();
  };
  $("#choose-file").onclick = () => $("#file").click();
  $("#web").onclick = () => importScreen("web");
  const localWebImport = setupLocalWebImport({
    onChange() {
      importController?.abort();
      importGeneration++;
      $("#import-error").hidden = true;
      $("#web-submit").disabled = false;
      $("#web-submit").textContent = t("Importar canción");
    },
    async onImport(read) {
      importController?.abort();
      importController = new AbortController();
      const signal = importController.signal;
      const generation = ++importGeneration;
      $("#import-error").hidden = true;
      $("#web-submit").disabled = false;
      $("#web-submit").textContent = t("Importar canción");
      try {
        const data = await read(signal);
        signal.throwIfAborted();
        if (generation !== importGeneration || !$("#new-dialog").open) return;
        await acceptImport(data);
      } catch (error) {
        if (generation === importGeneration && $("#new-dialog").open)
          importError(error);
      }
    },
  });
  $("#web-import").onsubmit = async (e) => {
    e.preventDefault();
    if (!features.webImport) return;
    importController?.abort();
    importController = new AbortController();
    const generation = ++importGeneration;
    localWebImport.reset();
    $("#import-error").hidden = true;
    $("#web-submit").disabled = true;
    $("#web-submit").textContent = t("Importando…");
    try {
      const data = await importWebSong($("#web-url").value.trim(), {
        signal: importController.signal,
      });
      if (generation !== importGeneration || !$("#new-dialog").open) return;
      await acceptImport(data);
      $("#web-url").value = "";
    } catch (error) {
      if (generation === importGeneration && $("#new-dialog").open) {
        if (error.code === "SOURCE_FORBIDDEN") {
          importError(
            new Error(
              t(
                "La web bloquea la descarga (403). Próximamente podrás importarla con la extensión de navegador de Chordleaf.",
              ),
            ),
          );
          localWebImport.show();
        } else importError(error);
      }
    } finally {
      if (generation === importGeneration) {
        $("#web-submit").disabled = false;
        $("#web-submit").textContent = t("Importar canción");
      }
    }
  };
  $("#file").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importController?.abort();
    importController = new AbortController();
    const signal = importController.signal;
    const generation = importGeneration;
    $("#choose-file").disabled = true;
    $("#choose-file").textContent = t("Importando…");
    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        if (file.size > 10 * 1024 * 1024)
          throw new Error(t("La copia supera el límite de 10 MiB."));
        const content = await file.text();
        let format;
        try {
          format = JSON.parse(content)?.format;
        } catch {
          throw new Error(t("El archivo JSON está dañado o no es compatible."));
        }
        if (generation !== importGeneration || !$("#new-dialog").open) return;
        if (format === "chordleaf-song") {
          const opened = restoreProject(content);
          $("#new-dialog").close();
          onSongs([opened], opened.id);
          toast(t("Proyecto editable abierto."));
          return;
        }
        const restored = restoreWorkspace(content);
        $("#new-dialog").close();
        onSongs(restored.songs, restored.active);
        toast(t("Copia restaurada como nuevas pestañas."));
        return;
      }
      const data = await importFile(file, { signal });
      if (generation !== importGeneration || !$("#new-dialog").open) return;
      await acceptImport(data);
    } catch (error) {
      if (generation === importGeneration && $("#new-dialog").open)
        importError(error);
    } finally {
      if (generation === importGeneration) {
        $("#choose-file").disabled = false;
        $("#choose-file").textContent = t("Elegir documento");
        e.target.value = "";
      }
    }
  };

  return { open: openNewSong };
}
