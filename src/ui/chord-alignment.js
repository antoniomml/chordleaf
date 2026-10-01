import { alignmentLine, moveAlignedChord } from "../chord-alignment.js";
import { t } from "../i18n.js";
import { parseSong } from "../music.js";
import { icon } from "./icons.js";

/** Edit the actual sheet. Source offsets come from the shared export layout,
 * never from padded display text or from the length of a chord's label. */
export function setupChordAlignment({
  song,
  enabled,
  update,
  editVerse,
  finish,
}) {
  const pages = document.querySelector("#pages");
  const scroll = document.querySelector("#pages-scroll");
  const tools = document.createElement("div");
  tools.id = "sheet-alignment-tools";
  tools.hidden = true;
  tools.innerHTML = t`<div class="sheet-alignment-controls" role="toolbar" aria-label="Controles del acorde"><span id="sheet-alignment-selection"></span><button id="sheet-alignment-left" aria-label="Mover una letra a la izquierda" title="Mover una letra a la izquierda"></button><button id="sheet-alignment-right" aria-label="Mover una letra a la derecha" title="Mover una letra a la derecha"></button><button id="sheet-alignment-edit" aria-label="Editar letra del verso" title="Editar letra del verso"></button><button id="sheet-alignment-undo" aria-label="Deshacer último cambio" title="Deshacer último cambio"></button><button id="sheet-alignment-done" aria-label="Listo" title="Listo"></button></div><span id="sheet-alignment-status" class="visually-hidden" role="status" aria-live="polite"></span>`;
  scroll.before(tools);
  const $ = (s) => tools.querySelector(s);
  for (const action of ["left", "right", "edit", "undo", "done"])
    $(`#sheet-alignment-${action}`).innerHTML = icon(action);
  let owner,
    expected,
    layout,
    rows = [],
    selected,
    history = [],
    drag,
    suppressClick = false;
  const target = document.createElement("span");
  target.className = "sheet-alignment-target";
  target.setAttribute("aria-hidden", "true");
  function current() {
    return enabled() && owner === song() && expected === owner?.text;
  }
  function rawFor(row) {
    return owner.text
      .split("\n")
      .slice(row.index, (row.endIndex ?? row.index) + 1)
      .join("\n");
  }
  let cachedModel, cachedText, cachedIndex, cachedEnd;
  function model() {
    if (
      cachedText !== expected ||
      cachedIndex !== selected.index ||
      cachedEnd !== selected.endIndex
    ) {
      cachedModel = alignmentLine(rawFor(selected));
      cachedText = expected;
      cachedIndex = selected.index;
      cachedEnd = selected.endIndex;
    }
    return cachedModel;
  }
  function mark() {
    return model().marks.find((m) => m.start === selected.start);
  }
  function prefix(row) {
    return row.endIndex > row.index
      ? alignmentLine(owner.text.split("\n")[row.index]).lyric.length + 1
      : 0;
  }
  function clearTarget() {
    target.remove();
  }
  function highlight(row, column) {
    row.el.append(target);
    target.style.left = `${column * layout.cw}px`;
    target.style.top = `${row.lyricOffset}px`;
    target.style.width = `${layout.cw}px`;
    target.style.height = `${layout.size * 1.44}px`;
  }
  function selectedChord() {
    return rows
      .flatMap((row) =>
        row.marks.map((m, ordinal) => ({
          row,
          m,
          el: row.el.querySelectorAll(".sheet-chord")[ordinal],
        })),
      )
      .find(
        ({ row, m }) =>
          row.index === selected?.index && m.rawIndex === selected.start,
      );
  }
  function paintSelection() {
    pages
      .querySelectorAll(".sheet-chord.alignment-selected")
      .forEach((el) => el.classList.remove("alignment-selected"));
    clearTarget();
    const chord = current() && selected && selectedChord();
    if (chord) {
      chord.el.classList.add("alignment-selected");
      highlight(chord.row, chord.m.x + (chord.m.anchorOffset || 0));
      const active = mark(),
        line = model();
      $("#sheet-alignment-selection").textContent = chord.m.chord;
      $("#sheet-alignment-edit").disabled = false;
      $("#sheet-alignment-left").disabled = active.at === 0;
      $("#sheet-alignment-right").disabled = active.at === line.lyric.length;
    } else {
      selected = undefined;
      $("#sheet-alignment-selection").textContent = "";
      $("#sheet-alignment-edit").disabled = true;
      $("#sheet-alignment-left").disabled = $(
        "#sheet-alignment-right",
      ).disabled = true;
    }
    for (const id of ["selection", "left", "right", "edit"])
      $(`#sheet-alignment-${id}`).hidden = !chord;
    $("#sheet-alignment-undo").disabled = !history.length;
    tools.hidden = !enabled() || (!chord && !history.length);
  }
  function select(el) {
    const row = rows.find((r) => r.el === el.closest(".song-line"));
    if (
      !current() ||
      !row ||
      row.instrumental ||
      el.classList.contains("unresolved-chord")
    )
      return false;
    selected = {
      index: row.index,
      endIndex: row.endIndex,
      start: Number(el.dataset.alignStart),
    };
    paintSelection();
    return true;
  }
  function move(at) {
    if (!current() || !selected) return;
    const raw = rawFor(selected),
      next = moveAlignedChord(raw, selected.start, at);
    if (next.raw === raw) return;
    history.push({ text: owner.text, selected: { ...selected } });
    if (history.length > 50) history.shift();
    const lines = owner.text.split("\n");
    lines.splice(
      selected.index,
      (selected.endIndex ?? selected.index) - selected.index + 1,
      ...next.raw.split("\n"),
    );
    expected = lines.join("\n");
    const start =
      (selected.index
        ? lines.slice(0, selected.index).join("\n").length + 1
        : 0) + next.start;
    const sourceLine = expected.slice(0, start).split("\n").length - 1;
    const parsed = parseSong(expected).find(
      (row) =>
        row.index <= sourceLine && (row.endIndex ?? row.index) >= sourceLine,
    );
    const beginning = parsed.index
      ? lines.slice(0, parsed.index).join("\n").length + 1
      : 0;
    selected = {
      index: parsed.index,
      endIndex: parsed.endIndex,
      start: start - beginning,
    };
    update(expected);
    selectedChord()?.el.scrollIntoView({ block: "nearest", inline: "nearest" });
    $("#sheet-alignment-status").textContent = t(
      "Acorde movido. Cambios guardados en la canción.",
    );
  }
  function step(delta) {
    if (!current() || !selected) return;
    const line = model(),
      active = mark();
    const index = line.boundaries.findIndex((at) => at >= active.at);
    move(
      line.boundaries[
        Math.max(0, Math.min(line.boundaries.length - 1, index + delta))
      ],
    );
  }
  function atPoint(x, y, useLyric = false) {
    const row = rows.find((row) => {
      if (row.instrumental || row.index !== selected.index) return false;
      const rect = row.el.getBoundingClientRect();
      const minY = useLyric
        ? row.el.querySelector(".lyric").getBoundingClientRect().top
        : rect.top;
      return (
        y >= minY &&
        y <= rect.bottom &&
        x >= rect.left - 10 &&
        x <= rect.right + 10
      );
    });
    if (!row) return;
    const rect = row.el.getBoundingClientRect(),
      cw = (layout.cw * rect.width) / row.width;
    const column = Math.max(
      0,
      Math.min(row.lyric.length, Math.floor((x - rect.left) / cw)),
    );
    const offset =
      row.positions[Math.min(column, row.positions.length - 1)] + prefix(row);
    const line = model();
    const at = line.boundaries.reduce(
      (best, value) =>
        Math.abs(value - offset) < Math.abs(best - offset) ? value : best,
      line.boundaries[0],
    );
    return { row, column, at };
  }
  function previewDrag() {
    if (!drag) return;
    drag.destination = atPoint(drag.x - drag.grab, drag.y);
    clearTarget();
    if (drag.destination) {
      const { row, column } = drag.destination;
      highlight(row, column);
      // Keep the label's chosen central character over the destination cell.
      const rect = row.el.getBoundingClientRect(),
        cw = (layout.cw * rect.width) / row.width;
      drag.ghost.style.left = `${rect.left + (column - drag.offset) * cw}px`;
      drag.ghost.style.top = `${rect.top}px`;
    }
  }
  function animateDrag() {
    if (!drag) return;
    const bounds = scroll.getBoundingClientRect();
    const verse = rows.filter(
      (row) => row.index === selected.index && !row.instrumental,
    );
    const first = verse[0]?.el.getBoundingClientRect(),
      last = verse.at(-1)?.el.getBoundingClientRect();
    if (drag.y > bounds.bottom - 35 && last)
      scroll.scrollTop += Math.min(8, Math.max(0, last.bottom - drag.y));
    else if (drag.y < bounds.top + 35 && first)
      scroll.scrollTop -= Math.min(8, Math.max(0, drag.y - first.top));
    const row = verse.find((row) => {
      const rect = row.el.getBoundingClientRect();
      return drag.y >= rect.top && drag.y <= rect.bottom;
    });
    if (row) {
      const rect = row.el.getBoundingClientRect(),
        cw = (layout.cw * rect.width) / row.width;
      // Stop at the verse's letters: scrolling the paper margin under the
      // finger would discard a valid target at the start or end of a row.
      if (drag.x > bounds.right - 25)
        scroll.scrollLeft += Math.min(
          8,
          Math.max(0, rect.left + row.lyric.length * cw - drag.x),
        );
      else if (drag.x < bounds.left + 25)
        scroll.scrollLeft -= Math.min(8, Math.max(0, drag.x - rect.left));
    }
    previewDrag();
    drag.frame = requestAnimationFrame(animateDrag);
  }
  function stopDrag(commit) {
    if (!drag) return;
    const active = drag;
    drag = undefined;
    cancelAnimationFrame(active.frame);
    active.ghost.remove();
    active.el.classList.remove("alignment-dragging");
    suppressClick = commit && active.moved;
    if (commit && active.moved && active.destination)
      move(active.destination.at);
    paintSelection();
  }
  pages.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary) {
      stopDrag(false);
      return;
    }
    suppressClick = false;
    const el = event.target.closest(".sheet-chord[data-chord]");
    if (!el || event.button !== 0 || !select(el)) return;
    event.preventDefault();
    el.focus({ preventScroll: true });
    const chord = selectedChord(),
      rect = el.getBoundingClientRect();
    const rowRect = chord.row.el.getBoundingClientRect(),
      cw = (layout.cw * rowRect.width) / chord.row.width;
    const offset = chord.m.anchorOffset || 0;
    const ghost = document.createElement("span");
    ghost.className = "sheet-alignment-ghost";
    ghost.textContent = el.textContent;
    ghost.style.fontSize = `${(parseFloat(getComputedStyle(el).fontSize) * rowRect.width) / chord.row.width}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.hidden = true;
    document.body.append(ghost);
    drag = {
      id: event.pointerId,
      el,
      ghost,
      offset,
      x: event.clientX,
      y: event.clientY,
      initialX: event.clientX,
      initialY: event.clientY,
      grab: event.clientX - (rect.left + (offset + 0.5) * cw),
      moved: false,
    };
    el.setPointerCapture(event.pointerId);
  });
  pages.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (
      !drag.moved &&
      Math.hypot(drag.x - drag.initialX, drag.y - drag.initialY) < 4
    )
      return;
    drag.moved = true;
    drag.ghost.hidden = false;
    drag.el.classList.add("alignment-dragging");
    previewDrag();
    if (!drag.frame) drag.frame = requestAnimationFrame(animateDrag);
  });
  pages.addEventListener("pointerup", () => stopDrag(true));
  pages.addEventListener("pointercancel", () => stopDrag(false));
  pages.addEventListener("lostpointercapture", () => stopDrag(false));
  pages.addEventListener("click", (event) => {
    if (!current()) return;
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const el = event.target.closest(".sheet-chord[data-chord]");
    if (el) {
      select(el);
      return;
    }
    if (selected && event.target.closest(".lyric")) {
      const destination = atPoint(event.clientX, event.clientY, true);
      if (destination) move(destination.at);
    }
  });
  pages.addEventListener(
    "keydown",
    (event) => {
      const el = event.target.closest(".sheet-chord[data-chord]");
      if (
        !el ||
        !current() ||
        ![
          "Enter",
          " ",
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End",
          "Escape",
        ].includes(event.key)
      )
        return;
      const row = rows.find((row) => row.el === el.closest(".song-line"));
      if (row?.instrumental) {
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          editVerse(row.el);
        }
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Escape") {
        selected = undefined;
        paintSelection();
        return;
      }
      if (!select(el)) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight")
        step(event.key === "ArrowLeft" ? -1 : 1);
      else if (event.key === "Home") move(0);
      else if (event.key === "End") move(model().lyric.length);
      selectedChord()?.el.focus({ preventScroll: true });
    },
    true,
  );
  $("#sheet-alignment-done").onclick = () => {
    stopDrag(false);
    finish();
  };
  $("#sheet-alignment-edit").onclick = () => {
    if (!current() || !selected) return;
    const row = selectedChord()?.row;
    if (row) editVerse(row.el);
  };
  $("#sheet-alignment-left").onclick = () => step(-1);
  $("#sheet-alignment-right").onclick = () => step(1);
  $("#sheet-alignment-undo").onclick = () => {
    if (!current() || !history.length) return;
    stopDrag(false);
    const old = history.pop();
    selected = old.selected;
    expected = old.text;
    update(expected);
  };
  function refresh(l) {
    if (drag) stopDrag(false);
    if (owner !== song() || expected !== song()?.text) {
      owner = song();
      expected = owner?.text;
      selected = undefined;
      history = [];
    }
    layout = l;
    const elements = [...pages.querySelectorAll(".song-line")];
    rows = l.pages
      .flatMap((p) => p.columns.flat())
      .map((row, index) => ({ ...row, el: elements[index] }));
    rows
      .filter((row) => !row.instrumental)
      .forEach((row) =>
        row.el.querySelectorAll(".sheet-chord[data-chord]").forEach((el) => {
          if (enabled()) {
            el.classList.add("alignable-chord");
            el.setAttribute("role", "button");
            el.setAttribute("aria-label", t`Mover acorde: ${el.textContent}`);
          }
        }),
      );
    pages.classList.toggle("aligning-chords", enabled());
    paintSelection();
  }
  function handles(event) {
    return (
      enabled() &&
      (event.target.closest(".sheet-chord[data-chord]") ||
        (selected && event.target.closest(".lyric")))
    );
  }
  return {
    refresh,
    handles,
    clear() {
      selected = undefined;
      paintSelection();
    },
    tools,
  };
}
