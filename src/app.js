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
  transposeSpelling,
  chords,
  chordRE,
} from "./music.js";
import { layout, PAGE } from "./layout.js";
import { importWebSong } from "./web-import.js";
import {
  exportSong,
  importFile,
  importText,
  download,
  downloadName,
} from "./files.js";
import {
  projectSignature,
  serializeProject,
  restoreProject,
} from "./project.js";
import { registerServiceWorker } from "./pwa.js";
import { setupLocalWebImport } from "./ui/local-web-import.js";
import { setupAudioImport } from "./ui/audio-import.js";
import { setupClipboardImport } from "./ui/clipboard-import.js";
import { setupMenu } from "./ui/menu.js";
import { blankLineCount, compressBlankLines } from "./text-tools.js";
import {
  RECENT_KEY,
  readRecent,
  rememberClosed,
  forget,
  worthKeeping,
} from "./recent-projects.js";
import { exampleSong, chordRows } from "./example-song.js";
const $ = (s) => document.querySelector(s);
document.documentElement.lang = getLocale();
const workspaceSession = await openWorkspaceSession($("#app"));
workspaceSession.beforeHandOff = () => persist();
let recent = [];
try {
  recent = readRecent(localStorage.getItem(RECENT_KEY));
} catch {
  /* Storage can be unavailable in private or restricted contexts. */
}
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
  songs = Array.isArray(stored?.songs)
    ? stored.songs.map((data) => {
        const loaded = create(data);
        loaded.dirty =
          !loaded.projectSignature ||
          projectSignature(loaded) !== loaded.projectSignature;
        return loaded;
      })
    : undefined;
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
  mobileView = "document",
  desktopView = "document",
  musicSection = "key",
  editing = false,
  currentPage = 1,
  observer,
  saveTimer,
  previewTimer,
  toastTimer,
  lastSaveAnnouncement,
  persistenceRequested = false,
  saveFailureNotified = false;
const songViews = new Map();
const songDesktopViews = new Map();
const songMusicSections = new Map();
const transposeHistory = new Map();
let chordMode = "song";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const song = () => songs.find((s) => s.id === active);
/** Keep the visible save label in sync without announcing every keystroke.
 * Screen readers only hear the hidden live region on real transitions. */
function setSaveState(text, { error = false, announce = false } = {}) {
  const state = $("#save-state");
  if (!state) return;
  state.textContent = text;
  state.classList.toggle("error", error);
  if (announce && text !== lastSaveAnnouncement) {
    lastSaveAnnouncement = text;
    const announcer = $("#save-announcer");
    if (announcer) announcer.textContent = text;
  }
}
function persist() {
  if (!workspaceSession.held) return false;
  if (recoveryRaw) {
    setSaveState(
      t(
        "No se pudieron restaurar los datos guardados. Exporta una copia de recuperación antes de continuar.",
      ),
      { error: true, announce: true },
    );
    return false;
  }
  try {
    localStorage.setItem("chordleaf-v1", JSON.stringify({ songs, active }));
    setSaveState(t("Guardado en este navegador"), { announce: true });
    saveFailureNotified = false;
    requestPersistentStorage();
    return true;
  } catch {
    setSaveState(t("No se pudo guardar la sesión · descarga el proyecto"), {
      error: true,
      announce: true,
    });
    if (!saveFailureNotified) {
      saveFailureNotified = true;
      toast(t("No se pudo guardar la sesión · descarga el proyecto"), "error");
    }
    return false;
  }
}
/** Ask once, after real content exists, so browsers keep songs under pressure. */
function requestPersistentStorage() {
  if (persistenceRequested || !songs.some(worthKeeping)) return;
  persistenceRequested = true;
  navigator.storage?.persist?.().catch(() => {});
}
function saveRecent() {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    return true;
  } catch {
    toast(t("No se pudo guardar la lista de recientes."), "error");
    return false;
  }
}
function changed({ preserveTranspose = false } = {}) {
  if (!song()) return;
  if (!preserveTranspose) transposeHistory.delete(song().id);
  song().dirty = projectSignature(song()) !== song().projectSignature;
  setSaveState(t("Guardando…"), { announce: true });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 350);
  renderTabs();
}
/** Success, warning and error messages replace each other in the same slot. */
function toast(message, variant = "success") {
  const element = $("#toast");
  element.textContent = message;
  element.classList.remove("toast-success", "toast-warning", "toast-error");
  element.classList.add(`toast-${variant}`);
  element.setAttribute("role", variant === "error" ? "alert" : "status");
  element.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => element.classList.remove("visible"),
    variant === "error" ? 9000 : 6500,
  );
}
function scrollToOption(element, options) {
  element?.scrollIntoView({
    ...options,
    behavior: reducedMotion.matches ? "auto" : "smooth",
  });
}
$("#app").innerHTML = t(shell.replace(/\s+/g, " "));
$("#intro-content").innerHTML = introHtml(getLocale(), { features: false });
const exportMenu = setupMenu($("#export"), $("#export-menu"));
$("#toast").addEventListener("click", () => {
  clearTimeout(toastTimer);
  $("#toast").classList.remove("visible");
});
function renderTabs() {
  $("#song-heading").textContent = song()
    ? song().title || t("Nueva canción")
    : "";
  $("#tabs").innerHTML =
    songs
      .map(
        (s) =>
          t`<div class="tab ${s.id === active ? "active" : ""}"><button class="tab-select" data-id="${s.id}" ${s.id === active ? 'aria-current="page"' : ""}><span class="tab-icon" aria-hidden="true">♫</span><span>${esc(s.title || t("Nueva canción"))}</span></button><button class="tab-close" data-close="${s.id}" aria-label="Cerrar ${esc(s.title || t("Nueva canción"))}" title="${t("Cerrar y guardar en Recientes")}">×</button></div>`,
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
        mobileView = songViews.get(active) ?? "document";
        desktopView = songDesktopViews.get(active) ?? "document";
        musicSection = songMusicSections.get(active) ?? "key";
        resetView();
        render();
        persist();
      }),
  );
  document
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = () => closeSong(b.dataset.close)));
  const tabList = $("#tabs"),
    selectedTab = tabList.querySelector(".tab.active");
  if (selectedTab) {
    const viewport = tabList.getBoundingClientRect(),
      selected = selectedTab.getBoundingClientRect();
    if (selected.left < viewport.left)
      tabList.scrollLeft -= viewport.left - selected.left;
    else if (selected.right > viewport.right)
      tabList.scrollLeft += selected.right - viewport.right;
  }
}
/** Closing keeps the project in Recents; removing it from there is explicit. */
function closeSong(id) {
  const target = songs.find((s) => s.id === id);
  if (!target) return;
  const kept = worthKeeping(target);
  if (kept) {
    recent = rememberClosed(recent, structuredClone(target));
    if (!saveRecent()) return;
  }
  removeSong(id);
  if (kept) toast(t("Canción cerrada. Puedes reabrirla desde Recientes."));
}
function reopenRecent(id) {
  const entry = recent.find((item) => item.song.id === id);
  if (!entry) return;
  const opened = create(entry.song);
  if (songs.some((s) => s.id === opened.id)) opened.id = crypto.randomUUID();
  songs.push(opened);
  recent = forget(recent, id);
  saveRecent();
  active = opened.id;
  mobileView = "preview";
  desktopView = "document";
  songViews.set(active, mobileView);
  songDesktopViews.set(active, desktopView);
  musicSection = "key";
  resetView();
  if ($("#new-dialog").open) $("#new-dialog").close();
  render();
  persist();
}
function removeRecent(id) {
  const index = recent.findIndex((item) => item.song.id === id);
  if (index < 0) return;
  recent = forget(recent, id);
  saveRecent();
  renderRecent();
  // Keep keyboard focus inside the list after a removal.
  const buttons = document.querySelectorAll(
    `${$("#new-dialog").open ? "#dialog-recent-list" : "#recent-list"} .recent-open`,
  );
  (buttons[Math.min(index, buttons.length - 1)] ?? $("#empty-new"))?.focus();
}
const relativeTime = new Intl.RelativeTimeFormat(getLocale(), {
  numeric: "auto",
});
function closedAgo(time) {
  const minutes = Math.round((time - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return relativeTime.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeTime.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relativeTime.format(days, "day");
  return new Date(time).toLocaleDateString(getLocale());
}
function recentMarkup(entries) {
  return entries
    .map(({ song: s, closedAt }) => {
      const title = esc(s.title || t("Canción sin título"));
      return `<li><button class="recent-open" data-recent="${s.id}"><span class="recent-title">${title}</span><small>${esc([closedAgo(closedAt), s.artist].filter(Boolean).join(" · "))}</small></button><button class="recent-remove" data-recent-remove="${s.id}" aria-label="${t("Quitar de Recientes")}: ${title}" title="${t("Quitar de Recientes")}">×</button></li>`;
    })
    .join("");
}
function renderRecent() {
  for (const [section, list, limit] of [
    ["#recent-projects", "#recent-list", 6],
    ["#dialog-recent", "#dialog-recent-list", 4],
  ]) {
    $(section).hidden = !recent.length;
    $(list).innerHTML = recentMarkup(recent.slice(0, limit));
  }
}
function recentClick(event) {
  const remove = event.target.closest("[data-recent-remove]");
  if (remove) return removeRecent(remove.dataset.recentRemove);
  const open = event.target.closest("[data-recent]");
  if (open) reopenRecent(open.dataset.recent);
}
function renderEntrySheet() {
  const example = exampleSong(getLocale());
  $("#entry-sheet").innerHTML =
    `<div class="entry-page"><strong>${esc(example.title.toLocaleUpperCase())}</strong><small>${esc(example.artist)}</small><pre>${chordRows(
      example.text,
      6,
    )
      .map((row) => `<b>${esc(row.chords)}</b>\n${esc(row.lyric)}`)
      .join("\n")}</pre></div>`;
}
async function openExample() {
  const example = exampleSong(getLocale());
  const s = create({ ...example });
  const button = $("#example-song");
  button.disabled = true;
  try {
    Object.assign(s, await fitSong(s));
  } catch {
    /* The default layout is still readable. */
  } finally {
    button.disabled = false;
  }
  songs.push(s);
  active = s.id;
  desktopView = "document";
  mobileView = "preview";
  songDesktopViews.set(active, desktopView);
  songViews.set(active, mobileView);
  musicSection = "key";
  songMusicSections.set(active, musicSection);
  resetView();
  render();
  persist();
  toast(t("Canción de ejemplo abierta. Cámbiala a tu gusto o crea una nueva."));
}
function removeSong(id) {
  songs = songs.filter((s) => s.id !== id);
  songViews.delete(id);
  songDesktopViews.delete(id);
  songMusicSections.delete(id);
  if (active === id) {
    active = songs[0]?.id ?? null;
    mobileView = songViews.get(active) ?? "document";
    desktopView = songDesktopViews.get(active) ?? "document";
    musicSection = songMusicSections.get(active) ?? "key";
  }
  render();
  persist();
}
function sectionForDesktop(view) {
  if (view === "key") return "key";
  return ["song", "search", "identify"].includes(view) ? "chords" : "document";
}
function syncSection() {
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  section = mobile
    ? mobileView === "music"
      ? musicSection
      : "document"
    : sectionForDesktop(desktopView);
  if (!mobile && section === "chords" && chordMode !== desktopView) {
    chordMode = desktopView;
    chordPanel.setMode(chordMode);
  }
}
/** Blank-line cleanup for imported sheets. Inline spacing stays untouched so
 * every chord keeps its anchor over the lyrics. */
function compressBlanks() {
  const s = song();
  const panel = $("#settings");
  const scrollTop = panel?.scrollTop ?? 0;
  const before = s.text;
  const after = compressBlankLines(before);
  const removed = blankLineCount(before) - blankLineCount(after);
  if (!removed || after === before) {
    toast(t("No hay líneas vacías que comprimir."));
    renderSettings();
    if (panel) panel.scrollTop = scrollTop;
    return;
  }
  s.text = after;
  changed();
  renderSource();
  schedulePreview();
  renderSettings();
  if (panel) panel.scrollTop = scrollTop;
  const noun = removed === 1 ? t("línea vacía") : t("líneas vacías");
  toast(t`Se comprimieron ${removed} ${noun}.`);
}
function renderSettings() {
  syncSection();
  updateNavigation();
  // Resize events reach this from the empty workspace (and after closing the
  // last tab), where there is no active song to render.
  const s = song();
  if (!s) return;
  const key = keyInfo(s.text);
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
  $("#settings").innerHTML = renderDocumentSettings(
    s,
    transposeHistory.get(s.id),
  );
  if ($("#undo-transpose")) $("#undo-transpose").onclick = undoTranspose;
  $("#showBrand").onchange = (e) => {
    s.showBrand = e.target.checked;
    changed({ preserveTranspose: true });
    renderPages();
  };
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
        changed({ preserveTranspose: true });
        renderPages();
      },
    );
  document.querySelectorAll("[data-columns]").forEach(
    (b) =>
      (b.onclick = () => {
        s.columns = Number(b.dataset.columns);
        changed({ preserveTranspose: true });
        renderSettings();
        renderPages();
      }),
  );
  document.querySelectorAll("[data-notation]").forEach(
    (b) =>
      (b.onclick = () => {
        s.notation = b.dataset.notation;
        changed({ preserveTranspose: true });
        renderSettings();
        renderPages();
        $(`[data-notation="${s.notation}"]`)?.focus();
      }),
  );
  $("#transpose-down").onclick = () => shift(-1);
  $("#transpose-up").onclick = () => shift(1);
  $("#capo-down").onclick = () => setCapo(s.capo - 1);
  $("#capo-up").onclick = () => setCapo(s.capo + 1);
  $("#capo").onchange = (e) => setCapo(Number(e.target.value));
  $("#link").onclick = () => {
    s.linked = !s.linked;
    changed({ preserveTranspose: true });
    renderSettings();
  };
  const compressButton = $("#compress-blank-lines");
  if (compressButton) compressButton.onclick = compressBlanks;
}
function updateNavigation() {
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  $("main").dataset.mobileView = mobileView;
  $("main").dataset.desktopView = desktopView;
  $("main").dataset.editorSection = section;
  document.querySelectorAll(".rail button").forEach((button) => {
    const selected = button.dataset.mobileView
      ? mobile && button.dataset.mobileView === mobileView
      : !mobile && button.dataset.desktopView === desktopView;
    button.classList.toggle("selected", selected);
    if (selected) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelectorAll("[data-harmony-view]").forEach((button) => {
    const view = button.dataset.harmonyView;
    const selected =
      view === "key"
        ? musicSection === "key"
        : musicSection === "chords" && view === chordMode;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
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
  const names = transposeSpelling(s.text, n);
  s.text = transpose(s.text, n, names);
  s.chordShapes = Object.fromEntries(
    Object.entries(s.chordShapes || {}).map(([name, shape]) => {
      let offset = n;
      const played = shape.frets.filter((f) => f >= 0);
      while (played.length && Math.min(...played) + offset < 0) offset += 12;
      while (played.length && Math.max(...played) + offset > 24) offset -= 12;
      return [
        transposeChord(name, n, names),
        { ...shape, frets: shape.frets.map((f) => (f < 0 ? -1 : f + offset)) },
      ];
    }),
  );
  for (const sticker of s.chordStickers || [])
    if (Array.isArray(sticker.chords))
      sticker.chords = sticker.chords.map((c) => transposeChord(c, n, names));
}
function shift(n) {
  const s = song();
  let history = transposeHistory.get(s.id);
  if (!history) {
    history = {
      snapshot: {
        text: s.text,
        chordShapes: structuredClone(s.chordShapes),
        chordStickers: structuredClone(s.chordStickers),
      },
      offset: 0,
    };
  }
  const next = history.offset + n;
  if (next === 0) {
    Object.assign(s, history.snapshot);
    transposeHistory.delete(s.id);
  } else {
    transposeSong(n);
    history.offset = next;
    transposeHistory.set(s.id, history);
  }
  changed({ preserveTranspose: true });
  render();
}
function undoTranspose() {
  const s = song(),
    history = transposeHistory.get(s.id);
  if (!history) return;
  Object.assign(s, history.snapshot);
  transposeHistory.delete(s.id);
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
  $("#pages .sheet-chord[data-chord]")?.setAttribute("tabindex", "0");
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
    : "";
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
  const gutter = window.matchMedia("(max-width: 760px)").matches ? 24 : 64;
  const available = width - gutter,
    scale = Math.max(0.2, Math.min(1.08, available / PAGE.width)) * zoom;
  $("#zoom-out").disabled = zoom <= 0.5;
  $("#zoom-in").disabled = zoom >= 2.5;
  $("#pages").style.minWidth = PAGE.width * scale + gutter + "px";
  document.querySelectorAll(".page-shell").forEach((el) => {
    el.style.width = PAGE.width * scale + "px";
    el.style.height = PAGE.height * scale + "px";
    el.firstChild.style.transform = `scale(${scale})`;
  });
}
const previewScroll = $("#pages-scroll");
let pinch;
function pinchDistance(touches) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );
}
function pinchCenter(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}
previewScroll.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length !== 2) return;
    const center = pinchCenter(event.touches);
    const pages = [...document.querySelectorAll(".page-shell")];
    const page =
      pages.find((el) => {
        const rect = el.getBoundingClientRect();
        return center.y >= rect.top && center.y <= rect.bottom;
      }) || pages[0];
    if (!page) return;
    const rect = page.getBoundingClientRect();
    pinch = {
      page,
      distance: pinchDistance(event.touches),
      zoom,
      x: (center.x - rect.left) / rect.width,
      y: (center.y - rect.top) / rect.height,
    };
  },
  { passive: true },
);
previewScroll.addEventListener(
  "touchmove",
  (event) => {
    if (!pinch || event.touches.length !== 2) return;
    event.preventDefault();
    const next = Math.max(
      0.5,
      Math.min(
        2.5,
        (pinch.zoom * pinchDistance(event.touches)) / pinch.distance,
      ),
    );
    if (!Number.isFinite(next) || next === zoom) return;
    zoom = next;
    resizePages();
    const center = pinchCenter(event.touches);
    const rect = pinch.page.getBoundingClientRect();
    previewScroll.scrollLeft += rect.left + pinch.x * rect.width - center.x;
    previewScroll.scrollTop += rect.top + pinch.y * rect.height - center.y;
  },
  { passive: false },
);
previewScroll.addEventListener("touchend", (event) => {
  if (event.touches.length < 2) pinch = null;
});
previewScroll.addEventListener("touchcancel", () => {
  pinch = null;
});
function resetView() {
  editing = false;
  currentPage = 1;
  $("#pages-scroll").scrollTop = 0;
  $("#source").scrollTop = 0;
  $("#editor-panel").scrollTop = 0;
  $("#line-numbers").scrollTop = 0;
}
/** Unresolved chords already left for later in this review pass. */
const skippedIssues = new Set();
const issueMarkers = () =>
  [...song().text.matchAll(/\[\?([^\[\]\n]{1,40})\]/g)].map((m) => m[1]);
function openIssue(el) {
  const panel = $("#issue-editor");
  const raw = el.textContent;
  const markers = issueMarkers();
  const distinct = [...new Set(markers)];
  const same = markers.filter((marker) => marker === raw).length;
  panel.dataset.line = el.dataset.issueLine;
  panel.dataset.offset = el.dataset.issueOffset;
  panel.dataset.raw = raw;
  $("#issue-value").value = raw;
  $("#issue-progress").textContent =
    distinct.length > 1
      ? t`${distinct.indexOf(raw) + 1} de ${distinct.length}`
      : "";
  $("#issue-all-row").hidden = same < 2;
  $("#issue-all").checked = true;
  $("#issue-all-label").textContent = t(
    "Corregir las {n} veces que aparece",
  ).replace("{n}", same);
  $("#issue-message").textContent = t(
    "Corrige el acorde o déjalo pendiente para más tarde.",
  );
  panel.hidden = false;
  $("#issue-value").focus();
  $("#issue-value").select();
}
/** Continue the review with the next chord that was not left for later. */
function nextIssue() {
  const next = [...document.querySelectorAll(".unresolved-chord")].find(
    (el) => !skippedIssues.has(el.textContent),
  );
  if (next) {
    scrollToOption(next, { block: "center" });
    openIssue(next);
    return;
  }
  $("#issue-editor").hidden = true;
  const pending = issueMarkers().length;
  toast(
    pending
      ? t("Revisión terminada. Quedan acordes pendientes para más tarde.")
      : t("Todos los acordes revisados."),
    pending ? "warning" : "success",
  );
  if (!$("#issue-count").hidden) $("#issue-count").focus();
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
    desktopView = "edit";
    songDesktopViews.set(active, desktopView);
    mobileView = "edit";
    songViews.set(active, mobileView);
    renderSettings();
    $("#source").focus();
    return;
  }
  skippedIssues.clear();
  nextIssue();
};
$("#issue-close").onclick = () => ($("#issue-editor").hidden = true);
$("#issue-skip").onclick = () => {
  skippedIssues.add($("#issue-editor").dataset.raw);
  nextIssue();
};
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
  if ($("#issue-all").checked && !$("#issue-all-row").hidden)
    song().text = song().text.split(marker).join(`[${value}]`);
  else {
    lines[line] =
      lines[line].slice(0, offset) +
      `[${value}]` +
      lines[line].slice(offset + marker.length);
    song().text = lines.join("\n");
  }
  changed();
  renderSource();
  renderPages();
  nextIssue();
};
function render() {
  renderTabs();
  const empty = !song();
  $("#tabs").hidden = empty;
  $("#tabs-wrap").hidden = empty;
  $("#empty-state").hidden = !empty;
  $("main").hidden = empty;
  $("#export").disabled = empty;
  renderRecent();
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
      "warning",
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
document.querySelectorAll("[data-desktop-view]").forEach((button) => {
  button.onclick = () => {
    desktopView = button.dataset.desktopView;
    songDesktopViews.set(active, desktopView);
    mobileView =
      desktopView === "document"
        ? "document"
        : desktopView === "edit"
          ? "edit"
          : "music";
    songViews.set(active, mobileView);
    if (desktopView === "key") musicSection = "key";
    else if (["song", "search", "identify"].includes(desktopView)) {
      musicSection = "chords";
      chordMode = desktopView;
      chordPanel.setMode(chordMode);
    }
    songMusicSections.set(active, musicSection);
    renderSettings();
  };
});
document.querySelectorAll("[data-mobile-view]").forEach((button) => {
  button.onclick = () => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    mobileView = button.dataset.mobileView;
    if (mobileView !== "preview") {
      desktopView =
        mobileView === "music"
          ? musicSection === "key"
            ? "key"
            : chordMode
          : mobileView;
      songDesktopViews.set(active, desktopView);
    }
    songViews.set(active, mobileView);
    renderSettings();
    if (mobileView === "preview") resizePages();
  };
});
document.querySelectorAll("[data-harmony-view]").forEach((button) => {
  button.onclick = () => {
    const view = button.dataset.harmonyView;
    musicSection = view === "key" ? "key" : "chords";
    if (view !== "key") {
      chordMode = view;
      chordPanel.setMode(view);
    }
    songMusicSections.set(active, musicSection);
    desktopView = view;
    songDesktopViews.set(active, desktopView);
    renderSettings();
  };
  button.onkeydown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...document.querySelectorAll("[data-harmony-view]")];
    const index = tabs.indexOf(button);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    tabs[next].click();
    tabs[next].focus();
  };
});
let importGeneration = 0,
  importController;
const audioImport = setupAudioImport({
  accept: (data, options) => acceptImport(data, { ...options, edit: true }),
  reportError: importError,
});
const clipboardImport = setupClipboardImport({
  active: () => $("#new-dialog").open && !$("#new-menu").hidden,
  accept: (text) => acceptImport(importText(text, "")),
  reportError: importError,
});
$("#audio").onclick = () => importScreen("audio");
function importScreen(screen) {
  $("#new-dialog").dataset.screen = screen;
  audioImport.reset();
  importController?.abort();
  importController = new AbortController();
  importGeneration++;
  clipboardImport.reset();
  localWebImport.reset();
  $("#new-menu").hidden = screen !== "menu";
  $("#text-import").hidden = screen !== "text";
  $("#web-import").hidden = screen !== "web";
  $("#audio-import").hidden = screen !== "audio";
  $("#import-back").hidden = screen === "menu";
  $("#new-heading").textContent = {
    menu: t("Una nueva canción."),
    text: t("Abrir documento"),
    web: t("Importar desde una web."),
    audio: t("Importar audio"),
  }[screen];
  $("#new-description").textContent = {
    menu: t("De una idea a tu próxima hoja de acordes."),
    text: t(
      "PDF, Word, TXT o ChordPro. Se convierten en letra y acordes editables.",
    ),
    web: t("Pega el enlace de la canción que quieres tocar."),
    audio: t("De una grabación a un borrador de letra y acordes."),
  }[screen];
  $("#import-privacy").textContent =
    screen === "audio"
      ? t("Tu audio permanece en este equipo.")
      : screen === "web"
        ? t("El servidor descarga únicamente la página del enlace.")
        : t("Los archivos se procesan aquí, en tu navegador.");
  $("#import-error").hidden = true;
  $("#import-error").textContent = "";
  $("#web-submit").disabled = false;
  $("#web-submit").textContent = t("Importar canción");
  $("#choose-file").disabled = false;
  $("#choose-file").textContent = t("Elegir documento");
  $("#file").accept = ".txt,.pdf,.docx,.cho,.chordpro";
  $("#new-dialog").scrollTop = 0;
  if (screen === "web") $("#web-url").focus();
  else if (screen === "audio") {
    audioImport.open();
    $("#audio-drop").focus();
  } else if (screen === "text") $("#choose-file").focus();
  else {
    $("#web").focus();
    if ($("#new-dialog").open) clipboardImport.refresh();
  }
}
function openNewSong() {
  $("#web-url").value = "";
  $("#file").value = "";
  importScreen("menu");
  $("#new-dialog").showModal();
  $("#web").focus();
  clipboardImport.refresh();
}
$("#new").onclick = openNewSong;
$("#mobile-tab-plus").onclick = openNewSong;
$("#empty-new").onclick = openNewSong;
$("#import-back").onclick = () => importScreen("menu");
$("#new-dialog").addEventListener("close", () => {
  audioImport.reset();
  importController?.abort();
  importGeneration++;
  clipboardImport.reset();
});
$("#new-dialog .dialog-close").onclick = () => $("#new-dialog").close();
$("#blank").onclick = () => {
  const s = create();
  songs.push(s);
  active = s.id;
  section = "document";
  mobileView = "document";
  desktopView = "document";
  songDesktopViews.set(active, desktopView);
  musicSection = "key";
  songViews.set(active, mobileView);
  songMusicSections.set(active, musicSection);
  resetView();
  $("#new-dialog").close();
  render();
  persist();
  $("#title")?.focus();
};
async function acceptImport(data, { edit = false, signal } = {}) {
  const generation = importGeneration;
  const importSignal = signal
    ? AbortSignal.any([signal, importController.signal])
    : importController.signal;
  if (data.text.length > MAX_TEXT_LENGTH)
    throw new Error(
      t(
        "El texto es demasiado largo. Importa hasta 50.000 caracteres por canción.",
      ),
    );
  const s = create({ ...data, dirty: true });
  Object.assign(s, await fitSong(s, { signal: importSignal }));
  importSignal.throwIfAborted();
  if (generation !== importGeneration || !$("#new-dialog").open) return;
  songs.push(s);
  active = s.id;
  desktopView = edit ? "edit" : "document";
  songDesktopViews.set(active, desktopView);
  resetView();
  mobileView = edit ? "edit" : "preview";
  songViews.set(active, mobileView);
  songMusicSections.set(active, musicSection);
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
$("#import").onclick = () => {
  importScreen("text");
  $("#file").click();
};
$("#open-project").onclick = () => {
  importScreen("text");
  $("#new-heading").textContent = t("Abrir proyecto editable.");
  $("#new-description").textContent = t(
    "Selecciona el archivo .chordleaf.json de una canción guardada.",
  );
  $("#choose-file").textContent = t("Seleccionar proyecto");
  $("#file").accept = ".chordleaf.json,.json";
  $("#choose-file").focus();
};
$("#choose-file").onclick = () => $("#file").click();
$("#web").onclick = () => importScreen("web");
const localWebImport = setupLocalWebImport({
  onChange() {
    importController?.abort();
    importGeneration++;
    $("#import-error").hidden = true;
    $("#web-submit").disabled = false;
    $("#web-submit").textContent = t("Importar canción");
  },
  async onImport(read) {
    importController?.abort();
    importController = new AbortController();
    const signal = importController.signal;
    const generation = ++importGeneration;
    $("#import-error").hidden = true;
    $("#web-submit").disabled = false;
    $("#web-submit").textContent = t("Importar canción");
    try {
      const data = await read(signal);
      signal.throwIfAborted();
      if (generation !== importGeneration || !$("#new-dialog").open) return;
      await acceptImport(data);
    } catch (error) {
      if (generation === importGeneration && $("#new-dialog").open)
        importError(error);
    }
  },
});
$("#web-import").onsubmit = async (e) => {
  e.preventDefault();
  importController?.abort();
  importController = new AbortController();
  const generation = ++importGeneration;
  localWebImport.reset();
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
    if (generation === importGeneration && $("#new-dialog").open) {
      if (error.code === "SOURCE_FORBIDDEN") {
        importError(
          new Error(
            t(
              "La web bloquea la descarga (403). Próximamente podrás importarla con la extensión de navegador de Chordleaf.",
            ),
          ),
        );
        localWebImport.show();
      } else importError(error);
    }
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
  $("#choose-file").textContent = t("Importando…");
  try {
    if (file.name.toLowerCase().endsWith(".json")) {
      if (file.size > 10 * 1024 * 1024)
        throw new Error(t("La copia supera el límite de 10 MiB."));
      const content = await file.text();
      let format;
      try {
        format = JSON.parse(content)?.format;
      } catch {
        throw new Error(t("El archivo JSON está dañado o no es compatible."));
      }
      if (generation !== importGeneration || !$("#new-dialog").open) return;
      if (format === "chordleaf-song") {
        const opened = restoreProject(content);
        songs.push(opened);
        active = opened.id;
        desktopView = "document";
        songDesktopViews.set(active, desktopView);
        resetView();
        $("#new-dialog").close();
        render();
        persist();
        toast(t("Proyecto editable abierto."));
        return;
      }
      const restored = restoreWorkspace(content);
      songs.push(...restored.songs);
      active = restored.active;
      desktopView = "document";
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
      $("#choose-file").textContent = t("Elegir documento");
      e.target.value = "";
    }
  }
};
$("#workspace-backup").onclick = () => {
  download(
    new Blob([serializeWorkspace(songs, active)], { type: "application/json" }),
    "chordleaf-workspace.json",
  );
  exportMenu.close({ focus: true });
};
$("#print-document").onclick = () => {
  exportMenu.close({ focus: true });
  // The print stylesheet paints only the A4 pages, whatever view is open.
  window.print();
};
function saveProject(target = song()) {
  if (!target) return false;
  try {
    const signature = projectSignature(target);
    const name = downloadName(target.title, t("Canción"));
    download(
      new Blob([serializeProject(target)], { type: "application/json" }),
      `${name}.chordleaf.json`,
    );
    target.projectSignature = signature;
    target.dirty = false;
    renderTabs();
    persist();
    toast(
      t("Proyecto editable descargado. Conserva el archivo para reabrirlo."),
    );
    return true;
  } catch (error) {
    toast(
      t(
        "No se pudo guardar el proyecto. Copia la letra del editor o descarga TXT. ",
      ) + error.message,
      "error",
    );
    return false;
  }
}
$("#save-project").onclick = () => {
  exportMenu.close({ focus: true });
  saveProject();
};
document.querySelectorAll("[data-export]").forEach(
  (b) =>
    (b.onclick = async () => {
      exportMenu.close({ focus: true });
      const s = song();
      try {
        toast(t("Preparando tu documento…"));
        await exportSong(structuredClone(s), b.dataset.export);
        toast(t("Documento descargado."));
      } catch (e) {
        toast(
          t("No se pudo exportar. Copia la letra del editor o descarga TXT. ") +
            e.message,
          "error",
        );
      }
    }),
);
document.addEventListener("click", (e) => {
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
    mobileView = "edit";
    section = "document";
    desktopView = "edit";
    songViews.set(active, mobileView);
    songDesktopViews.set(active, desktopView);
    renderSettings();
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
    toast(error.message, "error");
  } finally {
    $("#fit").disabled = false;
  }
};
$("#recent-list").addEventListener("click", recentClick);
$("#dialog-recent-list").addEventListener("click", recentClick);
$("#example-song").onclick = openExample;
renderEntrySheet();
const tooltip = $("#chord-tooltip");
function showChordTooltip(target) {
  const title = target.classList.contains("sheet-chord")
    ? target.textContent
    : target.dataset.chord;
  tooltip.innerHTML = `<strong>${esc(title)}</strong>${diagram(target.dataset.chord, 0, (song().chordShapes?.[target.dataset.chord] || song().chordShapes?.[target.dataset.chord.replace(/\*$/, "")])?.frets)}`;
  tooltip.hidden = false;
  const r = target.getBoundingClientRect();
  tooltip.style.left =
    Math.max(8, Math.min(innerWidth - 180, r.left + r.width / 2 - 80)) + "px";
  tooltip.style.top =
    Math.max(8, Math.min(innerHeight - 230, r.bottom + 9)) + "px";
}
function hideChordTooltip() {
  tooltip.hidden = true;
}
// The same diagram tooltip answers to pointer hover and to keyboard focus, so
// chord positions are reachable without a mouse.
document.addEventListener("pointerover", (event) => {
  const target = event.target.closest("[data-chord]");
  if (target) showChordTooltip(target);
});
document.addEventListener("pointerout", (event) => {
  if (event.target.closest("[data-chord]")) hideChordTooltip();
});
document.addEventListener("focusin", (event) => {
  const target = event.target.closest("[data-chord]");
  if (target) showChordTooltip(target);
});
document.addEventListener("focusout", (event) => {
  if (event.target.closest("[data-chord]")) hideChordTooltip();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideChordTooltip();
});
// Sheet chords form one Tab stop; arrows, Home and End move between them.
$("#pages").addEventListener("keydown", (event) => {
  const current = event.target.closest(".sheet-chord[data-chord]");
  const step = {
    ArrowRight: 1,
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowUp: -1,
    Home: -Infinity,
    End: Infinity,
  }[event.key];
  if (!current || !step) return;
  const all = [...$("#pages").querySelectorAll(".sheet-chord[data-chord]")];
  const index = all.indexOf(current);
  const next =
    all[
      step === -Infinity
        ? 0
        : step === Infinity
          ? all.length - 1
          : Math.max(0, Math.min(all.length - 1, index + step))
    ];
  event.preventDefault();
  current.setAttribute("tabindex", "-1");
  next.setAttribute("tabindex", "0");
  next.focus();
});
const languagePicker = setupLanguagePicker({ persist, toast });
// iOS keeps the layout viewport under the on-screen keyboard: mirror the
// visual viewport height so the editor column stays usable.
function syncVisualViewport() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty(
    "--visual-viewport-height",
    `${Math.round(height)}px`,
  );
}
window.visualViewport?.addEventListener("resize", syncVisualViewport);
window.visualViewport?.addEventListener("scroll", syncVisualViewport);
syncVisualViewport();
window.addEventListener("resize", () => {
  if (editing && window.matchMedia("(max-width: 760px)").matches) {
    editing = false;
    renderPages();
  }
  renderSettings();
  resizePages();
});
window.addEventListener("beforeunload", (e) => {
  // Songs live in this browser; only warn when that copy could not be written.
  if (!persist() && !languagePicker.switching && workspaceSession.held) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
  e.preventDefault();
  if (!song()) return;
  if (e.shiftKey) return saveProject();
  clearTimeout(saveTimer);
  if (persist())
    toast(
      t(
        "Guardado en este navegador. Para llevarlo a otro sitio: Exportar → Descargar proyecto editable.",
      ),
    );
});
setupEditorTools({ resizePages });
const chordPanel = setupChordsPanel({
  song,
  changed,
  refresh: render,
  esc,
  notify: toast,
  onModeChange(mode) {
    chordMode = mode;
    updateNavigation();
  },
});
const dictionary = setupDictionary({
  song,
  changed,
  renderPages,
  esc,
  notify: toast,
});
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
registerServiceWorker();

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
