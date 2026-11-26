import {
  CHORD_CLIPBOARD_TYPE,
  chordVerses,
  copyChordRows,
  chordPacketText,
  chordPacketFromText,
  readChordPacket,
  pasteChordRows,
} from "../chord-editing.js";
import { chordRE } from "../music.js";
import { displaySourceBoundary } from "../sheet-selection.js";
import { t } from "../i18n.js";
import { icon } from "./icons.js";
import { setSheetCaret } from "./sheet-draft.js";

/** Chord-only cursor and selection. The printed page and its lyric DOM remain
 * intact; empty verses expose a temporary chord lane from their margin handle. */
export function setupSheetChords({
  song,
  enabled,
  alignment,
  inlineEdits,
  update,
  notify,
}) {
  const pages = document.querySelector("#pages"),
    scroll = document.querySelector("#pages-scroll");
  const controls = document.createElement("span");
  controls.id = "sheet-chord-actions";
  controls.innerHTML = t`<button data-chord-action="copy" aria-label="Copiar acordes" title="Copiar acordes (Ctrl/⌘ C)"></button><button data-chord-action="paste" aria-label="Pegar acordes" title="Pegar acordes (Ctrl/⌘ V)"></button><button data-chord-action="delete" aria-label="Eliminar acordes seleccionados" title="Eliminar acordes seleccionados"></button>`;
  alignment.tools.querySelector(".sheet-alignment-controls").prepend(controls);
  for (const name of ["copy", "paste", "delete"])
    controls.querySelector(`[data-chord-action="${name}"]`).innerHTML =
      icon(name);
  let owner,
    expected,
    layout,
    rows = [],
    selected = [],
    anchor,
    laneRow,
    caret,
    drag,
    input,
    clipboard;
  let suppressClick = false;
  const status = (message) => {
    alignment.tools.querySelector("#sheet-alignment-status").textContent =
      message;
  };
  const current = () =>
    enabled() && owner === song() && expected === owner?.text;
  const range = (first, last) => {
    const verses = chordVerses(owner.text);
    const a = verses.findIndex((row) => row.index === first),
      b = verses.findIndex((row) => row.index === last);
    return a < 0 || b < 0
      ? []
      : verses
          .slice(Math.min(a, b), Math.max(a, b) + 1)
          .map((row) => row.index);
  };
  function active() {
    return current() && Boolean(selected.length || caret);
  }
  const fieldValue = () => input?.textContent ?? "";
  function paint() {
    for (const row of rows) {
      row.el.classList.toggle(
        "chord-row-selected",
        current() && selected.includes(row.index),
      );
      row.el
        .querySelector(".sheet-chord-handle")
        ?.setAttribute(
          "aria-pressed",
          String(current() && selected.includes(row.index)),
        );
      const lane = row.el.querySelector(".sheet-chord-lane");
      if (lane)
        lane.hidden =
          row.lyricOffset === 0 &&
          !(
            selected.length === 1 &&
            laneRow?.index === row.index &&
            laneRow.offset === row.offset
          ) &&
          !(caret?.index === row.index && caret.offset === row.offset);
    }
    pages
      .querySelectorAll(".sheet-chord-caret, .sheet-chord-letter")
      .forEach((el) => el.remove());
    if (current() && caret) {
      const row =
        rows.find(
          (row) => row.index === caret.index && row.offset === caret.offset,
        ) || rows.find((row) => row.index === caret.index);
      if (row) {
        const marker = document.createElement("span");
        marker.className = "sheet-chord-caret";
        marker.style.left = `${caret.column * layout.cw}px`;
        marker.style.top = `${row.lyricOffset ? 0 : -layout.size * 1.6}px`;
        marker.style.height = `${layout.size * 1.44}px`;
        row.el.append(marker);
        const letter = document.createElement("span");
        letter.className = "sheet-chord-letter";
        letter.style.left = `${caret.column * layout.cw}px`;
        letter.style.top = `${row.lyricOffset}px`;
        letter.style.width = `${layout.cw}px`;
        letter.style.height = `${layout.size * 1.44}px`;
        row.el.append(letter);
      }
    }
    const single = alignment.selection();
    controls.hidden = !active();
    controls.querySelector('[data-chord-action="copy"]').disabled =
      !selected.length && !single;
    controls.querySelector('[data-chord-action="delete"]').disabled =
      !selected.length && !single;
    controls.querySelector('[data-chord-action="paste"]').disabled =
      !active() && !single;
    alignment.repaint();
  }
  function clear() {
    selected = [];
    anchor = undefined;
    laneRow = undefined;
    caret = undefined;
    paint();
  }
  function choose(
    index,
    extend = false,
    offset = rows.find((row) => row.index === index)?.offset,
  ) {
    if (!inlineEdits.finish()) return;
    alignment.clear();
    anchor = extend && anchor !== undefined ? anchor : index;
    selected = range(anchor, index);
    laneRow = { index, offset };
    caret = undefined;
    window.getSelection()?.removeAllRanges();
    scroll.focus({ preventScroll: true });
    paint();
    status(t`${selected.length} filas de acordes seleccionadas`);
  }
  function point(row, x) {
    const rect = row.el.getBoundingClientRect(),
      cw = (layout.cw * rect.width) / row.width;
    const column = Math.max(
      0,
      Math.min(
        Math.floor(row.width / layout.cw) - 1,
        Math.floor((x - rect.left) / cw),
      ),
    );
    const verse = chordVerses(owner.text).find(
      (verse) => verse.index === row.index,
    );
    const mappedColumn =
      rows.findLast((candidate) => candidate.index === row.index) === row
        ? column
        : Math.min(column, row.positions?.length ?? row.lyric.length);
    const mapped = displaySourceBoundary(row.positions, mappedColumn);
    const at =
      mapped > verse.lyric.length
        ? mapped
        : verse.boundaries.reduce(
            (best, value) =>
              Math.abs(value - mapped) < Math.abs(best - mapped) ? value : best,
            0,
          );
    return { index: row.index, offset: row.offset, column, at };
  }
  function place(position) {
    alignment.clear();
    selected = [];
    anchor = undefined;
    caret = position;
    window.getSelection()?.removeAllRanges();
    scroll.focus({ preventScroll: true });
    paint();
  }
  function begin(position, value = "") {
    if (!inlineEdits.finish()) return;
    place(position);
    const row =
      rows.find(
        (row) => row.index === position.index && row.offset === position.offset,
      ) || rows.find((row) => row.index === position.index);
    if (!row) return;
    input = document.createElement("span");
    input.className = "sheet-chord inline-chord-editor sheet-new-chord-editor";
    input.setAttribute("aria-label", t("Nuevo acorde"));
    input.setAttribute("role", "textbox");
    input.setAttribute("aria-multiline", "false");
    input.contentEditable = "plaintext-only";
    input.spellcheck = false;
    input.textContent = value;
    input.style.left = `${position.column * layout.cw}px`;
    input.style.top = `${row.lyricOffset ? 0 : -layout.size * 1.6}px`;
    row.el.append(input);
    const target = owner,
      original = owner.text,
      field = input;
    inlineEdits.start(field, {
      history: true,
      deferred: true,
      singleLine: true,
      readInput: () => field.textContent,
      writeInput: (value) => {
        field.textContent = value;
      },
      afterInput() {
        field.style.left = `${position.column * layout.cw - Math.floor(Math.max(0, field.textContent.length - 1) / 2) * layout.cw}px`;
      },
      get: () => target.text,
      set: (text) => {
        target.text = text;
      },
      read() {
        const chord = field.textContent.trim();
        if (!chord) return original;
        if (!chordRE.test(chord))
          throw new Error(
            t("Introduce un acorde válido, por ejemplo C o Em7."),
          );
        return pasteChordRows(original, position.index, {
          version: 1,
          rows: [{ marks: [{ at: position.at, chord }] }],
        });
      },
    });
    setSheetCaret(field, field.textContent.length);
  }
  function packet() {
    if (selected.length)
      return copyChordRows(owner.text, selected[0], selected.at(-1));
    const single = alignment.selection();
    if (!single) return;
    return { version: 1, rows: [{ marks: [{ at: 0, chord: single.chord }] }] };
  }
  function captureCopy(event) {
    const data = packet();
    if (!data || !current()) return false;
    clipboard = data;
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.clipboardData.setData(CHORD_CLIPBOARD_TYPE, JSON.stringify(data));
      event.clipboardData.setData("text/plain", chordPacketText(data));
    }
    status(t("Acordes copiados. Selecciona el destino para pegarlos."));
    paint();
    return true;
  }
  function paste(data) {
    if (!data || !current()) return;
    const destination = caret
      ? { ...caret }
      : selected.length
        ? { index: selected[0], at: 0 }
        : alignment.selection();
    if (!destination) return;
    const replacing = selected.length > 0,
      last = selected.at(-1);
    if (
      !inlineEdits.finish({
        cancel: Boolean(input?.isConnected && !fieldValue().trim()),
      })
    )
      return;
    try {
      const next = pasteChordRows(owner.text, destination.index, data, {
        at: destination.at ?? 0,
        replace: replacing,
        last,
      });
      if (update(next) === false) return;
      selected = [];
      caret = undefined;
      anchor = undefined;
      scroll.focus({ preventScroll: true });
      paint();
      status(t("Acordes pegados. La letra se mantiene."));
    } catch (error) {
      notify(error.message, "warning");
    }
  }
  function remove() {
    if (!current() || !inlineEdits.finish()) return;
    if (selected.length) {
      const data = { version: 1, rows: selected.map(() => ({ marks: [] })) };
      paste(data);
      return;
    }
    const single = alignment.selection();
    if (!single) return;
    const lines = owner.text.split("\n");
    lines[single.index] =
      lines[single.index].slice(0, single.start) +
      lines[single.index].slice(single.start + single.chord.length + 2);
    update(lines.join("\n"));
    scroll.focus({ preventScroll: true });
  }
  controls.addEventListener("pointerdown", (event) => {
    if (event.button === 0) event.preventDefault();
  });
  controls.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-chord-action]")?.dataset
      .chordAction;
    if (action === "delete") remove();
    if (action === "copy" && captureCopy()) {
      try {
        await navigator.clipboard.writeText(chordPacketText(clipboard));
      } catch {
        notify(
          t(
            "Acordes copiados en Chordleaf. Usa Ctrl/⌘ C para copiarlos a otra aplicación.",
          ),
        );
      }
    }
    if (action === "paste") {
      const target = owner,
        text = expected,
        destination = JSON.stringify({ selected, caret });
      try {
        const value = await navigator.clipboard.readText();
        if (
          target !== song() ||
          text !== expected ||
          destination !== JSON.stringify({ selected, caret })
        )
          return;
        const data =
          clipboard && value === chordPacketText(clipboard)
            ? clipboard
            : chordPacketFromText(value);
        if (data) paste(data);
        else
          notify(
            t("El portapapeles no contiene una fila de acordes."),
            "warning",
          );
      } catch {
        if (
          target !== song() ||
          text !== expected ||
          destination !== JSON.stringify({ selected, caret })
        )
          return;
        if (clipboard) paste(clipboard);
        else notify(t("Usa Ctrl/⌘ V para pegar los acordes."));
      }
    }
  });
  pages.addEventListener(
    "pointerdown",
    (event) => {
      if (
        !current() ||
        !event.isPrimary ||
        event.button !== 0 ||
        event.target.closest(".inline-editor, .inline-chord-editor")
      )
        return;
      const handle = event.target.closest(".sheet-chord-handle"),
        lane = event.target.closest(".sheet-chord-lane"),
        chord = event.target.closest(".sheet-chord");
      if (!handle && !lane && !(event.shiftKey && chord)) {
        if (event.target.closest(".lyric")) clear();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const el = event.target.closest(".song-line"),
        index = Number(el.dataset.line),
        offset = rows.find((row) => row.el === el)?.offset;
      if (!inlineEdits.finish()) return;
      const row = rows.find(
        (row) => row.index === index && row.offset === offset,
      );
      if (!row) return;
      if (handle || event.shiftKey) {
        choose(index, event.shiftKey, offset);
        if (handle && !event.shiftKey)
          drag = {
            index,
            x: event.clientX,
            y: event.clientY,
            touch: false,
            moved: false,
            selection: true,
          };
        suppressClick = true;
        return;
      }
      drag = {
        index,
        position: point(row, event.clientX),
        x: event.clientX,
        y: event.clientY,
        touch: event.pointerType === "touch",
        moved: false,
      };
      scroll.focus({ preventScroll: true });
    },
    true,
  );
  document.addEventListener("pointermove", (event) => {
    if (!drag) return;
    if (!(event.buttons & 1)) {
      drag = undefined;
      return;
    }
    if (
      Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5 &&
      !drag.moved
    )
      return;
    if (drag.touch) {
      drag = undefined;
      return;
    }
    drag.moved = true;
    const row = rows.reduce((best, row) => {
      const rect = row.el.getBoundingClientRect(),
        distance =
          Math.abs(event.clientY - (rect.top + rect.height / 2)) +
          Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
      return !best || distance < best.distance ? { row, distance } : best;
    }, null)?.row;
    if (row) {
      anchor = drag.index;
      selected = range(anchor, row.index);
      caret = undefined;
      alignment.clear();
      paint();
    }
    const bounds = scroll.getBoundingClientRect();
    if (event.clientY > bounds.bottom - 25) scroll.scrollTop += 12;
    if (event.clientY < bounds.top + 25) scroll.scrollTop -= 12;
    event.preventDefault();
  });
  document.addEventListener("pointerup", () => {
    if (!drag) return;
    const previous = drag;
    drag = undefined;
    suppressClick = true;
    if (previous.moved || previous.selection) {
      scroll.focus({ preventScroll: true });
      status(t`${selected.length} filas de acordes seleccionadas`);
    } else begin(previous.position);
  });
  document.addEventListener("pointercancel", () => {
    drag = undefined;
  });
  pages.addEventListener(
    "click",
    (event) => {
      if (event.detail === 0 && event.target.closest(".sheet-chord-handle"))
        choose(
          Number(event.target.closest(".song-line").dataset.line),
          event.shiftKey,
        );
      if (
        suppressClick ||
        event.target.closest(".sheet-chord-lane, .sheet-chord-handle")
      ) {
        suppressClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  scroll.addEventListener(
    "copy",
    (event) => {
      if (!event.target.closest("input, textarea, [contenteditable]"))
        captureCopy(event);
    },
    true,
  );
  scroll.addEventListener(
    "cut",
    (event) => {
      if (
        !event.target.closest("input, textarea, [contenteditable]") &&
        captureCopy(event)
      )
        remove();
    },
    true,
  );
  document.addEventListener(
    "paste",
    (event) => {
      if (
        !current() ||
        (!scroll.contains(event.target) && event.target !== input)
      )
        return;
      if (
        event.target.closest("input, textarea, [contenteditable]") &&
        (event.target !== input || fieldValue().trim())
      )
        return;
      if (!active() && !alignment.selection()) return;
      const text = event.clipboardData.getData("text/plain");
      const data =
        readChordPacket(event.clipboardData.getData(CHORD_CLIPBOARD_TYPE)) ||
        (clipboard && text === chordPacketText(clipboard)
          ? clipboard
          : chordPacketFromText(text));
      if (!data) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      paste(data);
    },
    true,
  );
  scroll.addEventListener("keydown", (event) => {
    if (
      !current() ||
      event.isComposing ||
      event.target.closest("input, textarea, [contenteditable]")
    )
      return;
    if (!active() && !alignment.selection()) return;
    if (event.key === "Escape") {
      event.preventDefault();
      clear();
      return;
    }
    if (["Delete", "Backspace"].includes(event.key)) {
      event.preventDefault();
      remove();
      return;
    }
    if (event.shiftKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      const verses = chordVerses(owner.text),
        last = selected.at(-1) ?? caret?.index;
      const index = verses.findIndex((row) => row.index === last);
      choose(
        verses[
          Math.max(
            0,
            Math.min(
              verses.length - 1,
              index + (event.key === "ArrowDown" ? 1 : -1),
            ),
          )
        ].index,
        true,
      );
      return;
    }
    if (
      caret &&
      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    ) {
      event.preventDefault();
      const verse = chordVerses(owner.text).find(
        (row) => row.index === caret.index,
      );
      const at =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? verse.lyric.length
            : Math.max(0, caret.at + (event.key === "ArrowRight" ? 1 : -1));
      caret = {
        ...caret,
        at,
        column: Math.max(0, caret.column + at - caret.at),
      };
      paint();
      return;
    }
    if (
      caret &&
      (event.key === "Enter" ||
        (!event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          /^[A-G]$/.test(event.key)))
    ) {
      event.preventDefault();
      begin(caret, event.key === "Enter" ? "" : event.key);
    }
  });
  function refresh(value) {
    if (owner !== song() || expected !== song()?.text || !enabled()) {
      selected = [];
      caret = undefined;
      anchor = undefined;
      drag = undefined;
    }
    owner = song();
    expected = owner?.text;
    layout = value;
    const elements = [...pages.querySelectorAll(".song-line")];
    rows = value.pages
      .flatMap((page) => page.columns.flat())
      .map((row, i) => ({ ...row, el: elements[i] }));
    if (!input?.isConnected) input = undefined;
    if (enabled())
      for (const row of rows) {
        const handle = document.createElement("button");
        handle.className = "sheet-chord-handle";
        handle.type = "button";
        handle.setAttribute("aria-label", t("Seleccionar fila de acordes"));
        handle.title = t(
          "Seleccionar acordes · Mayús para ampliar la selección",
        );
        handle.style.height = `${layout.size * 1.44}px`;
        row.el.prepend(handle);
        if (row.instrumental) continue;
        const lane = document.createElement("button");
        lane.className = "sheet-chord-lane";
        lane.type = "button";
        lane.setAttribute(
          "aria-label",
          t("Fila de acordes: haz clic para escribir"),
        );
        lane.style.height = `${layout.size * 1.44}px`;
        lane.style.top = `${row.lyricOffset ? 0 : -layout.size * 1.6}px`;
        if (!row.lyricOffset) lane.classList.add("empty-chord-lane");
        row.el.prepend(lane);
        lane.addEventListener("keydown", (event) => {
          if (["Enter", " "].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            begin({
              index: row.index,
              offset: row.offset,
              column: 0,
              at: row.positions?.[0] ?? 0,
            });
          }
        });
      }
    paint();
  }
  return { refresh, clear, active };
}
