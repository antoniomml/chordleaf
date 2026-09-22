import { t } from "./i18n.js";
import { chords, fingering, diagram, chordRE } from "./music.js";
import { PAGE } from "./layout.js";
import {
  stickerGeometry,
  stickerSvg,
  MIN_STICKER_WIDTH,
  MIN_STICKER_HEIGHT,
} from "./dictionary.js";
export function setupDictionary({ song, changed, renderPages, esc }) {
  const tray = document.createElement("section");
  tray.className = "dictionary-tray";
  tray.innerHTML = t(
    '<h2>Los acordes de tu canción</h2><p>Arrastra un acorde a la hoja o usa la acción Añadir. Puedes colocar el conjunto completo de una vez.</p><div class="dictionary-items chord-card-grid"></div>',
  );
  document.querySelector("#song-chords").append(tray);
  const dialog = document.createElement("dialog");
  dialog.id = "shape-dialog";
  dialog.setAttribute("aria-labelledby", "shape-heading");
  dialog.innerHTML = t(
    '<h2 id="shape-heading">Editar posición</h2><p>De la cuerda grave E a la aguda e. −1 = apagada, 0 = al aire.</p><form><div class="fret-inputs"></div><label class="star-choice"><input type="checkbox" name="star" checked> Marcar con asterisco en la canción</label><p class="shape-error" role="status"></p><div class="shape-preview"></div><div class="dialog-actions"><button type="button" class="restore-shape">Restaurar</button><button type="button" class="cancel-shape">Cancelar</button><button class="primary">Guardar</button></div></form>',
  );
  document.body.append(dialog);
  let editingChord;
  function edit(name) {
    editingChord = name;
    const shape = song().chordShapes?.[name];
    const frets = shape?.frets || fingering(name) || [-1, 0, 2, 2, 2, 0];
    dialog.querySelector("h2").textContent = t`Posición de ${name}`;
    dialog.querySelector(".fret-inputs").innerHTML = [
      "E",
      "A",
      "D",
      "G",
      "B",
      "e",
    ]
      .map(
        (label, i) =>
          t`<label>${label}<input required type="number" min="-1" max="24" step="1" value="${frets[i]}" aria-label="Traste cuerda ${i + 1}"></label>`,
      )
      .join("");
    dialog.querySelector("[name=star]").checked = shape?.star ?? true;
    dialog.querySelector(".shape-error").textContent = "";
    preview();
    dialog.showModal();
  }
  const values = () =>
    [...dialog.querySelectorAll(".fret-inputs input")].map((el) =>
      Number(el.value),
    );
  function valid(frets) {
    return frets.every((n) => Number.isInteger(n) && n >= -1 && n <= 24);
  }
  function preview() {
    const frets = values();
    dialog.querySelector(".shape-preview").innerHTML = valid(frets)
      ? diagram(editingChord, 0, frets)
      : "";
    dialog.querySelector(".shape-error").textContent = valid(frets)
      ? ""
      : t("Usa trastes enteros entre −1 y 24.");
  }
  dialog.oninput = preview;
  dialog.querySelector(".cancel-shape").onclick = () => dialog.close();
  dialog.querySelector(".restore-shape").onclick = () => {
    if (song().chordShapes) delete song().chordShapes[editingChord];
    changed();
    dialog.close();
    renderTray();
    renderPages();
  };
  dialog.querySelector("form").onsubmit = (event) => {
    event.preventDefault();
    const frets = values();
    if (!valid(frets)) return;
    song().chordShapes ||= {};
    song().chordShapes[editingChord] = {
      frets,
      star: dialog.querySelector("[name=star]").checked,
    };
    changed();
    dialog.close();
    renderTray();
    renderPages();
  };
  function add(names, page = 0, x = 28, y = 620) {
    const sticker = {
      id: crypto.randomUUID(),
      chords: names,
      page,
      x,
      y,
      width: names === "all" ? 300 : 85,
    };
    constrain(sticker);
    (song().chordStickers ||= []).push(sticker);
    changed();
    renderPages();
  }
  function constrain(sticker) {
    const g = stickerGeometry(song(), sticker);
    Object.assign(sticker, {
      width: g.width,
      height: g.height,
      columns: g.columns,
    });
    sticker.x = Math.max(0, Math.min(PAGE.width - g.width, sticker.x));
    sticker.y = Math.max(0, Math.min(PAGE.height - g.height, sticker.y));
  }
  const frameDialog = document.createElement("dialog");
  frameDialog.id = "sticker-layout-dialog";
  frameDialog.setAttribute("aria-labelledby", "sticker-heading");
  frameDialog.innerHTML = t`<h2 id="sticker-heading">Distribuir los acordes</h2><p>Elige las columnas y el tamaño del cuadro. Los diagramas se ajustan sin deformarse.</p><form><div class="sticker-layout-fields"><label>Ancho (mm)<input name="width" type="number" step="0.1" required></label><label>Alto (mm)<input name="height" type="number" step="0.1" required></label><label>Columnas<input name="columns" type="number" min="1" step="1" required></label></div><p class="sticker-layout-summary"></p><div class="sticker-layout-preview"></div><div class="dialog-actions"><button type="button" class="cancel-layout">Cancelar</button><button class="primary">Aplicar</button></div></form>`;
  document.body.append(frameDialog);
  let layoutSticker, draft;
  const toMm = (pt) => Math.round(((pt * 25.4) / 72) * 10) / 10;
  const toPt = (mm) => (mm * 72) / 25.4;
  function configure(sticker) {
    layoutSticker = sticker;
    draft = { ...sticker };
    const g = stickerGeometry(song(), sticker);
    for (const [name, min, max] of [
      ["width", MIN_STICKER_WIDTH, PAGE.width - sticker.x],
      ["height", MIN_STICKER_HEIGHT, PAGE.height - sticker.y],
    ]) {
      const input = frameDialog.querySelector(`[name=${name}]`);
      input.min = Math.ceil(((min * 25.4) / 72) * 10) / 10;
      input.max = Math.floor(((max * 25.4) / 72) * 10) / 10;
      input.value = Math.min(
        Number(input.max),
        Math.max(Number(input.min), toMm(g[name])),
      );
    }
    frameDialog.querySelector("[name=columns]").max = Math.max(
      1,
      g.names.length,
    );
    frameDialog.querySelector("[name=columns]").value = g.columns;
    previewLayout();
    frameDialog.showModal();
  }
  function previewLayout() {
    if (!frameDialog.querySelector("form").checkValidity()) return;
    for (const name of ["width", "height", "columns"]) {
      const value = Number(frameDialog.querySelector(`[name=${name}]`).value);
      draft[name] = name === "columns" ? value : toPt(value);
    }
    const g = stickerGeometry(song(), draft);
    frameDialog.querySelector(".sticker-layout-summary").textContent =
      t`${g.names.length} acordes · ${g.columns} columnas × ${g.rows} filas`;
    frameDialog.querySelector(".sticker-layout-preview").innerHTML = stickerSvg(
      song(),
      draft,
    );
  }
  frameDialog.oninput = previewLayout;
  frameDialog.querySelector(".cancel-layout").onclick = () =>
    frameDialog.close();
  frameDialog.querySelector("form").onsubmit = (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    previewLayout();
    Object.assign(layoutSticker, draft);
    constrain(layoutSticker);
    changed();
    frameDialog.close();
    renderPages();
  };
  function renderTray() {
    const names = chords(song().text);
    tray.querySelector(".dictionary-items").innerHTML = names.length
      ? t`<div class="dictionary-item dictionary-all" draggable="true" data-all="true"><div><strong>Todos los acordes</strong><span>${names.length} diagramas en un bloque</span></div><button class="add-sticker" aria-label="Añadir todos los diagramas">Añadir a la hoja</button></div>` +
        names
          .map(
            (name) =>
              t`<div class="dictionary-item chord-card" draggable="true" data-name="${esc(name)}"><button class="edit-shape" aria-label="Editar posición de ${esc(name)}"><strong>${esc(name)}${song().chordShapes?.[name]?.star ? "*" : ""}</strong>${diagram(name, 0, song().chordShapes?.[name]?.frets)}</button><div class="chord-card-actions"><button class="edit-shape-text" aria-label="Editar ${esc(name)}">Editar</button><button class="add-sticker" aria-label="Añadir diagrama de ${esc(name)}">Añadir</button></div></div>`,
          )
          .join("")
      : t("<p>Añade acordes a la canción para crear tu diccionario.</p>");
    tray.querySelectorAll(".dictionary-item").forEach((el) => {
      const names = el.dataset.all ? "all" : [el.dataset.name];
      el.ondragstart = (event) => {
        event.dataTransfer.setData(
          "application/chordi-chords",
          JSON.stringify(names),
        );
        event.dataTransfer.effectAllowed = "copy";
      };
      el.querySelector(".add-sticker").onclick = () => add(names);
      if (el.querySelector(".edit-shape"))
        el.querySelector(".edit-shape").onclick = () => edit(el.dataset.name);
      if (el.querySelector(".edit-shape-text"))
        el.querySelector(".edit-shape-text").onclick = () =>
          edit(el.dataset.name);
    });
  }
  function render() {
    const pages = [...document.querySelectorAll(".page")];
    pages.forEach((page, i) => {
      page.ondragover = (event) => {
        if ([...event.dataTransfer.types].includes("application/chordi-chords"))
          event.preventDefault();
      };
      page.ondrop = (event) => {
        const raw = event.dataTransfer.getData("application/chordi-chords");
        if (!raw) return;
        event.preventDefault();
        const box = page.getBoundingClientRect(),
          scale = box.width / PAGE.width;
        let names;
        try {
          names = JSON.parse(raw);
        } catch {
          return;
        }
        if (
          names !== "all" &&
          (!Array.isArray(names) ||
            names.length > 1000 ||
            !names.every(
              (n) => typeof n === "string" && n.length <= 80 && chordRE.test(n),
            ))
        )
          return;
        add(
          names,
          i,
          (event.clientX - box.left) / scale,
          (event.clientY - box.top) / scale,
        );
      };
    });
    for (const sticker of song().chordStickers || []) {
      // Keep a dictionary visible if editing reduces the number of pages.
      const page = pages[Math.min(sticker.page, pages.length - 1)];
      constrain(sticker);
      const el = document.createElement("div");
      el.className = "chord-sticker";
      el.tabIndex = 0;
      el.setAttribute(
        "aria-label",
        t("Diccionario de acordes. Flechas para mover; Suprimir para quitar."),
      );
      const draw = () => {
        const g = stickerGeometry(song(), sticker);
        el.style.cssText = `left:${sticker.x}px;top:${sticker.y}px;width:${g.width}px;height:${g.height}px`;
        el.querySelector(".sticker-image").innerHTML = stickerSvg(
          song(),
          sticker,
        );
      };
      el.innerHTML = t(
        '<div class="sticker-image"></div><button class="configure-sticker" aria-label="Distribuir acordes: tamaño y columnas" title="Tamaño y columnas">⊞</button><button class="remove-sticker" aria-label="Quitar diccionario">×</button><button class="resize-sticker resize-width" data-resize="width" aria-label="Cambiar ancho del diccionario; flechas para ajustar" title="Cambiar ancho">↔</button><button class="resize-sticker resize-height" data-resize="height" aria-label="Cambiar alto del diccionario; flechas para ajustar" title="Cambiar alto">↕</button><button class="resize-sticker resize-corner" data-resize="both" aria-label="Cambiar tamaño del diccionario; flechas para ajustar" title="Cambiar ancho y alto">↘</button>',
      );
      el.querySelector(".configure-sticker").onclick = () => configure(sticker);
      draw();
      page.append(el);
      el.querySelector(".remove-sticker").onclick = () => {
        song().chordStickers = song().chordStickers.filter(
          (s) => s.id !== sticker.id,
        );
        changed();
        renderPages();
      };
      el.onpointerdown = (event) => {
        if (
          event.target.closest(".remove-sticker, .configure-sticker") ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const handle = event.target.closest("[data-resize]");
        (handle || el).focus();
        const resize = handle?.dataset.resize;
        const scale = page.getBoundingClientRect().width / PAGE.width;
        const x = event.clientX,
          y = event.clientY,
          start = { ...sticker };
        el.setPointerCapture(event.pointerId);
        el.onpointermove = (e) => {
          if (resize) {
            if (resize !== "height")
              sticker.width = Math.max(
                MIN_STICKER_WIDTH,
                Math.min(
                  PAGE.width - start.x,
                  start.width + (e.clientX - x) / scale,
                ),
              );
            if (resize !== "width")
              sticker.height = Math.max(
                MIN_STICKER_HEIGHT,
                Math.min(
                  PAGE.height - start.y,
                  start.height + (e.clientY - y) / scale,
                ),
              );
          } else {
            sticker.x = start.x + (e.clientX - x) / scale;
            sticker.y = start.y + (e.clientY - y) / scale;
          }
          constrain(sticker);
          draw();
        };
        const finish = () => {
          if (!el.onpointermove) return;
          el.onpointermove = null;
          changed();
        };
        el.onpointerup = finish;
        el.onpointercancel = finish;
        el.onlostpointercapture = finish;
      };
      el.onkeydown = (event) => {
        if (event.target.closest(".remove-sticker, .configure-sticker")) return;
        if (["Delete", "Backspace"].includes(event.key)) {
          event.preventDefault();
          el.querySelector(".remove-sticker").click();
          return;
        }
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key,
          )
        )
          return;
        event.preventDefault();
        const resize = event.target.closest("[data-resize]")?.dataset.resize;
        const dx =
          event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        const dy =
          event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
        if (resize) {
          const step = event.shiftKey ? 1 : 5;
          if (resize !== "height")
            sticker.width = Math.max(
              MIN_STICKER_WIDTH,
              Math.min(PAGE.width - sticker.x, sticker.width + dx * step),
            );
          if (resize !== "width")
            sticker.height = Math.max(
              MIN_STICKER_HEIGHT,
              Math.min(PAGE.height - sticker.y, sticker.height + dy * step),
            );
        } else {
          sticker.x += dx * 5;
          sticker.y += dy * 5;
        }
        constrain(sticker);
        draw();
        changed();
      };
    }
  }
  return { render, renderTray };
}
