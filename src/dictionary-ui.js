import { t } from "./i18n.js";
import { chords, fingering, diagram, chordRE } from "./music.js";
import { PAGE, layout } from "./layout.js";
import { fretboardMarkup } from "./fretboard-ui.js";
import { identifyChord } from "./harmony.js";
import {
  stickerGeometry,
  stickerSvg,
  stickerChords,
  unresolvedChords,
  MIN_STICKER_WIDTH,
  MIN_STICKER_HEIGHT,
} from "./dictionary.js";
export function setupDictionary({ song, changed, renderPages, esc, notify }) {
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
    '<h2 id="shape-heading">Editar posición</h2><p>Toca los trastes. El 0, antes de la cejuela, alterna al aire y apagada.</p><form><div class="shape-fret-window"><button type="button" class="shape-frets-back" aria-label="Mostrar trastes anteriores">−</button><span class="shape-first-fret" aria-live="polite">Traste 1</span><button type="button" class="shape-frets-forward" aria-label="Mostrar trastes siguientes">＋</button></div><div class="fretboard-scroll"><div class="shape-fretboard" aria-label="Dibuja la posición del acorde"></div></div><p class="shape-readings" role="status" aria-live="polite" hidden></p><p class="shape-error" role="status"></p><label class="star-choice"><input type="checkbox" name="star" checked> Marcar con asterisco en la canción</label><div class="dialog-actions"><button type="button" class="restore-shape">Restaurar</button><button type="button" class="cancel-shape">Cancelar</button><button class="primary">Guardar</button></div></form>',
  );
  document.body.append(dialog);
  let editingChord, draftFrets, firstFret;
  function edit(name, afterSave, afterCancel) {
    editingChord = name;
    const shape = song().chordShapes?.[name];
    draftFrets = [
      ...(shape?.frets || fingering(name) || [-1, -1, -1, -1, -1, -1]),
    ];
    const played = draftFrets.filter((f) => f > 0);
    firstFret =
      played.length && Math.max(...played) > 5
        ? Math.min(20, Math.min(...played))
        : 1;
    dialog.querySelector("h2").textContent = t`Posición de ${name}`;
    dialog.querySelector(".restore-shape").hidden = !shape;
    dialog.querySelector("[name=star]").checked = shape?.star ?? true;
    dialog.querySelector(".shape-error").textContent = "";
    drawShapeBoard();
    dialog.querySelector(".cancel-shape").onclick = () => {
      dialog.close();
      afterCancel?.();
    };
    dialog.querySelector("form").onsubmit = (event) => {
      event.preventDefault();
      if (!valid(draftFrets)) {
        dialog.querySelector(".shape-error").textContent = t(
          "Indica al menos una cuerda que suene y usa trastes enteros entre −1 y 24.",
        );
        return;
      }
      song().chordShapes ||= {};
      song().chordShapes[editingChord] = {
        frets: [...draftFrets],
        star: dialog.querySelector("[name=star]").checked,
      };
      changed();
      dialog.close();
      renderTray();
      renderPages();
      afterSave?.();
    };
    dialog.showModal();
  }
  function valid(frets) {
    return (
      frets.some((n) => n >= 0) &&
      frets.every((n) => Number.isInteger(n) && n >= -1 && n <= 24)
    );
  }
  function drawShapeBoard(focus) {
    dialog.querySelector(".shape-first-fret").textContent =
      t`Traste ${firstFret}`;
    dialog.querySelector(".shape-frets-back").disabled = firstFret === 1;
    dialog.querySelector(".shape-frets-forward").disabled = firstFret === 20;
    dialog.querySelector(".shape-fretboard").innerHTML = fretboardMarkup(
      draftFrets,
      firstFret,
    );
    const names = [
      ...new Set(identifyChord(draftFrets).matches.map((m) => m.symbol)),
    ].slice(0, 3);
    const readings = dialog.querySelector(".shape-readings");
    readings.hidden = names.length === 0;
    readings.textContent = names.length
      ? `${t("Posibles nombres")}: ${names.join(" · ")}`
      : "";
    dialog
      .querySelectorAll(".shape-fretboard [data-string]")
      .forEach((button) => {
        button.onclick = () => {
          const string = Number(button.dataset.string);
          const fret = Number(button.dataset.fret);
          draftFrets[string] =
            fret < 0
              ? draftFrets[string] < 0
                ? 0
                : -1
              : draftFrets[string] === fret
                ? -1
                : fret;
          dialog.querySelector(".shape-error").textContent = "";
          drawShapeBoard(`[data-string="${string}"][data-fret="${fret}"]`);
        };
      });
    if (focus) dialog.querySelector(`.shape-fretboard ${focus}`)?.focus();
  }
  for (const [selector, offset] of [
    [".shape-frets-back", -1],
    [".shape-frets-forward", 1],
  ]) {
    dialog.querySelector(selector).onclick = () => {
      firstFret = Math.max(1, Math.min(20, firstFret + offset));
      drawShapeBoard();
    };
  }
  dialog.querySelector(".restore-shape").onclick = () => {
    if (song().chordShapes) delete song().chordShapes[editingChord];
    changed();
    dialog.close();
    renderTray();
    renderPages();
  };
  const missingDialog = document.createElement("dialog");
  missingDialog.id = "missing-shapes-dialog";
  missingDialog.setAttribute("aria-labelledby", "missing-shapes-heading");
  missingDialog.innerHTML = t`<h2 id="missing-shapes-heading">Faltan posiciones de acordes</h2><p>Estos acordes no tienen una posición de guitarra. Define cómo tocarlos o añádelos sin ellos.</p><div class="missing-shapes-list"></div><div class="dialog-actions"><button type="button" class="cancel-missing">Cancelar</button><button type="button" class="omit-missing primary">Añadir solo los disponibles</button></div>`;
  document.body.append(missingDialog);
  missingDialog.querySelector(".cancel-missing").onclick = () =>
    missingDialog.close();
  function stickerBoxes(page, exclude) {
    return (song().chordStickers || [])
      .filter((s) => s !== exclude && (s.page || 0) === page)
      .map((s) => {
        const g = stickerGeometry(song(), s);
        return {
          x: s.x,
          y: s.y,
          right: s.x + g.width,
          bottom: s.y + g.height,
        };
      });
  }
  // Free spot on the sheet: below the page header on page one, then a 16 pt
  // grid against existing diagrams. New pages are added if nothing fits.
  function findSpot(sticker) {
    const g = stickerGeometry(song(), sticker),
      pad = 8,
      l = layout(song()),
      firstTop = l.margin + l.headerHeight + 6;
    const collides = (x, y, boxes) =>
      boxes.some(
        (b) =>
          x < b.right + pad &&
          x + g.width > b.x - pad &&
          y < b.bottom + pad &&
          y + g.height > b.y - pad,
      );
    for (let page = 0; page <= Math.max(1, l.pages.length); page++) {
      const boxes = stickerBoxes(page, sticker),
        top = page === 0 ? firstTop : l.margin;
      for (let y = top; y <= PAGE.height - l.margin - g.height; y += 16)
        for (let x = l.margin; x <= PAGE.width - l.margin - g.width; x += 16)
          if (!collides(x, y, boxes)) return { page, x, y };
    }
    // A diagram that leaves no room still lands on its own new page.
    return { page: Math.max(0, l.pages.length), x: l.margin, y: l.margin };
  }
  function revealSticker(sticker) {
    const el = document.querySelector(
      `.chord-sticker[data-sticker-id="${sticker.id}"]`,
    );
    if (!el) return;
    el.classList.add("sticker-added");
    el.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    setTimeout(() => el.classList.remove("sticker-added"), 1600);
  }
  function addResolved(names, page, x, y) {
    const available = stickerChords(song(), { chords: names });
    if (!available.length) return;
    const sticker = {
      id: crypto.randomUUID(),
      chords: names === "all" ? "all" : available,
      page: page ?? 0,
      x,
      y,
      width: names === "all" ? 300 : 85,
    };
    // Button adds look for a free spot; drag and drop keeps the pointer target.
    if (!Number.isFinite(x) || !Number.isFinite(y))
      Object.assign(sticker, findSpot(sticker));
    constrain(sticker);
    (song().chordStickers ||= []).push(sticker);
    changed();
    renderPages();
    notify?.(
      t(
        names === "all"
          ? "Diagramas añadidos a la hoja."
          : "Diagrama añadido a la hoja.",
      ),
    );
    if (window.matchMedia("(max-width: 760px)").matches)
      document.querySelector('[data-mobile-view="preview"]')?.click();
    revealSticker(sticker);
  }
  function add(names, page, x, y) {
    const missing = unresolvedChords(song(), names);
    if (!missing.length) return addResolved(names, page, x, y);
    missingDialog.querySelector(".missing-shapes-list").innerHTML = missing
      .map(
        (name, i) =>
          t`<button type="button" data-missing="${i}">${esc(name)} · Definir posición</button>`,
      )
      .join("");
    missingDialog.querySelectorAll("[data-missing]").forEach((button) => {
      button.onclick = () => {
        missingDialog.close();
        edit(
          missing[Number(button.dataset.missing)],
          () => add(names, page, x, y),
          () => add(names, page, x, y),
        );
      };
    });
    missingDialog.querySelector(".omit-missing").onclick = () => {
      missingDialog.close();
      addResolved(names, page, x, y);
    };
    missingDialog.showModal();
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
              t`<div class="dictionary-item chord-card" draggable="true" data-name="${esc(name)}"><button class="edit-shape" aria-label="Editar posición de ${esc(name)}"><strong>${esc(name)}${song().chordShapes?.[name]?.star ? "*" : ""}</strong>${unresolvedChords(song(), [name]).length ? t('<span class="missing-shape">Falta posición · arreglar</span>') : diagram(name, 0, song().chordShapes?.[name]?.frets)}</button><div class="chord-card-actions"><button class="edit-shape-text" aria-label="${unresolvedChords(song(), [name]).length ? t`Definir posición de ${esc(name)}` : t`Editar ${esc(name)}`}">${unresolvedChords(song(), [name]).length ? t("Arreglar") : t("Editar")}</button><button class="add-sticker" aria-label="Añadir diagrama de ${esc(name)}">Añadir</button></div></div>`,
          )
          .join("")
      : t("<p>Añade acordes a la canción para crear tu diccionario.</p>");
    tray.querySelectorAll(".dictionary-item").forEach((el) => {
      const names = el.dataset.all ? "all" : [el.dataset.name];
      el.ondragstart = (event) => {
        event.dataTransfer.setData(
          "application/chordleaf-chords",
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
        if (
          [...event.dataTransfer.types].includes("application/chordleaf-chords")
        )
          event.preventDefault();
      };
      page.ondrop = (event) => {
        const raw = event.dataTransfer.getData("application/chordleaf-chords");
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
      el.dataset.stickerId = sticker.id;
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
          renderPages();
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
        const index = [...document.querySelectorAll(".chord-sticker")].indexOf(
          el,
        );
        renderPages();
        const next = document.querySelectorAll(".chord-sticker")[index];
        (resize
          ? next?.querySelector(`[data-resize="${resize}"]`)
          : next
        )?.focus();
      };
    }
  }
  return { render, renderTray };
}
