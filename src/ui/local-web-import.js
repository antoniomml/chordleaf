import { importText } from "../files.js";
import { importSavedWebPage, parseWebClipboard } from "../local-web-import.js";
import { songUrl } from "../web-sources.js";
import { t } from "../i18n.js";

export function setupLocalWebImport({ onImport, onError }) {
  const $ = (selector) => document.querySelector(selector);
  const url = $("#web-url");
  const open = $("#web-open");
  const options = $("#web-local-options");
  const paste = $("#web-paste");
  const file = $("#web-local-file");
  let metadata = null;
  let generation = 0;

  function updateLink() {
    try {
      open.href = songUrl(url.value.trim()).href;
      open.hidden = false;
    } catch {
      open.hidden = true;
      open.removeAttribute("href");
    }
  }
  url.addEventListener("input", updateLink);
  paste.addEventListener("paste", (event) => {
    if (!event.clipboardData) return;
    // Only process a deliberate paste. No clipboard permission is requested.
    event.preventDefault();
    metadata = null;
    try {
      const data = parseWebClipboard({
        html: event.clipboardData.getData("text/html"),
        text: event.clipboardData.getData("text/plain"),
        sourceUrl: url.value.trim(),
      });
      metadata = data;
      paste.value = data.text;
    } catch (error) {
      onError(error);
    }
  });
  async function run(read) {
    const current = generation;
    $("#web-paste-submit").disabled = true;
    $("#web-file-button").disabled = true;
    try {
      await onImport(read);
    } finally {
      if (current === generation) {
        $("#web-paste-submit").disabled = false;
        $("#web-file-button").disabled = false;
      }
    }
  }
  $("#web-paste-submit").onclick = () =>
    run(() => {
      if (!paste.value.trim())
        throw new Error(t("Pega la letra y los acordes antes de importar."));
      const data = importText(
        paste.value,
        metadata?.title || t("Canción importada"),
      );
      return {
        ...data,
        artist: data.artist || metadata?.artist || "",
        capo: data.capo || metadata?.capo || 0,
      };
    });
  $("#web-file-button").onclick = () => file.click();
  file.onchange = () => {
    const selected = file.files[0];
    file.value = "";
    if (selected)
      run((signal) =>
        importSavedWebPage(selected, url.value.trim(), { signal }),
      );
  };
  return {
    show() {
      options.open = true;
      updateLink();
    },
    reset() {
      generation++;
      metadata = null;
      paste.value = "";
      file.value = "";
      options.open = false;
      $("#web-paste-submit").disabled = false;
      $("#web-file-button").disabled = false;
      updateLink();
    },
  };
}
