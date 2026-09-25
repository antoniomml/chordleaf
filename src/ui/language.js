import { getLocale, t } from "../i18n.js";

export function setupLanguagePicker({ persist, toast }) {
  const button = document.querySelector("#language");
  const label = document.querySelector("#language-label");
  const menu = document.querySelector("#language-menu");
  const options = [...menu.querySelectorAll("[data-language]")];
  const state = { switching: false };

  document.documentElement.lang = getLocale();
  // Keep the running document title in sync with the SEO titles emitted by
  // build/metadata.js for the static entries.
  document.title =
    getLocale() === "en"
      ? "Chordleaf — Lyrics & Guitar Chords Editor | Free PDF Sheets"
      : "Chordleaf — Editor de letras y acordes | Hojas PDF gratis";

  function close({ focus = false } = {}) {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (focus) button.focus();
  }

  function open(focusIndex = 0) {
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
    options[focusIndex]?.focus();
  }

  label.textContent = getLocale().toUpperCase();
  button.setAttribute("aria-label", `${t("Idioma")}: ${label.textContent}`);
  for (const option of options) {
    option.setAttribute(
      "aria-checked",
      String(option.dataset.language === getLocale()),
    );
    option.onclick = () => {
      if (!persist()) {
        close();
        return;
      }
      try {
        localStorage.setItem("chordleaf-language", option.dataset.language);
        state.switching = true;
        location.assign(`/${option.dataset.language}/`);
      } catch {
        close();
        toast(t("No se pudo guardar · exporta una copia"), "error");
      }
    };
  }

  button.onclick = () => (menu.hidden ? open() : close());
  button.onkeydown = (event) => {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    open(event.key === "ArrowDown" ? 0 : options.length - 1);
  };
  menu.onkeydown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close({ focus: true });
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = options.indexOf(document.activeElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? options.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : options.length - 1)) %
            options.length;
    options[next].focus();
  };
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".language-wrap")) close();
  });

  return state;
}
