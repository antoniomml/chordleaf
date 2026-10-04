import { isMobileLayout } from "../mobile-layout.js";
import { t } from "../i18n.js";

/** Put the same sheet input in the top layer on phones. Page transforms must
 * never scale the keyboard field or make a long lyric wider than the screen. */
export function setupSheetEditor({ finish }) {
  const dialog = document.querySelector("#sheet-edit-dialog");
  const field = document.querySelector("#sheet-edit-field");
  const done = document.querySelector("#sheet-edit-done");
  const cancel = document.querySelector("#sheet-edit-cancel");
  for (const button of [done, cancel]) {
    const retainFocus = (event) => {
      // Keep the keyboard field focused until click. Otherwise Safari moves
      // the dialog as the keyboard closes, taking the button out of the tap.
      if (event.button === 0) event.preventDefault();
    };
    button.addEventListener("pointerdown", retainFocus);
    button.addEventListener("mousedown", retainFocus);
  }
  done.onclick = () => finish();
  cancel.onclick = () => finish({ cancel: true });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    finish({ cancel: true });
  });
  return {
    open(input, kind) {
      if (!isMobileLayout()) return;
      document.querySelector("#sheet-edit-title").textContent = t(
        kind === "chord" ? "Editar acorde" : "Editar letra del verso",
      );
      document.querySelector("#sheet-edit-help").hidden = kind === "chord";
      field.replaceChildren(input);
      dialog.showModal();
      return dialog;
    },
    close() {
      if (!dialog.open) return;
      field.replaceChildren();
      dialog.close();
    },
  };
}
