import { isMobileLayout } from "../mobile-layout.js";
import { t } from "../i18n.js";

/** Browsers append an empty caret line after a native terminal line break.
 * Keep actual user-authored newlines, excluding only that final DOM filler. */
export function readSheetLyrics(input) {
  const text = input.innerText.replace(/\r/g, "");
  const last = input.lastChild;
  if (last?.nodeName === "BR" && text.endsWith("\n")) return text.slice(0, -1);
  if (
    last?.nodeType === 3 &&
    last.textContent === "\n" &&
    text.endsWith("\n\n")
  )
    return text.slice(0, -1);
  return text;
}

/** Keep the native caret at the clicked character, including transformed and
 * zoomed pages. The existing lyric node stays in place while it is edited. */
export function placeLyricCaret(input, event) {
  let range;
  if (event?.clientX !== undefined) {
    if (document.caretPositionFromPoint) {
      const point = document.caretPositionFromPoint(
        event.clientX,
        event.clientY,
      );
      if (point && input.contains(point.offsetNode)) {
        range = document.createRange();
        range.setStart(point.offsetNode, point.offset);
      }
    } else {
      const point = document.caretRangeFromPoint?.(
        event.clientX,
        event.clientY,
      );
      if (point && input.contains(point.startContainer)) range = point;
    }
  }
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(input);
    range.collapse(!event);
  }
  range.collapse(true);
  input.focus({ preventScroll: true });
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

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
