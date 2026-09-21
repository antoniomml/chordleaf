import { fitSong } from "./fit-song.js";
import { serializeWorkspace, restoreWorkspace } from "./workspace-backup.js";
import { openWorkspaceSession } from "./workspace-session.js";
import shell from "./ui/shell.html?raw";
import { t, getLocale } from "./i18n.js";
import { createSong as create, MAX_TEXT_LENGTH } from "./song-state.js";
import { setupChordsPanel } from "./chords-panel.js";
import { setupDictionary } from "./dictionary-ui.js";
import { setupEditorTools } from "./editor-tools.js";
import "./style.css";
import {
  keyInfo,
  transpose,
  diagram,
  transposeChord,
  chords,
} from "./music.js";
import { layout, PAGE } from "./layout.js";
import { importWebSong } from "./web-import.js";
import { exportSong, importFile, importText, download } from "./files.js";
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
const example = `[G]Hay un lugar al [D]otro lado\n[Em]donde el tiempo va [C]despacio.\n[G]Guardo la luz de [D]esta mañana\n[C]en las cuerdas de mi [G]guitarra.\n\n[Em]Y si la noche nos [C]encuentra,\n[G]que nos encuentre al [D]caminar.\n[Em]Con una canción [C]pequeña\n[G]y tantas cosas por [D]contar.\n\n[G]Vuelve a sonar, [D]vuelve a empezar,\n[Em]cada camino nos [C]trae hasta aquí.\n[G]Vuelve a sonar, [D]sin preguntar,\n[C]hoy esta canción es [G]para ti.\n\n[G]Dejo una puerta [D]siempre abierta,\n[Em]un verso a medio [C]terminar.\n[G]Que lo complete [D]quien lo sienta,\n[C]que lo acompañe el [G]mar.`;
document.documentElement.lang = getLocale();
const workspaceSession = await openWorkspaceSession($("#app"));
let songs, active, recoveryRaw, storedRaw;
try {
  storedRaw = localStorage.getItem("chordi-v1");
  const stored = JSON.parse(storedRaw);
  if (
    storedRaw &&
    (!Array.isArray(stored?.songs) ||
      !stored.songs.every(
        (s) => s && typeof s === "object" && typeof s.text === "string",
      ))
  )
    throw new Error("Invalid workspace");
  songs = Array.isArray(stored?.songs) ? stored.songs.map(create) : undefined;
  if (songs) {
    const ids = new Set();
    for (const s of songs) {
      if (ids.has(s.id)) s.id = crypto.randomUUID();
      ids.add(s.id);
    }
  }
  active = stored?.active;
} catch {
  recoveryRaw = storedRaw;
}
if (!songs?.length)
  songs = [
    create({
      title: "Al otro lado",
      artist: "Canción de ejemplo · Chordi",
      text: example,
    }),
  ];
if (!songs.some((s) => s.id === active)) active = songs[0].id;
let zoom = 1;
let section = "document",
  editing = false,
  currentPage = 1,
  observer,
  saveTimer;
const song = () => songs.find((s) => s.id === active);
function persist() {
  if (!workspaceSession.held) return false;
  if (recoveryRaw) {
    $("#save-state").textContent = t(
      "No se pudieron restaurar los datos guardados. Exporta una copia de recuperación antes de continuar.",
    );
    return false;
  }
  try {
    localStorage.setItem("chordi-v1", JSON.stringify({ songs, active }));
    $("#save-state").textContent = t("Guardado en este navegador");
    return true;
  } catch {
    $("#save-state").textContent = t("No se pudo guardar · exporta una copia");
    return false;
  }
}
function changed() {
  song().dirty = true;
  $("#save-state").textContent = t("Guardando…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 350);
  renderTabs();
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  setTimeout(() => $("#toast").classList.remove("visible"), 6500);
}
$("#app").innerHTML = t(shell);
function renderTabs() {
  $("#tabs").innerHTML =
    songs
      .map(
        (s) =>
          t`<div class="tab ${s.id === active ? "active" : ""}"><button class="tab-select" data-id="${s.id}"><span class="tab-icon">♫</span><span>${esc(s.title || t("Nueva canción"))}</span>${s.dirty ? t('<i title="Cambios sin exportar"></i>') : ""}</button><button class="tab-close" data-close="${s.id}" aria-label="Cerrar ${esc(s.title)}">×</button></div>`,
      )
      .join("") +
    t('<button id="tab-plus" aria-label="Nueva canción">＋</button>');
  $("#tab-plus").onclick = openNewSong;
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
  $("#source-area").hidden = section !== "document";
  $("#settings").hidden = section === "chords";
  $("#chords-panel").hidden = section !== "chords";
  if (section === "chords") {
    chordPanel.refresh();
    return;
  }
  if (section === "key") {
    $("#settings").innerHTML =
      t`<div class="panel-title"><span>Tu brújula musical</span><span>♯</span></div><p class="section-caption">TONALIDAD PROBABLE</p><div class="key-name">${key ? key.name : t("Aún sin acordes")}<span>${key ? t("Estimación · según los acordes escritos") : t("Añade acordes para analizar la canción")}</span></div>${key ? t`<div class="degrees">${key.scale.map((c, i) => `<button class="chord degree" data-chord="${c}"><small>${key.degrees[i]}</small>${c}</button>`).join("")}</div><p class="key-note">Con cejilla ${s.capo}, suena en <strong>${keyInfo(transpose(s.text, s.capo))?.name}</strong>.</p>` : ""}<div class="info-box">Esta guía es solo para ti. La tonalidad y sus grados no aparecen en la hoja ni en las exportaciones.</div>`;
    return;
  }
  $("#settings").innerHTML =
    t`<div class="panel-title"><span>El documento</span><span class="muted">01</span></div><label class="field">TÍTULO<input id="title" value="${esc(s.title)}" maxlength="90" placeholder="Nombre de la canción"></label><label class="field">ARTISTA<input id="artist" value="${esc(s.artist)}" maxlength="100" placeholder="Nombre del artista"></label><div class="settings-row"><label class="field">TAMAÑO <div class="number-unit"><input id="fontSize" type="number" min="7" max="20" step="0.5" value="${s.fontSize}"><span>pt</span></div></label><label class="field">MÁRGENES <div class="number-unit"><input id="margin" type="number" min="5" max="35" step="1" value="${s.margin}"><span>mm</span></div></label><label class="field">COLUMNAS<div class="segmented"><button data-columns="1" class="${s.columns === 1 ? "selected" : ""}">1</button><button data-columns="2" class="${s.columns === 2 ? "selected" : ""}">2</button></div></label></div><div class="music-controls"><div><label>TRANSPORTAR</label><div class="stepper"><button id="transpose-down" aria-label="Bajar un semitono">−</button><span>${key ? key.name.replace(t(" mayor"), "").replace(t(" menor"), "m") : "—"}</span><button id="transpose-up" aria-label="Subir un semitono">＋</button></div></div><button id="link" class="chain ${s.linked ? "linked" : ""}" aria-label="Vincular cejilla y acordes" aria-pressed="${s.linked}" title="${s.linked ? t("Mantener la tonalidad que suena") : t("La cejilla solo cambia la indicación")}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m10 14 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 -1)"/></svg></button><div><label>CEJILLA</label><div class="stepper"><button id="capo-down" aria-label="Bajar cejilla">−</button><input id="capo" type="number" min="0" max="12" value="${s.capo}" aria-label="Cejilla"><button id="capo-up" aria-label="Subir cejilla">＋</button></div></div></div><p class="link-help">${s.linked ? t("Enlazados · cambiar la cejilla conserva la tonalidad que suena.") : t("Independientes · la cejilla solo cambia la indicación.")}</p>`;
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
function transposeSong(n) {
  const s = song();
  s.text = transpose(s.text, n);
  s.chordShapes = Object.fromEntries(
    Object.entries(s.chordShapes || {}).map(([name, shape]) => {
      let offset = n;
      const played = shape.frets.filter((f) => f >= 0);
      while (played.length && Math.min(...played) + offset < 0) offset += 12;
      while (played.length && Math.max(...played) + offset > 24) offset -= 12;
      return [
        transposeChord(name, n),
        { ...shape, frets: shape.frets.map((f) => (f < 0 ? -1 : f + offset)) },
      ];
    }),
  );
  for (const sticker of s.chordStickers || [])
    if (Array.isArray(sticker.chords))
      sticker.chords = sticker.chords.map((c) => transposeChord(c, n));
}
function shift(n) {
  transposeSong(n);
  changed();
  render();
}
function setCapo(value) {
  const s = song(),
    next = Math.min(12, Math.max(0, Number.isFinite(value) ? value : 0));
  if (s.linked) transposeSong(s.capo - next);
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
  $("#line-count").textContent = t`${lines} líneas`;
  dictionary.renderTray();
  if (section === "chords") chordPanel.refresh();
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
              `<div class="song-line ${editing ? "editable" : ""}" data-line="${r.index}" data-end="${r.endIndex ?? r.index}" style="left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;font-size:${l.size}px" ${editing ? t('tabindex="0" role="button" aria-label="Editar verso"') : ""}>${r.marks.map((m) => `<span class="sheet-chord" data-chord="${esc(m.chord)}" style="left:${m.x * l.cw}px;top:${(m.lane || 0) * l.size * 1.44}px">${esc(m.chord)}</span>`).join("")}<span class="lyric" style="top:${r.lyricOffset}px">${esc(r.lyric) || " "}</span></div>`,
          )
          .join(
            "",
          )}<span class="sheet-brand">Chordi</span><span class="sheet-page">${i + 1}</span></article></div>`,
    )
    .join("");
  $("#pencil").classList.toggle("selected", editing);
  $("#pencil").setAttribute("aria-pressed", editing);
  $("#editing-hint").textContent = editing
    ? t("Pulsa un verso para editar letra y acordes.")
    : t("Tu próxima canción empieza aquí.");
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
        t`Página ${currentPage} de ${l.pages.length}`;
    },
    { root: $("#pages-scroll"), threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
  document.querySelectorAll(".page-shell").forEach((p) => observer.observe(p));
  $("#page-count").textContent =
    t`Página ${Math.min(currentPage, l.pages.length)} de ${l.pages.length}`;
  if (editing) {
    document.querySelectorAll("[data-header]").forEach(
      (el) =>
        (el.onblur = () => {
          if (el.innerText === (s[el.dataset.header] || "").toLocaleUpperCase())
            return;
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
  dictionary.render();
  resizePages();
}
function editLine(el) {
  if (el.querySelector("textarea")) return;
  const index = Number(el.dataset.line),
    endIndex = Number(el.dataset.end),
    lines = song().text.split("\n");
  el.innerHTML = t`<textarea class="inline-editor" aria-label="Editar verso con acordes">${esc(lines.slice(index, endIndex + 1).join("\n"))}</textarea>`;
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
    scale = Math.max(0.2, Math.min(1.08, available / PAGE.width)) * zoom;
  $("#zoom-reset").textContent = Math.round(zoom * 100) + "%";
  $("#zoom-out").disabled = zoom <= 0.5;
  $("#zoom-in").disabled = zoom >= 2.5;
  $("#pages").style.minWidth = PAGE.width * scale + 64 + "px";
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
  if (e.target.value.length > MAX_TEXT_LENGTH) {
    e.target.value = song().text;
    toast(
      t(
        "El texto es demasiado largo. Importa hasta 50.000 caracteres por canción.",
      ),
    );
    return;
  }
  const harmonyChanged =
    JSON.stringify(chords(song().text)) !==
    JSON.stringify(chords(e.target.value));
  song().text = e.target.value;
  changed();
  sourceMeta();
  if (harmonyChanged) renderSettings();
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
let importGeneration = 0;
function importScreen(screen) {
  importGeneration++;
  $("#new-menu").hidden = screen !== "menu";
  $("#text-import").hidden = screen !== "text";
  $("#web-import").hidden = screen !== "web";
  $("#import-back").hidden = screen === "menu";
  $("#new-heading").textContent = {
    menu: t("Una nueva canción."),
    text: t("Importar texto o archivo."),
    web: t("Importar desde una web."),
  }[screen];
  $("#new-description").textContent = {
    menu: t("De una idea a tu próxima hoja de acordes."),
    text: t(
      "Pega la letra con sus acordes o abre un archivo TXT, PDF o Word (.docx).",
    ),
    web: t("Pega el enlace de la canción que quieres tocar."),
  }[screen];
  $("#import-privacy").textContent =
    screen === "web"
      ? t("El servidor descarga únicamente la página del enlace.")
      : t("Los archivos se procesan aquí, en tu navegador.");
  $("#import-error").hidden = true;
  $("#import-error").textContent = "";
  $("#web-submit").disabled = false;
  $("#web-submit").textContent = t("Importar canción");
  $("#choose-file").disabled = false;
  $("#choose-file").textContent = t("Abrir archivo");
  $("#paste-import").disabled = false;
  $("#new-dialog").scrollTop = 0;
  if (screen === "web") $("#web-url").focus();
  else if (screen === "text") $("#import-text").focus();
  else $("#import").focus();
}
function openNewSong() {
  $("#web-url").value = "";
  $("#import-text").value = "";
  $("#file").value = "";
  importScreen("menu");
  $("#new-dialog").showModal();
  $("#import").focus();
}
$("#new").onclick = openNewSong;
$("#import-back").onclick = () => importScreen("menu");
$("#new-dialog").addEventListener("close", () => {
  importGeneration++;
});
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
async function acceptImport(data) {
  const generation = importGeneration;
  if (data.text.length > MAX_TEXT_LENGTH)
    throw new Error(
      t(
        "El texto es demasiado largo. Importa hasta 50.000 caracteres por canción.",
      ),
    );
  const s = create({ ...data, dirty: true });
  Object.assign(s, await fitSong(s));
  if (generation !== importGeneration || !$("#new-dialog").open) return;
  songs.push(s);
  active = s.id;
  resetView();
  $("#new-dialog").close();
  render();
  persist();
  const fit =
    layout(s).pages.length === 1
      ? t("Ajustada a una página. Puedes cambiar los ajustes.")
      : t(
          "Es demasiado larga para una página con letra legible. Se han optimizado los ajustes.",
        );
  toast([data.notice, fit].filter(Boolean).join(" "));
}
function importError(error) {
  $("#import-error").hidden = false;
  $("#import-error").textContent = t(error.message);
}
$("#import").onclick = () => importScreen("text");
$("#choose-file").onclick = () => $("#file").click();
$("#paste-import").onclick = async () => {
  const text = $("#import-text").value;
  if (!text.trim())
    return importError(
      new Error(t("Pega la letra y los acordes antes de importar.")),
    );
  const generation = importGeneration;
  $("#paste-import").disabled = true;
  try {
    await acceptImport(importText(text, t("Canción importada")));
    if (generation === importGeneration) $("#import-text").value = "";
  } catch (error) {
    if (generation === importGeneration && $("#new-dialog").open)
      importError(error);
  } finally {
    if (generation === importGeneration) $("#paste-import").disabled = false;
  }
};
$("#web").onclick = () => importScreen("web");
$("#web-import").onsubmit = async (e) => {
  e.preventDefault();
  const generation = importGeneration;
  $("#import-error").hidden = true;
  $("#web-submit").disabled = true;
  $("#web-submit").textContent = t("Importando…");
  try {
    const data = await importWebSong($("#web-url").value.trim());
    if (generation !== importGeneration || !$("#new-dialog").open) return;
    await acceptImport(data);
    $("#web-url").value = "";
  } catch (error) {
    if (generation === importGeneration && $("#new-dialog").open)
      importError(error);
  } finally {
    if (generation === importGeneration) {
      $("#web-submit").disabled = false;
      $("#web-submit").textContent = t("Importar canción");
    }
  }
};
$("#file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const generation = importGeneration;
  $("#choose-file").disabled = true;
  $("#paste-import").disabled = true;
  $("#choose-file").textContent = t("Importando…");
  try {
    if (file.name.toLowerCase().endsWith(".json")) {
      if (file.size > 10 * 1024 * 1024)
        throw new Error(t("La copia supera el límite de 10 MiB."));
      const restored = restoreWorkspace(await file.text());
      if (generation !== importGeneration || !$("#new-dialog").open) return;
      songs.push(...restored.songs);
      active = restored.active;
      resetView();
      $("#new-dialog").close();
      render();
      persist();
      toast(t("Copia restaurada como nuevas pestañas."));
      return;
    }
    const data = await importFile(file);
    if (generation !== importGeneration || !$("#new-dialog").open) return;
    await acceptImport(data);
  } catch (error) {
    if (generation === importGeneration && $("#new-dialog").open)
      importError(error);
  } finally {
    if (generation === importGeneration) {
      $("#choose-file").disabled = false;
      $("#paste-import").disabled = false;
      $("#choose-file").textContent = t("Abrir archivo");
      e.target.value = "";
    }
  }
};
$("#workspace-backup").onclick = () => {
  download(
    new Blob([serializeWorkspace(songs, active)], { type: "application/json" }),
    "chordi-workspace.json",
  );
  $("#export-menu").hidden = true;
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
        toast(t("Preparando tu documento…"));
        await exportSong(structuredClone(s), b.dataset.export);
        if (JSON.stringify(s) === snapshot) s.dirty = false;
        renderTabs();
        persist();
        toast(t("Documento exportado. Listo para tocar."));
      } catch (e) {
        toast(t("No se pudo exportar: ") + e.message);
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
$("#fit").onclick = async () => {
  const s = song(),
    snapshot = JSON.stringify(s);
  $("#fit").disabled = true;
  try {
    const settings = await fitSong(structuredClone(s));
    if (s !== song() || JSON.stringify(s) !== snapshot) return;
    Object.assign(s, settings);
    changed();
    render();
    toast(
      layout(s).pages.length === 1
        ? t("La canción cabe en una página.")
        : t(
            "Se han optimizado los ajustes. La canción necesita más de una página con letra legible.",
          ),
    );
  } catch (error) {
    toast(error.message);
  } finally {
    $("#fit").disabled = false;
  }
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
  tooltip.innerHTML = `<strong>${esc(target.dataset.chord)}</strong>${diagram(target.dataset.chord, 0, (song().chordShapes?.[target.dataset.chord] || song().chordShapes?.[target.dataset.chord.replace(/\*$/, "")])?.frets)}`;
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
  if (!switchingLanguage && songs.some((s) => s.dirty)) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    toast(
      persist()
        ? t("Canciones guardadas en este navegador.")
        : t("No se pudo guardar · exporta una copia"),
    );
  }
});
setupEditorTools({ resizePages });
const chordPanel = setupChordsPanel({
  song,
  changed,
  refresh: render,
  esc,
  notify: toast,
});
const dictionary = setupDictionary({ song, changed, renderPages, esc });
for (const [id, delta] of [
  ["zoom-in", 0.1],
  ["zoom-out", -0.1],
  ["zoom-reset", 0],
])
  $("#" + id).onclick = () => {
    zoom = delta
      ? Math.max(0.5, Math.min(2.5, Math.round((zoom + delta) * 10) / 10))
      : 1;
    resizePages();
  };
render();
persist();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persist();
});
window.addEventListener("pagehide", () => {
  persist();
  workspaceSession.release();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});

let switchingLanguage = false;
document.documentElement.lang = getLocale();
document.title =
  getLocale() === "en"
    ? "Chordi · Your music, on paper"
    : "Chordi · Tu música, en papel";
$("#language").value = getLocale();
$("#language").onchange = () => {
  if (!persist()) {
    $("#language").value = getLocale();
    return;
  }
  try {
    localStorage.setItem("chordi-language", $("#language").value);
    switchingLanguage = true;
    location.assign(`/${$("#language").value}/`);
  } catch {
    $("#language").value = getLocale();
    toast(t("No se pudo guardar · exporta una copia"));
  }
};

if (recoveryRaw) {
  $("#recover").hidden = false;
  $("#recover").onclick = () => {
    download(
      new Blob([recoveryRaw], { type: "application/json" }),
      "chordi-recovery.json",
    );
    toast(
      t(
        "Copia descargada. Conserva el archivo y consulta la guía de recuperación.",
      ),
    );
  };
}
