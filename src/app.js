import "./style.css";
import { chords, keyInfo, transpose, diagram } from "./music.js";
import { layout, PAGE } from "./layout.js";
import { exportSong, importFile } from "./files.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const icons = {
  plus: "＋",
  edit: "✎",
  close: "×",
  minus: "−",
  link: "↔",
  doc: "▤",
  key: "♮",
  download: "↓",
};
const example = `[G]Hay un lugar al [D]otro lado\n[Em]donde el tiempo va [C]despacio.\n[G]Guardo la luz de [D]esta mañana\n[C]en las cuerdas de mi [G]guitarra.\n\n[Em]Y si la noche nos [C]encuentra,\n[G]que nos encuentre al [D]caminar.\n[Em]Con una canción [C]pequeña\n[G]y tantas cosas por [D]contar.\n\n[G]Vuelve a sonar, [D]vuelve a empezar,\n[Em]cada camino nos [C]trae hasta aquí.\n[G]Vuelve a sonar, [D]sin preguntar,\n[C]hoy esta canción es [G]para ti.\n\n[G]Dejo una puerta [D]siempre abierta,\n[Em]un verso a medio [C]terminar.\n[G]Que lo complete [D]quien lo sienta,\n[C]que lo acompañe el [G]mar.`;
function create(data = {}) {
  return {
    id: crypto.randomUUID(),
    title: "Sin título",
    artist: "",
    text: "",
    capo: 0,
    linked: false,
    fontSize: 10,
    margin: 10,
    columns: 1,
    dirty: false,
    ...data,
    capo: Math.max(0, Math.min(12, Number(data.capo) || 0)),
    fontSize: Math.max(7, Math.min(20, Number(data.fontSize) || 10)),
    margin: Math.max(5, Math.min(35, Number(data.margin) || 10)),
    columns: data.columns === 2 ? 2 : 1,
  };
}
let songs, active;
try {
  const stored = JSON.parse(localStorage.getItem("chordi-v1"));
  songs = stored?.songs?.map(create);
  active = stored?.active;
} catch {}
if (!songs?.length)
  songs = [
    create({
      title: "Al otro lado",
      artist: "Canción de ejemplo · Chordi",
      text: example,
    }),
  ];
if (!songs.some((s) => s.id === active)) active = songs[0].id;
let section = "document",
  editing = false,
  currentPage = 1,
  observer,
  saveTimer;
const song = () => songs.find((s) => s.id === active);
function persist() {
  try {
    localStorage.setItem("chordi-v1", JSON.stringify({ songs, active }));
    $("#save-state").textContent = "Guardado en este navegador";
  } catch {
    $("#save-state").textContent = "No se pudo guardar · exporta una copia";
  }
}
function changed() {
  song().dirty = true;
  $("#save-state").textContent = "Guardando…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 350);
  renderTabs();
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  setTimeout(() => $("#toast").classList.remove("visible"), 6500);
}
$("#app").innerHTML =
  `<header class="topbar"><a class="brand" href="#" aria-label="Chordi"><img src="/logo.svg" alt="">chordi<span>ESTUDIO DE CANCIONES</span></a><div class="top-actions"><span class="local-badge"><i></i> Tu música se queda contigo</span><button id="new" class="primary">＋ Nueva canción</button><div class="export-wrap"><button id="export" class="outline">↓ Exportar <span>⌄</span></button><div id="export-menu" class="menu" hidden><button data-export="pdf">PDF <small>Listo para imprimir</small></button><button data-export="docx">Word · DOCX <small>Documento editable</small></button><button data-export="txt">Texto · TXT <small>Letra y acordes</small></button></div></div></div></header><nav id="tabs" class="tabs" aria-label="Canciones abiertas"></nav><main><aside class="rail"><button data-section="document" class="selected" title="Editar documento">▤<span>Documento</span></button><button data-section="key" title="Consultar tonalidad">♮<span>Tonalidad</span></button><div class="rail-bottom">C<span>HECHO PARA<br>TOCAR</span></div></aside><section class="workspace"><div class="editor-panel"><div id="settings"></div><div id="source-area"><div class="source-heading"><span>LETRA Y ACORDES</span><span class="code-label">[C] texto</span></div><div class="source-container"><div id="line-numbers" aria-hidden="true"></div><textarea id="source" spellcheck="false" aria-label="Letra y acordes" placeholder="[G]Escribe aquí tu canción…"></textarea></div><div class="quick"><div class="quick-head"><span>INSERTAR ACORDE</span><span id="quick-hint"></span></div><div id="quick-chords"></div></div><div class="editor-foot"><span class="tiny-dot"></span><span id="save-state">Guardado en este navegador</span><span id="line-count"></span></div></div></div><section class="preview-panel"><div class="preview-toolbar"><div><span class="tiny-dot"></span> VISTA DEL DOCUMENTO <span class="paper-label">A4</span></div><div class="preview-actions"><button id="fit" title="Ajustar el tamaño para intentar una página">Ajustar a 1 página</button><button id="pencil" title="Editar directamente la hoja" aria-label="Editar directamente la hoja" aria-pressed="false">✎</button></div></div><div id="pages-scroll"><div id="pages"></div></div><footer class="preview-footer"><span id="page-count">Página 1 de 1</span><span id="editing-hint">Tu próxima canción empieza aquí.</span><span>A4 · 210 × 297 mm</span></footer></section></section></main><div id="chord-tooltip" role="tooltip" hidden></div><div id="toast" role="status"></div><dialog id="new-dialog"><button class="dialog-close" aria-label="Cerrar">×</button><img src="/logo.svg" class="dialog-logo" alt=""><p class="eyebrow">DALE ESPACIO A TU MÚSICA</p><h1>Una nueva canción.</h1><p>De una idea a tu próxima hoja de acordes.</p><button id="blank" class="choice"><span>＋</span><div><strong>Empezar de cero</strong><small>Un folio en blanco. Todas las posibilidades.</small></div><b>→</b></button><button id="import" class="choice"><span>↥</span><div><strong>Importar una canción</strong><small>TXT, PDF o Word (.docx)</small></div><b>→</b></button><p class="privacy-note">Los archivos se procesan aquí, en tu navegador.</p><input id="file" type="file" accept=".txt,.pdf,.docx,.cho,.chordpro" hidden></dialog><dialog id="close-dialog"><h2>¿Cerrar esta canción?</h2><p>Hay cambios sin exportar. Si cierras la pestaña, perderás esta copia de trabajo.</p><div class="dialog-actions"><button id="cancel-close">Seguir editando</button><button id="confirm-close" class="danger">Cerrar y descartar</button></div></dialog>`;
function renderTabs() {
  $("#tabs").innerHTML =
    songs
      .map(
        (s) =>
          `<div class="tab ${s.id === active ? "active" : ""}"><button class="tab-select" data-id="${s.id}"><span class="tab-icon">♫</span><span>${esc(s.title || "Sin título")}</span>${s.dirty ? '<i title="Cambios sin exportar"></i>' : ""}</button><button class="tab-close" data-close="${s.id}" aria-label="Cerrar ${esc(s.title)}">×</button></div>`,
      )
      .join("") +
    '<button id="tab-plus" aria-label="Nueva canción">＋</button>';
  $("#tab-plus").onclick = () => $("#new-dialog").showModal();
  document.querySelectorAll("[data-id]").forEach(
    (b) =>
      (b.onclick = () => {
        active = b.dataset.id;
        resetView();
        render();
        persist();
      }),
  );
  document
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = () => closeSong(b.dataset.close)));
}
let closing;
function closeSong(id) {
  if (songs.find((s) => s.id === id).dirty) {
    closing = id;
    $("#close-dialog").showModal();
  } else removeSong(id);
}
function removeSong(id) {
  songs = songs.filter((s) => s.id !== id);
  if (!songs.length) songs = [create()];
  if (active === id) active = songs[0].id;
  render();
  persist();
}
function renderSettings() {
  const s = song(),
    key = keyInfo(s.text);
  document
    .querySelectorAll("[data-section]")
    .forEach((b) =>
      b.classList.toggle("selected", b.dataset.section === section),
    );
  if (section === "key") {
    $("#settings").innerHTML =
      `<div class="panel-title"><span>Tu brújula musical</span><span>♮</span></div><p class="section-caption">TONALIDAD PROBABLE</p><div class="key-name">${key ? key.name : "Aún sin acordes"}<span>${key ? "Estimación · según los acordes escritos" : "Añade acordes para analizar la canción"}</span></div>${key ? `<div class="degrees">${key.scale.map((c, i) => `<button class="chord degree" data-chord="${c}"><small>${key.degrees[i]}</small>${c}</button>`).join("")}</div><p class="key-note">Con cejilla ${s.capo}, suena en <strong>${keyInfo(transpose(s.text, s.capo))?.name}</strong>.</p>` : ""}<div class="info-box">Esta guía es solo para ti. La tonalidad y sus grados no aparecen en la hoja ni en las exportaciones.</div>`;
    return;
  }
  $("#settings").innerHTML =
    `<div class="panel-title"><span>El documento</span><span class="muted">01</span></div><label class="field">TÍTULO<input id="title" value="${esc(s.title)}" maxlength="90" placeholder="Nombre de la canción"></label><label class="field">ARTISTA<input id="artist" value="${esc(s.artist)}" maxlength="100" placeholder="Nombre del artista"></label><div class="settings-row"><label class="field">TAMAÑO <div class="number-unit"><input id="fontSize" type="number" min="7" max="20" step="0.5" value="${s.fontSize}"><span>pt</span></div></label><label class="field">MÁRGENES <div class="number-unit"><input id="margin" type="number" min="5" max="35" step="1" value="${s.margin}"><span>mm</span></div></label><label class="field">COLUMNAS<div class="segmented"><button data-columns="1" class="${s.columns === 1 ? "selected" : ""}">1</button><button data-columns="2" class="${s.columns === 2 ? "selected" : ""}">2</button></div></label></div><div class="music-controls"><div><label>TRANSPORTAR</label><div class="stepper"><button id="transpose-down" aria-label="Bajar un semitono">−</button><span>${key ? key.name.replace(" mayor", "").replace(" menor", "m") : "—"}</span><button id="transpose-up" aria-label="Subir un semitono">＋</button></div></div><button id="link" class="chain ${s.linked ? "linked" : ""}" aria-label="Vincular cejilla y acordes" aria-pressed="${s.linked}" title="${s.linked ? "Mantener la tonalidad que suena" : "La cejilla solo cambia la indicación"}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m10 14 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 -1)"/></svg></button><div><label>CEJILLA</label><div class="stepper"><button id="capo-down" aria-label="Bajar cejilla">−</button><input id="capo" type="number" min="0" max="12" value="${s.capo}" aria-label="Cejilla"><button id="capo-up" aria-label="Subir cejilla">＋</button></div></div></div><p class="link-help">${s.linked ? "Enlazados · cambiar la cejilla conserva la tonalidad que suena." : "Independientes · la cejilla solo cambia la indicación."}</p>`;
  for (const name of ["title", "artist", "fontSize", "margin"])
    $("#" + name).addEventListener(
      name === "title" || name === "artist" ? "input" : "change",
      (e) => {
        let value = e.target.value;
        if (["fontSize", "margin"].includes(name)) {
          value = Math.min(
            Number(e.target.max),
            Math.max(
              Number(e.target.min),
              Number(value) || Number(e.target.min),
            ),
          );
          e.target.value = value;
        }
        s[name] = value;
        changed();
        renderPages();
      },
    );
  document.querySelectorAll("[data-columns]").forEach(
    (b) =>
      (b.onclick = () => {
        s.columns = Number(b.dataset.columns);
        changed();
        renderSettings();
        renderPages();
      }),
  );
  $("#transpose-down").onclick = () => shift(-1);
  $("#transpose-up").onclick = () => shift(1);
  $("#capo-down").onclick = () => setCapo(s.capo - 1);
  $("#capo-up").onclick = () => setCapo(s.capo + 1);
  $("#capo").onchange = (e) => setCapo(Number(e.target.value));
  $("#link").onclick = () => {
    s.linked = !s.linked;
    changed();
    renderSettings();
  };
}
function shift(n) {
  song().text = transpose(song().text, n);
  changed();
  render();
}
function setCapo(value) {
  const s = song(),
    next = Math.min(12, Math.max(0, Number.isFinite(value) ? value : 0));
  if (s.linked) s.text = transpose(s.text, s.capo - next);
  s.capo = next;
  changed();
  render();
}
function renderSource() {
  $("#source").value = song().text;
  sourceMeta();
}
function sourceMeta() {
  const lines = song().text.split("\n").length;
  $("#line-numbers").innerHTML = Array.from(
    { length: lines },
    (_, i) => `<div>${i + 1}</div>`,
  ).join("");
  $("#line-count").textContent = `${lines} líneas`;
  const cs = chords(song().text),
    key = keyInfo(song().text),
    list = [...new Set([...cs, ...(key?.scale || ["C", "G", "Am", "F"])])];
  $("#quick-chords").innerHTML = list
    .map(
      (c) => `<button class="chord" data-chord="${esc(c)}">${esc(c)}</button>`,
    )
    .join("");
  $("#quick-hint").textContent = cs.length
    ? "De tu canción y su tonalidad"
    : "Para empezar";
}
function renderPages() {
  const s = song(),
    l = layout(s);
  $("#pages").innerHTML = l.pages
    .map(
      (p, i) =>
        `<div class="page-shell"><article class="page" data-page="${i + 1}" style="width:${PAGE.width}px;height:${PAGE.height}px">${i === 0 ? `<div class="sheet-header" style="left:${l.margin}px;right:${l.margin}px;top:${l.margin}px;height:${l.headerHeight}px"><h1 style="font-size:${l.header.titleSize}px" ${editing ? 'contenteditable="true" data-header="title"' : ""}>${l.titleLines.map(esc).join("<br>")}</h1><p style="left:${l.header.artistX}px;top:${l.header.artistY - l.header.artistSize}px;font-size:${l.header.artistSize}px" ${editing ? 'contenteditable="true" data-header="artist"' : ""}>${l.header.artistLines.map(esc).join("<br>")}</p><span style="top:${l.header.capoY - 11}px">CAPO ${s.capo}</span></div>` : ""}${p.columns
          .flat()
          .map(
            (r) =>
              `<div class="song-line ${editing ? "editable" : ""}" data-line="${r.index}" data-end="${r.endIndex ?? r.index}" style="left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;font-size:${l.size}px" ${editing ? 'tabindex="0" role="button" aria-label="Editar verso"' : ""}>${r.marks.map((m) => `<span class="sheet-chord" data-chord="${esc(m.chord)}" style="left:${m.at * l.cw}px;top:${(m.lane || 0) * l.size * 1.44}px">${esc(m.chord)}</span>`).join("")}<span class="lyric" style="top:${r.lyricOffset}px">${esc(r.lyric) || " "}</span></div>`,
          )
          .join("")}<span class="sheet-page">${i + 1}</span></article></div>`,
    )
    .join("");
  $("#pencil").classList.toggle("selected", editing);
  $("#pencil").setAttribute("aria-pressed", editing);
  $("#editing-hint").textContent = editing
    ? "Pulsa un verso para editar letra y acordes."
    : "Tu próxima canción empieza aquí.";
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      const scroll = $("#pages-scroll"),
        center = scroll.getBoundingClientRect().top + scroll.clientHeight / 2;
      let best = Infinity;
      document.querySelectorAll(".page-shell").forEach((p, i) => {
        const r = p.getBoundingClientRect(),
          distance = Math.abs((r.top + r.bottom) / 2 - center);
        if (distance < best) {
          best = distance;
          currentPage = i + 1;
        }
      });
      $("#page-count").textContent =
        `Página ${currentPage} de ${l.pages.length}`;
    },
    { root: $("#pages-scroll"), threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
  document.querySelectorAll(".page-shell").forEach((p) => observer.observe(p));
  $("#page-count").textContent =
    `Página ${Math.min(currentPage, l.pages.length)} de ${l.pages.length}`;
  if (editing) {
    document.querySelectorAll("[data-header]").forEach(
      (el) =>
        (el.onblur = () => {
          s[el.dataset.header] = el.innerText
            .replace(/\n/g, " ")
            .trim()
            .slice(0, el.dataset.header === "title" ? 90 : 100);
          changed();
          renderSettings();
          renderPages();
        }),
    );
    document.querySelectorAll(".song-line").forEach((el) => {
      el.onclick = () => editLine(el);
      el.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          editLine(el);
        }
      };
    });
  }
  resizePages();
}
function editLine(el) {
  if (el.querySelector("textarea")) return;
  const index = Number(el.dataset.line),
    endIndex = Number(el.dataset.end),
    lines = song().text.split("\n");
  el.innerHTML = `<textarea class="inline-editor" aria-label="Editar verso con acordes">${esc(lines.slice(index, endIndex + 1).join("\n"))}</textarea>`;
  const input = el.firstChild;
  input.focus();
  let done = false;
  function commit() {
    if (done) return;
    done = true;
    lines.splice(index, endIndex - index + 1, ...input.value.split("\n"));
    song().text = lines.join("\n");
    changed();
    renderSource();
    renderPages();
  }
  input.onclick = (e) => e.stopPropagation();
  input.onblur = commit;
  input.onkeydown = (e) => {
    if (e.key === "Escape") {
      done = true;
      renderPages();
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  };
}
function resizePages() {
  const available = $("#pages-scroll").clientWidth - 64,
    scale = Math.min(1.08, available / PAGE.width);
  document.querySelectorAll(".page-shell").forEach((el) => {
    el.style.width = PAGE.width * scale + "px";
    el.style.height = PAGE.height * scale + "px";
    el.firstChild.style.transform = `scale(${scale})`;
  });
}
function resetView() {
  editing = false;
  currentPage = 1;
  $("#pages-scroll").scrollTop = 0;
  $("#source").scrollTop = 0;
  $("#line-numbers").scrollTop = 0;
}
function render() {
  renderTabs();
  renderSettings();
  renderSource();
  renderPages();
}
$("#source").oninput = (e) => {
  song().text = e.target.value;
  changed();
  sourceMeta();
  renderSettings();
  renderPages();
};
$("#source").onscroll = (e) =>
  ($("#line-numbers").scrollTop = e.target.scrollTop);
document.querySelectorAll("[data-section]").forEach(
  (b) =>
    (b.onclick = () => {
      section = b.dataset.section;
      renderSettings();
    }),
);
$("#new").onclick = () => $("#new-dialog").showModal();
$(".dialog-close").onclick = () => $("#new-dialog").close();
$("#blank").onclick = () => {
  const s = create();
  songs.push(s);
  active = s.id;
  resetView();
  $("#new-dialog").close();
  render();
  persist();
  $("#title")?.focus();
};
$("#import").onclick = () => $("#file").click();
$("#file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  $("#import").disabled = true;
  $("#import strong").textContent = "Importando…";
  try {
    const data = await importFile(file);
    const s = create({ ...data, dirty: true });
    songs.push(s);
    active = s.id;
    resetView();
    $("#new-dialog").close();
    render();
    persist();
    toast(data.notice || "Canción importada. Ya puedes editarla.");
  } catch (error) {
    toast(error.message);
  } finally {
    $("#import").disabled = false;
    $("#import strong").textContent = "Importar una canción";
    e.target.value = "";
  }
};
$("#export").onclick = () =>
  ($("#export-menu").hidden = !$("#export-menu").hidden);
document.querySelectorAll("[data-export]").forEach(
  (b) =>
    (b.onclick = async () => {
      $("#export-menu").hidden = true;
      const s = song(),
        snapshot = JSON.stringify(s);
      try {
        toast("Preparando tu documento…");
        await exportSong({ ...s }, b.dataset.export);
        if (JSON.stringify(s) === snapshot) s.dirty = false;
        renderTabs();
        persist();
        toast("Documento exportado. Listo para tocar.");
      } catch (e) {
        toast("No se pudo exportar: " + e.message);
      }
    }),
);
document.addEventListener("click", (e) => {
  if (!e.target.closest(".export-wrap")) $("#export-menu").hidden = true;
  const chord = e.target.closest("button[data-chord]");
  if (chord) {
    const input = $("#source"),
      start = input.selectionStart,
      end = input.selectionEnd,
      value = `[${chord.dataset.chord}]`;
    song().text = song().text.slice(0, start) + value + song().text.slice(end);
    changed();
    renderSource();
    renderPages();
    input.focus();
    input.setSelectionRange(start + value.length, start + value.length);
  }
});
$("#pencil").onclick = () => {
  editing = !editing;
  renderPages();
};
$("#fit").onclick = () => {
  const s = song();
  while (layout(s).pages.length > 1 && s.fontSize > 8)
    s.fontSize = Math.max(8, s.fontSize - 0.5);
  changed();
  render();
  toast(
    layout(s).pages.length === 1
      ? "La canción cabe en una página."
      : "No cabe en una página con letra legible. Prueba dos columnas o menos margen.",
  );
};
$("#cancel-close").onclick = () => $("#close-dialog").close();
$("#confirm-close").onclick = () => {
  removeSong(closing);
  $("#close-dialog").close();
};
let tooltip = $("#chord-tooltip");
document.addEventListener("pointerover", (e) => {
  const target = e.target.closest("[data-chord]");
  if (!target) return;
  tooltip.innerHTML = `<strong>${esc(target.dataset.chord)}</strong>${diagram(target.dataset.chord)}`;
  tooltip.hidden = false;
  const r = target.getBoundingClientRect();
  tooltip.style.left =
    Math.max(8, Math.min(innerWidth - 180, r.left + r.width / 2 - 80)) + "px";
  tooltip.style.top =
    Math.max(8, Math.min(innerHeight - 230, r.bottom + 9)) + "px";
});
document.addEventListener("pointerout", (e) => {
  if (e.target.closest("[data-chord]")) tooltip.hidden = true;
});
window.addEventListener("resize", resizePages);
window.addEventListener("beforeunload", (e) => {
  persist();
  if (songs.some((s) => s.dirty)) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    persist();
    toast("Canciones guardadas en este navegador.");
  }
});
render();
persist();
