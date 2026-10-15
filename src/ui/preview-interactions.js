import { t } from "../i18n.js";

/** Delegate sheet events instead of allocating handlers for every preview row. */
export function setupPreviewInteractions({
  song,
  editing,
  inlineEdits,
  alignment,
  editLine,
}) {
  const pages = document.querySelector("#pages");
  pages.addEventListener("pointerdown", (event) => {
    const active = document.activeElement?.closest(
      ".inline-editor, .inline-chord-editor",
    );
    if (
      !editing() ||
      event.button !== 0 ||
      !active ||
      active.contains(event.target) ||
      !event.target.closest(".song-line")
    )
      return;
    // Commit before the browser blurs the old field and resolves the new focus
    // target. Rendering during blur would remove that target mid-click.
    event.preventDefault();
    if (!inlineEdits.finish()) {
      event.stopImmediatePropagation();
      return;
    }
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const line = target?.closest(".song-line");
    if (
      line &&
      !target.closest(".sheet-chord, .sheet-chord-lane, .sheet-chord-handle")
    )
      editLine(line, event);
  });
  pages.addEventListener("focusin", (event) => {
    if (!editing()) return;
    const header = event.target.closest("[data-header]");
    if (!header) return;
    const target = song();
    const name = header.dataset.header;
    const original = target[name],
      display = header.innerText;
    inlineEdits.start(header, {
      get: () => target[name],
      set: (value) => (target[name] = value),
      readInput: () => header.innerText,
      writeInput: (value) => (header.innerText = value),
      read: () =>
        header.innerText === display
          ? original
          : header.innerText.replace(/\n/g, " ").trim(),
      validate(value) {
        if (value.length > (name === "title" ? 90 : 100))
          throw new Error(t("El título o artista es demasiado largo."));
      },
      rejectInvalid: true,
    });
  });
  pages.addEventListener("click", (event) => {
    if (!editing()) return;
    const line = event.target.closest(".song-line");
    if (
      line &&
      !event.target.closest(
        ".inline-editor, .inline-chord-editor, .sheet-chord-lane, .sheet-chord-handle",
      ) &&
      !alignment().handles(event) &&
      !event.target.closest(".unresolved-chord")
    )
      editLine(line, event);
  });
  pages.addEventListener("keydown", (event) => {
    if (
      !editing() ||
      event.target.closest(
        ".sheet-chord, .inline-editor, .inline-chord-editor, .sheet-chord-lane, .sheet-chord-handle",
      )
    )
      return;
    const line = event.target.closest(".song-line");
    if (
      line &&
      ["Enter", " "].includes(event.key) &&
      !event.target.closest(".unresolved-chord")
    ) {
      event.preventDefault();
      editLine(line);
    }
  });
}
