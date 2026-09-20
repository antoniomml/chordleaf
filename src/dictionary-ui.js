import { chords, fingering, diagram } from "./music.js";
import { PAGE } from "./layout.js";
import { stickerGeometry, stickerSvg } from "./dictionary.js";
export function setupDictionary({ song, changed, renderPages, esc }) {
  const tray = document.createElement("details");
  tray.className = "dictionary-tray";
  tray.innerHTML =
    '<summary>Diccionario en el folio</summary><p>Arrastra el conjunto o un acorde a la hoja. También puedes añadirlo con +.</p><div class="dictionary-items"></div>';
  document.querySelector(".quick").after(tray);
  const dialog = document.createElement("dialog");
  dialog.id = "shape-dialog";
  dialog.innerHTML =
    '<h2>Editar posición</h2><p>De la cuerda grave E a la aguda e. −1 = apagada, 0 = al aire.</p><form><div class="fret-inputs"></div><label class="star-choice"><input type="checkbox" name="star" checked> Marcar con asterisco en la canción</label><p class="shape-error" role="status"></p><div class="shape-preview"></div><div class="dialog-actions"><button type="button" class="restore-shape">Restaurar</button><button type="button" class="cancel-shape">Cancelar</button><button class="primary">Guardar</button></div></form>';
  document.body.append(dialog);
  let editingChord;
  function edit(name) {
    editingChord = name;
    const shape = song().chordShapes?.[name];
    const frets = shape?.frets || fingering(name) || [-1, 0, 2, 2, 2, 0];
    dialog.querySelector("h2").textContent = `Posición de ${name}`;
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
          `<label>${label}<input required type="number" min="-1" max="24" step="1" value="${frets[i]}" aria-label="Traste cuerda ${i + 1}"></label>`,
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
    const positive = frets.filter((n) => n > 0);
    return (
      frets.every((n) => Number.isInteger(n) && n >= -1 && n <= 24) &&
      (!positive.length || Math.max(...positive) - Math.min(...positive) <= 4)
    );
  }
  function preview() {
    const frets = values();
    dialog.querySelector(".shape-preview").innerHTML = valid(frets)
      ? diagram(editingChord, 0, frets)
      : "";
    dialog.querySelector(".shape-error").textContent = valid(frets)
      ? ""
      : "Usa trastes entre −1 y 24 y una posición que abarque hasta cinco trastes.";
  }
  dialog.oninput = preview;
  dialog.querySelector(".cancel-shape").onclick = () => dialog.close();
  dialog.querySelector(".restore-shape").onclick = () => {
    delete song().chordShapes[editingChord];
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
    let g = stickerGeometry(song(), sticker);
    // Fit tall dictionaries on the page by giving them more columns.
    while (g.height > PAGE.height && sticker.width < PAGE.width) {
      sticker.width = Math.min(PAGE.width, sticker.width + 75);
      g = stickerGeometry(song(), sticker);
    }
    sticker.x = Math.max(0, Math.min(PAGE.width - g.width, sticker.x));
    sticker.y = Math.max(0, Math.min(PAGE.height - g.height, sticker.y));
  }
  function renderTray() {
    const names = chords(song().text);
    tray.querySelector(".dictionary-items").innerHTML = names.length
      ? `<div class="dictionary-item" draggable="true" data-all="true"><span>⠿ Todos (${names.length})</span><button class="add-sticker" aria-label="Añadir todos los diagramas">+</button></div>` +
        names
          .map(
            (name) =>
              `<div class="dictionary-item" draggable="true" data-name="${esc(name)}"><span>⠿ ${esc(name)}${song().chordShapes?.[name]?.star ? "*" : ""}</span><button class="edit-shape" aria-label="Editar posición de ${esc(name)}">✎</button><button class="add-sticker" aria-label="Añadir diagrama de ${esc(name)}">+</button></div>`,
          )
          .join("")
      : "<p>Añade acordes a la canción para crear tu diccionario.</p>";
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
        add(
          JSON.parse(raw),
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
        "Diccionario de acordes. Flechas para mover; Suprimir para quitar.",
      );
      const draw = () => {
        const g = stickerGeometry(song(), sticker);
        el.style.cssText = `left:${sticker.x}px;top:${sticker.y}px;width:${g.width}px;height:${g.height}px`;
        el.querySelector(".sticker-image").innerHTML = stickerSvg(
          song(),
          sticker,
        );
      };
      el.innerHTML =
        '<div class="sticker-image"></div><button class="remove-sticker" aria-label="Quitar diccionario">×</button><button class="resize-sticker" aria-label="Cambiar tamaño del diccionario; flechas para ajustar">↘</button>';
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
        if (event.target.closest(".remove-sticker")) return;
        event.preventDefault();
        event.stopPropagation();
        el.focus();
        const resize = !!event.target.closest(".resize-sticker"),
          scale = page.getBoundingClientRect().width / PAGE.width;
        const x = event.clientX,
          y = event.clientY,
          start = { ...sticker };
        el.setPointerCapture(event.pointerId);
        el.onpointermove = (e) => {
          if (resize)
            sticker.width = Math.max(
              65,
              Math.min(
                PAGE.width - start.x,
                start.width + (e.clientX - x) / scale,
              ),
            );
          else {
            sticker.x = start.x + (e.clientX - x) / scale;
            sticker.y = start.y + (e.clientY - y) / scale;
          }
          constrain(sticker);
          draw();
        };
        el.onpointerup = () => {
          el.onpointermove = null;
          changed();
        };
        el.onlostpointercapture = () => {
          el.onpointermove = null;
        };
      };
      el.onkeydown = (event) => {
        if (event.target.closest(".remove-sticker")) return;
        if (["Delete", "Backspace"].includes(event.key)) {
          event.preventDefault();
          el.querySelector(".remove-sticker").click();
          return;
        }
        if (!event.key.startsWith("Arrow")) return;
        event.preventDefault();
        if (event.target.closest(".resize-sticker"))
          sticker.width += ["ArrowRight", "ArrowDown"].includes(event.key)
            ? 10
            : -10;
        else {
          sticker.x +=
            event.key === "ArrowRight" ? 5 : event.key === "ArrowLeft" ? -5 : 0;
          sticker.y +=
            event.key === "ArrowDown" ? 5 : event.key === "ArrowUp" ? -5 : 0;
        }
        sticker.width = Math.max(65, Math.min(PAGE.width, sticker.width));
        constrain(sticker);
        draw();
        changed();
      };
    }
  }
  return { render, renderTray };
}
