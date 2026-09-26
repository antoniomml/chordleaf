import { importSavedWebPage } from "../local-web-import.js";

export function setupLocalWebImport({ onImport, onChange }) {
  const $ = (selector) => document.querySelector(selector);
  const url = $("#web-url");
  const options = $("#web-local-options");
  const file = $("#web-local-file");
  const button = $("#web-file-button");
  let generation = 0;

  function reset() {
    generation++;
    file.value = "";
    options.open = false;
    options.hidden = true;
    button.disabled = false;
  }
  url.addEventListener("input", () => {
    reset();
    onChange();
  });
  button.onclick = () => file.click();
  file.onchange = async () => {
    const selected = file.files[0];
    file.value = "";
    if (!selected) return;
    const current = generation;
    button.disabled = true;
    try {
      await onImport((signal) =>
        importSavedWebPage(selected, url.value.trim(), { signal }),
      );
    } finally {
      if (current === generation) button.disabled = false;
    }
  };
  return {
    show() {
      options.hidden = false;
      options.open = false;
    },
    reset,
  };
}
