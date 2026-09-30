import { t } from "../i18n.js";

export function setupClipboardImport({ active, accept, reportError }) {
  const button = document.getElementById("clipboard-import");
  const hint = document.getElementById("clipboard-hint");
  let generation = 0,
    authorized = false,
    busy = false;
  function render(text, available = false) {
    button.disabled = busy || !available;
    hint.textContent = t(text);
  }
  function showText(text) {
    render(
      text.trim() ? "Crear canción con el texto copiado" : "Portapapeles vacío",
      Boolean(text.trim()),
    );
  }
  async function refresh() {
    const current = ++generation;
    if (!navigator.clipboard?.readText) {
      render("Portapapeles no disponible en este navegador");
      return;
    }
    try {
      const permission = await navigator.permissions
        ?.query({ name: "clipboard-read" })
        .catch(() => null);
      if (current !== generation || !active()) return;
      if (permission?.state === "denied") {
        render("Acceso al portapapeles bloqueado");
        return;
      }
      if (permission?.state !== "granted" && !authorized) {
        render("Crear canción con el texto copiado", true);
        return;
      }
      const text = await navigator.clipboard.readText();
      if (current === generation && active()) showText(text);
    } catch {
      if (current === generation && active())
        render("Crear canción con el texto copiado", true);
    }
  }
  async function read() {
    const current = ++generation;
    busy = true;
    button.disabled = true;
    // Read on the user's click. Never request clipboard access on page load.
    try {
      const text = await navigator.clipboard.readText();
      if (current !== generation || !active()) return;
      authorized = true;
      if (text.trim()) await accept(text);
      if (current === generation && active()) {
        busy = false;
        showText(text);
      }
    } catch (error) {
      if (current === generation && active()) {
        busy = false;
        if (error.name === "NotAllowedError") {
          authorized = false;
          render("No se pudo acceder al portapapeles", true);
        } else {
          await refresh();
          if (active()) reportError(error);
        }
      }
    } finally {
      if (current === generation) busy = false;
    }
  }
  button.onclick = read;
  window.addEventListener("focus", () => {
    if (active() && !busy) refresh();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && active() && !busy) refresh();
  });
  return {
    refresh,
    reset() {
      generation++;
      busy = false;
      render(
        "Crear canción con el texto copiado",
        Boolean(navigator.clipboard?.readText),
      );
    },
  };
}
