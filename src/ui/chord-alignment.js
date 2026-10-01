import { alignmentLine, moveAlignedChord } from "../chord-alignment.js";
import { chordLabel, parseSong } from "../music.js";
import { escapeHtml as esc } from "./html.js";
import { t } from "../i18n.js";

export function setupChordAlignment({ song, update }) {
  const dialog = document.createElement("dialog");
  dialog.id = "alignment-dialog";
  dialog.setAttribute("aria-labelledby", "alignment-title");
  dialog.innerHTML = t`<div class="alignment-heading"><h2 id="alignment-title">Alinear acordes</h2><button id="alignment-close">Listo</button></div>
    <p id="alignment-help">Elige un acorde y arrástralo sobre la letra, o toca su destino. Las flechas lo mueven letra a letra.</p>
    <label class="alignment-verse-label" for="alignment-verse">Verso</label><select id="alignment-verse"></select>
    <div id="alignment-chords" aria-label="Acordes del verso"></div>
    <div id="alignment-scroll" tabindex="0" role="region" aria-label="Letra para alinear acordes"><div id="alignment-track"><button id="alignment-handle" aria-describedby="alignment-help"></button><div id="alignment-letters"></div></div></div>
    <div class="alignment-controls"><button id="alignment-left" aria-label="Mover una letra a la izquierda">←</button><button id="alignment-right" aria-label="Mover una letra a la derecha">→</button><button id="alignment-undo">Deshacer</button></div>
    <p id="alignment-status" role="status" aria-live="polite"></p>`;
  document.body.append(dialog);
  const $ = (s) => dialog.querySelector(s);
  const picker = $("#alignment-verse"),
    chips = $("#alignment-chords"),
    scroll = $("#alignment-scroll"),
    track = $("#alignment-track"),
    handle = $("#alignment-handle"),
    letters = $("#alignment-letters");
  let owner, expected, rows, index, selected, model, raw, history, drag;
  const cell = 16;
  function current() {
    if (owner !== song() || expected !== owner.text) {
      dialog.close();
      return false;
    }
    return true;
  }
  function read() {
    const row = rows[index];
    raw = owner.text
      .split("\n")
      .slice(row.index, (row.endIndex ?? row.index) + 1)
      .join("\n");
    model = alignmentLine(raw);
    if (!model.marks.some((m) => m.start === selected))
      selected = model.marks[0]?.start;
  }
  const mark = () => model.marks.find((m) => m.start === selected);
  const position = (at) => model.boundaries.indexOf(at);
  const visualPosition = (at) =>
    at === model.lyric.length
      ? model.segments.length
      : model.segments.findIndex((s) => s.index === at);
  function paintPosition(at) {
    handle.style.left = `${visualPosition(at) * cell}px`;
    letters.querySelectorAll("[data-at]").forEach((el) => {
      el.classList.toggle(
        "alignment-destination",
        Number(el.dataset.at) === at,
      );
    });
  }
  function render({ reveal = false } = {}) {
    read();
    const active = mark();
    picker.value = String(index);
    chips.innerHTML = model.marks
      .map(
        (m) =>
          `<button data-start="${m.start}" aria-pressed="${m.start === selected}">${esc(chordLabel(m.chord, owner.notation))}</button>`,
      )
      .join("");
    letters.innerHTML =
      model.segments
        .map(
          (s) =>
            `<span ${model.boundaries.includes(s.index) ? `data-at="${s.index}"` : ""} aria-hidden="true">${esc(s.segment === "\n" ? "↵" : s.segment)}</span>`,
        )
        .join("") +
      `<span data-at="${model.lyric.length}" aria-hidden="true">▏</span>`;
    scroll.setAttribute(
      "aria-label",
      t`Letra para alinear acordes: ${model.lyric}`,
    );
    track.style.width = `${(model.segments.length + 1) * cell + 90}px`;
    handle.textContent = chordLabel(active.chord, owner.notation);
    handle.setAttribute("aria-label", t`Mover acorde: ${handle.textContent}`);
    paintPosition(active.at);
    $("#alignment-left").disabled = active.at === 0;
    $("#alignment-right").disabled = active.at === model.lyric.length;
    $("#alignment-undo").disabled = !history.length;
    $("#alignment-status").textContent =
      t`Posición ${position(active.at) + 1} de ${model.boundaries.length}. Cambios guardados en la canción.`;
    if (reveal)
      scroll.scrollLeft = Math.max(
        0,
        visualPosition(active.at) * cell - scroll.clientWidth / 2,
      );
  }
  function move(at, reveal = false) {
    if (!current()) return;
    const next = moveAlignedChord(raw, selected, at);
    if (next.raw === raw) return;
    history.push({ text: owner.text, index, selected });
    if (history.length > 50) history.shift();
    const lines = owner.text.split("\n"),
      row = rows[index];
    lines.splice(
      row.index,
      (row.endIndex ?? row.index) - row.index + 1,
      ...next.raw.split("\n"),
    );
    expected = lines.join("\n");
    selected = next.start;
    update(expected);
    render({ reveal });
  }
  function step(delta) {
    move(
      model.boundaries[
        Math.max(
          0,
          Math.min(model.boundaries.length - 1, position(mark().at) + delta),
        )
      ],
    );
    scroll.scrollLeft = Math.max(
      0,
      visualPosition(mark().at) * cell - scroll.clientWidth / 2,
    );
  }
  chips.onclick = (event) => {
    const button = event.target.closest("[data-start]");
    if (!button || !current()) return;
    selected = Number(button.dataset.start);
    render({ reveal: true });
    handle.focus({ preventScroll: true });
  };
  picker.onchange = () => {
    if (!current()) return;
    index = Number(picker.value);
    selected = undefined;
    render({ reveal: true });
  };
  letters.onclick = (event) => {
    const letter = event.target.closest("[data-at]");
    if (letter) move(Number(letter.dataset.at));
  };
  $("#alignment-left").onclick = () => step(-1);
  $("#alignment-right").onclick = () => step(1);
  $("#alignment-undo").onclick = () => {
    if (!current() || !history.length) return;
    const prior = history.pop();
    expected = prior.text;
    index = prior.index;
    selected = prior.selected;
    update(expected);
    render({ reveal: true });
  };
  handle.onkeydown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") move(0, true);
    else if (event.key === "End") move(model.lyric.length, true);
    else step(event.key === "ArrowLeft" ? -1 : 1);
  };
  function targetAt(x) {
    const offset = x - track.getBoundingClientRect().left - drag.grab;
    const column = Math.max(
      0,
      Math.min(model.segments.length, Math.round(offset / cell)),
    );
    const at = model.segments[column]?.index ?? model.lyric.length;
    return model.boundaries.reduce(
      (best, value) =>
        Math.abs(value - at) < Math.abs(best - at) ? value : best,
      0,
    );
  }
  function animateDrag() {
    if (!drag) return;
    const bounds = scroll.getBoundingClientRect();
    if (drag.x > bounds.right - 30) scroll.scrollLeft += 8;
    else if (drag.x < bounds.left + 30) scroll.scrollLeft -= 8;
    drag.at = targetAt(drag.x);
    paintPosition(drag.at);
    drag.frame = requestAnimationFrame(animateDrag);
  }
  handle.onpointerdown = (event) => {
    if (!event.isPrimary || event.button !== 0 || !current()) return;
    event.preventDefault();
    handle.focus({ preventScroll: true });
    drag = {
      id: event.pointerId,
      x: event.clientX,
      at: mark().at,
      grab: event.clientX - handle.getBoundingClientRect().left,
    };
    handle.setPointerCapture(event.pointerId);
    handle.classList.add("dragging");
  };
  handle.onpointermove = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag.x = event.clientX;
    drag.at = targetAt(event.clientX);
    paintPosition(drag.at);
    if (!drag.frame) drag.frame = requestAnimationFrame(animateDrag);
  };
  function stopDrag(commit) {
    if (!drag) return;
    const { at, frame } = drag;
    cancelAnimationFrame(frame);
    drag = undefined;
    handle.classList.remove("dragging");
    if (commit) move(at);
    else {
      paintPosition(mark().at);
      scroll.scrollLeft = Math.max(
        0,
        visualPosition(mark().at) * cell - scroll.clientWidth / 2,
      );
    }
  }
  handle.onpointerup = () => stopDrag(true);
  handle.onpointercancel = () => stopDrag(false);
  handle.onlostpointercapture = () => stopDrag(false);
  $("#alignment-close").onclick = () => dialog.close();
  dialog.addEventListener("close", () => stopDrag(false));
  document.querySelector("#align-chords").onclick = () => open();
  function open(lineIndex, sourceStart = 0) {
    owner = song();
    if (!owner) return;
    expected = owner.text;
    history = [];
    rows = parseSong(expected).filter((row) => !row.break && row.marks.length);
    if (!rows.length) {
      document.querySelector("#source").focus();
      return;
    }
    index = Math.max(
      0,
      rows.findIndex((row) => row.index === lineIndex),
    );
    picker.innerHTML = rows
      .map(
        (row, i) =>
          `<option value="${i}">${esc(`${row.index + 1} · ${row.lyric.slice(0, 80) || row.raw}`)}</option>`,
      )
      .join("");
    read();
    selected =
      model.marks.find((m) => m.start === sourceStart)?.start ??
      model.marks[0].start;
    render();
    dialog.showModal();
    render({ reveal: true });
    handle.focus({ preventScroll: true });
  }
  return { open };
}
