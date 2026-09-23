import { escapeHtml as esc } from "./ui/html.js";
import { setupLanguagePicker } from "./ui/language.js";
import { renderDocumentSettings, renderKeySettings } from "./ui/settings.js";
import { renderPageMarkup } from "./ui/pages.js";
import { introHtml } from "./ui/intro-copy.js";
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
  chordRE,
} from "./music.js";
import { layout, PAGE } from "./layout.js";
import { importWebSong } from "./web-import.js";
import { exportSong, importFile, importText, download } from "./files.js";
const $ = (s) => document.querySelector(s);
document.documentElement.lang = getLocale();
const workspaceSession = await openWorkspaceSession($("#app"));
let songs, active, recoveryRaw, storedRaw;
try {
  storedRaw =
    localStorage.getItem("chordleaf-v1") ?? localStorage.getItem("chordi-v1");
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
if (!songs) songs = [];
if (!songs.some((s) => s.id === active)) active = songs[0]?.id ?? null;
let zoom = 1;
let section = "document",
  mobileView = "editor",
  editing = false,
  currentPage = 1,
  observer,
  saveTimer,
  previewTimer;
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
    localStorage.setItem("chordleaf-v1", JSON.stringify({ songs, active }));
    $("#save-state").textContent = t("Guardado en este navegador");
    return true;
  } catch {
    $("#save-state").textContent = t("No se pudo guardar · exporta una copia");
    return false;
  }
}
function changed() {
  if (!song()) return;
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
$("#app").innerHTML = t(shell.replace(/\s+/g, " "));
$("#intro-content").innerHTML = introHtml(getLocale());
function renderTabs() {
  $("#tabs").innerHTML =
    songs
      .map(
        (s) =>
          t`<div class="tab ${s.id === active ? "active" : ""}"><button class="tab-select" data-id="${s.id}"><span class="tab-icon">♫</span><span>${esc(s.title || t("Nueva canción"))}</span>${s.dirty ? t('<i title="Cambios sin exportar"></i>') : ""}</button><button class="tab-close" data-close="${s.id}" aria-label="Cerrar ${esc(s.title)}">×</button></div>`,
      )
      .join("") +
    (songs.length
      ? t('<button id="tab-plus" aria-label="Nueva canción">＋</button>')
      : "");
  if ($("#tab-plus")) $("#tab-plus").onclick = openNewSong;
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
  if (active === id) active = songs[0]?.id ?? null;
  render();
  persist();
}
function renderSettings() {
  const s = song(),
    key = keyInfo(s.text);
  updateNavigation();
  $("#source-area").hidden = section !== "document";
  $("#settings").hidden = section === "chords";
  $("#chords-panel").hidden = section !== "chords";
  if (section === "chords") {
    chordPanel.refresh();
    return;
  }
  if (section === "key") {
    $("#settings").innerHTML = renderKeySettings(s, key);
    return;
  }
  $("#settings").innerHTML = renderDocumentSettings(s, key);
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
function updateNavigation() {
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  $("main").dataset.mobileView = mobileView;
  document.querySelectorAll(".rail button").forEach((button) => {
    const selected = button.dataset.mobileView
      ? mobile && mobileView === "preview"
      : button.dataset.section === section &&
        (!mobile || mobileView === "editor");
    button.classList.toggle("selected", selected);
    if (selected) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const pencil = $("#pencil");
  const pencilLabel = t(
    mobile ? "Editar letra y acordes" : "Editar directamente la hoja",
  );
  pencil.title = pencilLabel;
  pencil.setAttribute("aria-label", pencilLabel);
  if (mobile) pencil.removeAttribute("aria-pressed");
  else pencil.setAttribute("aria-pressed", String(editing));
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
function sourceMeta({ harmonyChanged = true } = {}) {
  const lines = song().text.split("\n").length;
  if ($("#line-numbers").childElementCount !== lines)
    $("#line-numbers").innerHTML = Array.from(
      { length: lines },
      (_, i) => `<div>${i + 1}</div>`,
    ).join("");
  $("#line-count").textContent = t`${lines} líneas`;
  if (harmonyChanged) dictionary.renderTray();
  if (section === "chords") chordPanel.refresh();
}
function renderPages() {
  clearTimeout(previewTimer);
  previewTimer = undefined;
  const s = song(),
    l = layout(s);
  $("#pages").innerHTML = renderPageMarkup(s, l, editing);
  $("#issue-editor").hidden = true;
  const issues = [...s.text.matchAll(/\[\?[^\[\]\n]{1,40}\]/g)].length;
  const noChords = !issues && !!s.text.trim() && !chords(s.text).length;
  $("#issue-count").hidden = !issues && !noChords;
  $("#issue-count").dataset.noChords = String(noChords);
  $("#issue-count").textContent = noChords
    ? t("Sin acordes detectados")
    : `${t("Acordes por revisar")}: ${issues}`;
  $("#pencil").classList.toggle("selected", editing);
  if (window.matchMedia("(max-width: 760px)").matches)
    $("#pencil").removeAttribute("aria-pressed");
  else $("#pencil").setAttribute("aria-pressed", editing);
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
      el.onclick = (event) => {
        if (!event.target.closest(".unresolved-chord")) editLine(el);
      };
      el.onkeydown = (e) => {
        if (e.key === "Enter" && !e.target.closest(".unresolved-chord")) {
          e.preventDefault();
          editLine(el);
        }
      };
    });
  }
  dictionary.render();
  resizePages();
}
function schedulePreview() {
  if (song().text.length <= 10000) return renderPages();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPages, 120);
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
  const width = $("#pages-scroll").clientWidth;
  if (!width) return;
  const available = width - 64,
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
function openIssue(el) {
  const panel = $("#issue-editor");
  panel.dataset.line = el.dataset.issueLine;
  panel.dataset.offset = el.dataset.issueOffset;
  $("#issue-value").value = el.textContent;
  $("#issue-message").textContent = t(
    "Corrige el acorde o déjalo pendiente para más tarde.",
  );
  panel.hidden = false;
  $("#issue-value").focus();
  $("#issue-value").select();
}
$("#pages").addEventListener("click", (event) => {
  const issue = event.target.closest(".unresolved-chord");
  if (!issue) return;
  event.stopPropagation();
  openIssue(issue);
});
$("#pages").addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const issue = event.target.closest(".unresolved-chord");
  if (!issue) return;
  event.preventDefault();
  event.stopPropagation();
  openIssue(issue);
});
$("#issue-count").onclick = () => {
  if ($("#issue-count").dataset.noChords === "true") {
    section = "document";
    mobileView = "editor";
    renderSettings();
    $("#source").focus();
    return;
  }
  const issue = $(".unresolved-chord");
  issue?.scrollIntoView({ block: "center", behavior: "smooth" });
  if (issue) openIssue(issue);
};
$("#issue-close").onclick = () => ($("#issue-editor").hidden = true);
$("#issue-editor").onsubmit = (event) => {
  event.preventDefault();
  const value = $("#issue-value").value.trim();
  if (!chordRE.test(value)) {
    $("#issue-message").textContent = t(
      "Acorde no reconocido. Prueba otra escritura o déjalo pendiente.",
    );
    return;
  }
  const panel = $("#issue-editor"),
    line = Number(panel.dataset.line),
    offset = Number(panel.dataset.offset),
    lines = song().text.split("\n"),
    marker = lines[line]?.slice(offset).match(/^\[\?[^\[\]\n]{1,40}\]/)?.[0];
  if (!marker) return renderPages();
  lines[line] =
    lines[line].slice(0, offset) +
    `[${value}]` +
    lines[line].slice(offset + marker.length);
  song().text = lines.join("\n");
  changed();
  renderSource();
  renderPages();
};
function render() {
  renderTabs();
  const empty = !song();
  $("#tabs").hidden = empty;
  $("#empty-state").hidden = !empty;
  $("main").hidden = empty;
  $("#export").disabled = empty;
  if (empty) {
    clearTimeout(previewTimer);
    previewTimer = undefined;
    observer?.disconnect();
    return;
  }
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
  sourceMeta({ harmonyChanged });
  if (harmonyChanged) renderSettings();
  schedulePreview();
};
$("#source").onscroll = (e) =>
  ($("#line-numbers").scrollTop = e.target.scrollTop);
document.querySelectorAll("[data-section]").forEach(
  (b) =>
    (b.onclick = () => {
      section = b.dataset.section;
      mobileView = "editor";
      renderSettings();
    }),
);
$("[data-mobile-view='preview']").onclick = () => {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
  mobileView = "preview";
  updateNavigation();
  resizePages();
};
let importGeneration = 0,
  importController;
function importScreen(screen) {
  importController?.abort();
  importController = new AbortController();
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
$("#empty-new").onclick = openNewSong;
$("#import-back").onclick = () => importScreen("menu");
$("#new-dialog").addEventListener("close", () => {
  importController?.abort();
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
  Object.assign(s, await fitSong(s, { signal: importController.signal }));
  if (generation !== importGeneration || !$("#new-dialog").open) return;
  songs.push(s);
  active = s.id;
  resetView();
  mobileView = "preview";
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
    const data = await importWebSong($("#web-url").value.trim(), {
      signal: importController.signal,
    });
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
  importController?.abort();
  importController = new AbortController();
  const signal = importController.signal;
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
    const data = await importFile(file, { signal });
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
    "chordleaf-workspace.json",
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
  if (window.matchMedia("(max-width: 760px)").matches) {
    if (editing) {
      editing = false;
      renderPages();
    }
    $("#expand-editor").click();
    return;
  }
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
const languagePicker = setupLanguagePicker({ persist, toast });
window.addEventListener("resize", () => {
  if (editing && window.matchMedia("(max-width: 760px)").matches) {
    editing = false;
    renderPages();
  }
  updateNavigation();
  resizePages();
});
window.addEventListener("beforeunload", (e) => {
  persist();
  if (!languagePicker.switching && songs.some((s) => s.dirty)) {
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
if (recoveryRaw) {
  $("#recover").hidden = false;
  $("#recover").onclick = () => {
    download(
      new Blob([recoveryRaw], { type: "application/json" }),
      "chordleaf-recovery.json",
    );
    toast(
      t(
        "Copia descargada. Conserva el archivo y consulta la guía de recuperación.",
      ),
    );
  };
}
