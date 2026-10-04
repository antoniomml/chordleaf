import { isMobileLayout } from "./mobile-layout.js";
import { alignmentLine, replaceAlignedLyrics } from "./chord-alignment.js";
import { setupSongExport } from "./ui/song-export.js";
import { setupSongImport } from "./ui/song-import.js";
import { escapeHtml as esc } from "./ui/html.js";
import { setupLanguagePicker } from "./ui/language.js";
import { renderDocumentSettings, renderKeySettings } from "./ui/settings.js";
import { renderPageMarkup } from "./ui/pages.js";
import { introHtml } from "./ui/intro-copy.js";
import { entrySheetMarkup } from "./ui/entry.js";
import { fitSong } from "./fit-song.js";
import { openWorkspaceSession } from "./workspace-session.js";
import shell from "./ui/shell.html?raw";
import { t, getLocale } from "./i18n.js";
import { createSong as create, assertTextLength } from "./song-state.js";
import { createInlineEdits } from "./ui/inline-edits.js";
import { setupChordsPanel } from "./chords-panel.js";
import { setupDictionary } from "./dictionary-ui.js";
import { setupEditorTools } from "./editor-tools.js";
import { setupChordAlignment } from "./ui/chord-alignment.js";
import { icon } from "./ui/icons.js";
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
import { download } from "./files.js";
import { projectSignature } from "./project.js";
import { registerServiceWorker } from "./pwa.js";
import { resolveFeatureFlags } from "./feature-flags.js";
import { setupMenu } from "./ui/menu.js";
import { blankLineCount, compressBlankLines } from "./text-tools.js";
import {
  RECENT_KEY,
  readRecent,
  rememberClosed,
  forget,
  worthKeeping,
} from "./recent-projects.js";
import { exampleSong } from "./example-song.js";
const $ = (s) => document.querySelector(s);
document.documentElement.lang = getLocale();
const workspaceSession = await openWorkspaceSession($("#app"));
workspaceSession.beforeHandOff = () => persist();
let recent = [];
let legacyRecent = false;
try {
  const raw = localStorage.getItem(RECENT_KEY);
  recent = readRecent(raw);
  legacyRecent = Array.isArray(JSON.parse(raw));
} catch {
  /* Storage can be unavailable in private or restricted contexts. */
}
let songs, active, recoveryRaw, storedRaw;
try {
  storedRaw =
    localStorage.getItem("chordleaf-v1") ?? localStorage.getItem("chordi-v1");
  const stored = JSON.parse(storedRaw);
  if (Array.isArray(stored?.recent))
    recent = readRecent(JSON.stringify(stored.recent));
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
let zoom = 1,
  fitWidth = false;
let section = "document",
  mobileView = "document",
  desktopView = "document",
  musicSection = "key",
  editing = false,
  alignmentZoom,
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
const inlineEdits = createInlineEdits({
  changed,
  finished() {
    renderSource();
    renderSettings();
    renderPages();
  },
  invalid(message) {
    setSaveState(message, { error: true, announce: true });
    toast(message, "warning");
  },
});
function updateText(text) {
  try {
    assertTextLength(text);
    song().text = text;
    return true;
  } catch (error) {
    toast(error.message, "warning");
    return false;
  }
}
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
  if (!inlineEdits.capture()) return false;
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
    localStorage.setItem(
      "chordleaf-v1",
      JSON.stringify({ songs, active, recent }),
    );
    if (legacyRecent) {
      try {
        // Remove the old copy only after the complete workspace is durable.
        localStorage.removeItem(RECENT_KEY);
        legacyRecent = false;
      } catch {
        /* The canonical copy succeeded; retry legacy cleanup on another save. */
      }
    }
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
  if (
    persistenceRequested ||
    (!songs.some(worthKeeping) &&
      !recent.some((entry) => worthKeeping(entry.song)))
  )
    return;
  persistenceRequested = true;
  navigator.storage?.persist?.().catch(() => {});
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
    variant === "error" ? 9000 : variant === "warning" ? 6500 : 4000,
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
        if (!inlineEdits.finish()) return;
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
  if (!inlineEdits.finish()) return;
  const target = songs.find((s) => s.id === id);
  if (!target) return;
  const kept = worthKeeping(target);
  const previousRecent = recent;
  if (kept) {
    recent = rememberClosed(recent, structuredClone(target));
  }
  if (!removeSong(id)) {
    recent = previousRecent;
    return;
  }
  if (kept) toast(t("Canción cerrada. Puedes reabrirla desde Recientes."));
}
function reopenRecent(id) {
  if (!inlineEdits.finish()) return;
  const entry = recent.find((item) => item.song.id === id);
  if (!entry) return;
  const opened = create(entry.song);
  if (songs.some((s) => s.id === opened.id)) opened.id = crypto.randomUUID();
  const previous = { songs, recent, active };
  songs = [...songs, opened];
  recent = forget(recent, id);
  active = opened.id;
  if (!persist()) {
    ({ songs, recent, active } = previous);
    return;
  }
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
  const previous = recent;
  recent = forget(recent, id);
  if (!persist()) {
    recent = previous;
    return;
  }
  renderRecent();
  // Keep keyboard focus inside the list after a removal.
  const buttons = document.querySelectorAll(
    `${$("#new-dialog").open ? "#dialog-recent-list" : "#recent-list"} .recent-open`,
  );
  const fallback = $("#new-dialog").open ? $("#blank") : $("#empty-new");
  (buttons[Math.min(index, buttons.length - 1)] ?? fallback)?.focus();
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
const expandedRecent = new Set();
function renderRecent() {
  for (const [section, list, limit, button] of [
    ["#recent-projects", "#recent-list", 6, "#recent-all"],
    ["#dialog-recent", "#dialog-recent-list", 4, "#dialog-recent-all"],
  ]) {
    $(section).hidden = !recent.length;
    const expanded = expandedRecent.has(list);
    $(list).innerHTML = recentMarkup(
      expanded ? recent : recent.slice(0, limit),
    );
    $(button).hidden = recent.length <= limit;
    $(button).textContent = expanded ? t("Mostrar menos") : t("Ver todas");
    $(button).setAttribute("aria-expanded", String(expanded));
    $(button).onclick = () => {
      if (expanded) expandedRecent.delete(list);
      else expandedRecent.add(list);
      renderRecent();
    };
  }
  $("#export").disabled = !song() && !recent.length;
}
function recentClick(event) {
  const remove = event.target.closest("[data-recent-remove]");
  if (remove) return removeRecent(remove.dataset.recentRemove);
  const open = event.target.closest("[data-recent]");
  if (open) reopenRecent(open.dataset.recent);
}
function renderEntrySheet() {
  $("#entry-sheet").innerHTML = entrySheetMarkup(getLocale());
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
  const previous = { songs, active };
  songs = songs.filter((s) => s.id !== id);
  if (active === id) active = songs[0]?.id ?? null;
  if (!persist()) {
    ({ songs, active } = previous);
    return false;
  }
  songViews.delete(id);
  songDesktopViews.delete(id);
  songMusicSections.delete(id);
  if (previous.active === id) {
    mobileView = songViews.get(active) ?? "document";
    desktopView = songDesktopViews.get(active) ?? "document";
    musicSection = songMusicSections.get(active) ?? "key";
  }
  render();
  return true;
}
function sectionForDesktop(view) {
  if (view === "key") return "key";
  return ["song", "search", "identify"].includes(view) ? "chords" : "document";
}
function syncSection() {
  const mobile = isMobileLayout();
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
  const focused = $("#settings")?.contains(document.activeElement)
    ? document.activeElement
    : null;
  const focusSelector = focused?.id
    ? `#${focused.id}`
    : focused?.dataset.columns
      ? `[data-columns="${focused.dataset.columns}"]`
      : focused?.dataset.notation
        ? `[data-notation="${focused.dataset.notation}"]`
        : focused?.matches("summary")
          ? ".more-document-options summary"
          : null;
  const optionsOpen = $(".more-document-options")?.open;
  renderSettingsContent();
  if (optionsOpen && $(".more-document-options"))
    $(".more-document-options").open = true;
  if (focusSelector) $(focusSelector)?.focus({ preventScroll: true });
}
function renderSettingsContent() {
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
  const mobile = isMobileLayout();
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
  const pencilLabel = t("Editar directamente la hoja");
  pencil.title = pencilLabel;
  pencil.setAttribute("aria-label", pencilLabel);
  pencil.setAttribute("aria-pressed", String(editing));
}
function transposeSong(n) {
  const s = song();
  const names = transposeSpelling(s.text, n);
  if (!updateText(transpose(s.text, n, names))) return false;
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
  return true;
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
    if (!transposeSong(n)) return;
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
  if (s.linked && !transposeSong(s.capo - next)) return;
  s.capo = next;
  changed();
  render();
}
function renderSource() {
  $("#source").value = song().text;
  sourceMeta();
}
function sourceMeta({ harmonyChanged = true } = {}) {
  $("#align-chords").disabled =
    !chords(song().text).length && !/\[\?[^\[\]\n]{1,40}\]/.test(song().text);
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
  if (!inlineEdits.finish({ render: false })) return;
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
  $("#pencil").setAttribute("aria-pressed", String(editing));
  $("#editing-hint").textContent = editing ? t("Edición del documento") : "";
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
        (el.onfocus = () => {
          const name = el.dataset.header;
          const original = s[name],
            display = el.innerText;
          inlineEdits.start(el, {
            get: () => s[name],
            set: (value) => (s[name] = value),
            readInput: () => el.innerText,
            writeInput: (value) => (el.innerText = value),
            read: () =>
              el.innerText === display
                ? original
                : el.innerText.replace(/\n/g, " ").trim(),
            validate(value) {
              if (value.length > (name === "title" ? 90 : 100))
                throw new Error(t("El título o artista es demasiado largo."));
            },
            rejectInvalid: true,
          });
        }),
    );
    document.querySelectorAll(".song-line").forEach((el) => {
      el.onclick = (event) => {
        if (alignment.handles(event)) return;
        if (!event.target.closest(".unresolved-chord")) editLine(el);
      };
      el.onkeydown = (e) => {
        if (e.target.closest(".sheet-chord, .inline-editor")) return;
        if (
          ["Enter", " "].includes(e.key) &&
          !e.target.closest(".unresolved-chord")
        ) {
          e.preventDefault();
          editLine(el);
        }
      };
    });
  }
  dictionary.render();
  resizePages();
  alignment.refresh(l);
}
function schedulePreview() {
  if (song().text.length <= 10000) return renderPages();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPages, 120);
}
function editLine(el) {
  if (el.querySelector("textarea")) return;
  alignment.clear();
  const endIndex = Number(el.dataset.end),
    target = song(),
    lines = target.text.split("\n");
  // A separate chord-only source row stays untouched above its lyric row.
  let edited = lines[endIndex];
  el.innerHTML = t`<textarea class="inline-editor" aria-label="Editar letra del verso">${esc(alignmentLine(edited).lyric)}</textarea>`;
  const input = el.firstChild;
  input.focus();
  inlineEdits.start(input, {
    get: () => target.text,
    set: (value) => (target.text = value),
    read() {
      const next = replaceAlignedLyrics(edited, input.value);
      const candidate = [...lines];
      candidate.splice(endIndex, 1, ...next.split("\n"));
      const text = candidate.join("\n");
      assertTextLength(text);
      edited = next;
      return text;
    },
    rejectInvalid: true,
  });
  input.onclick = (e) => e.stopPropagation();
}
function editChord(el) {
  if (el.querySelector("input")) return;
  alignment.clear();
  const index = Number(el.closest(".song-line").dataset.line),
    target = song(),
    lines = target.text.split("\n"),
    mark = alignmentLine(lines[index]).marks.find(
      (mark) => mark.start === Number(el.dataset.alignStart),
    );
  if (!mark) return;
  el.removeAttribute("role");
  el.innerHTML = t`<input class="inline-chord-editor" aria-label="Editar acorde" autocomplete="off" spellcheck="false" value="${esc(mark.chord)}" />`;
  const input = el.firstChild;
  input.size = Math.max(3, mark.chord.length + 1);
  input.focus();
  input.select();
  inlineEdits.start(input, {
    get: () => target.text,
    set: (value) => (target.text = value),
    read() {
      const value = input.value.trim();
      if (!chordRE.test(value))
        throw new Error(t("Introduce un acorde válido, por ejemplo C o Em7."));
      const candidate = [...lines];
      candidate[index] =
        lines[index].slice(0, mark.start) +
        `[${value}]` +
        lines[index].slice(mark.end);
      const text = candidate.join("\n");
      assertTextLength(text);
      return text;
    },
  });
  input.onclick = (event) => event.stopPropagation();
}
function resizePages() {
  const width = $("#pages-scroll").clientWidth;
  if (!width) return;
  const gutter = isMobileLayout() ? 24 : 64;
  const available = width - gutter,
    scale =
      Math.max(
        0.2,
        fitWidth
          ? available / PAGE.width
          : Math.min(4 / 3, available / PAGE.width),
      ) * zoom;
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
// Follow the preview's actual width, including panel resizing and view changes.
new ResizeObserver(() => requestAnimationFrame(resizePages)).observe(
  previewScroll,
);
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
  zoom = 1;
  fitWidth = false;
  alignmentZoom = undefined;
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
  if ($("#issue-all").checked && !$("#issue-all-row").hidden) {
    if (!updateText(song().text.split(marker).join(`[${value}]`))) return;
  } else {
    lines[line] =
      lines[line].slice(0, offset) +
      `[${value}]` +
      lines[line].slice(offset + marker.length);
    if (!updateText(lines.join("\n"))) return;
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
  $("#export").disabled = empty && !recent.length;
  for (const element of document.querySelectorAll(
    "[data-export], #save-project, #print-document",
  ))
    element.disabled = empty;
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
  const previousText = song().text;
  if (!updateText(e.target.value)) {
    e.target.value = song().text;
    return;
  }
  const harmonyChanged =
    JSON.stringify(chords(previousText)) !==
    JSON.stringify(chords(e.target.value));
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
const imports = setupSongImport({
  features: resolveFeatureFlags(import.meta.env),
  toast,
  onBlank() {
    const s = create();
    acceptSongs([s], s.id);
    $("#title")?.focus();
  },
  onSongs: acceptSongs,
});
function openNewSong() {
  imports.open();
}
/** Commit prepared songs in one place, including their initial navigation. */
function acceptSongs(
  opened,
  selected,
  { edit = false, imported = false, recent: restoredRecent = [] } = {},
) {
  if (!inlineEdits.finish()) return;
  songs.push(...opened);
  recent = [...restoredRecent, ...recent];
  active = selected ?? active;
  desktopView = edit ? "edit" : "document";
  mobileView = edit ? "edit" : imported ? "preview" : "document";
  musicSection = "key";
  section = "document";
  songDesktopViews.set(active, desktopView);
  songViews.set(active, mobileView);
  songMusicSections.set(active, musicSection);
  resetView();
  $("#new-dialog").close();
  render();
  persist();
}
const { saveProject } = setupSongExport({
  song,
  workspace: () => ({ songs, active, recent }),
  prepare: () => inlineEdits.finish(),
  exportMenu,
  renderTabs,
  persist,
  toast,
});
document.addEventListener("click", (e) => {
  const chord = e.target.closest("button[data-chord]");
  if (chord) {
    const input = $("#source"),
      start = input.selectionStart,
      end = input.selectionEnd,
      value = `[${chord.dataset.chord}]`;
    if (
      !updateText(song().text.slice(0, start) + value + song().text.slice(end))
    )
      return;
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
function setSheetEditing(next) {
  const mobile = isMobileLayout();
  if (next && !editing && mobile) {
    const scale = Math.max(
      0.2,
      Math.min(1.08, (previewScroll.clientWidth - 24) / PAGE.width),
    );
    alignmentZoom = zoom;
    zoom = Math.min(2.5, Math.max(zoom, 16 / (song().fontSize * scale)));
  } else if (!next && alignmentZoom !== undefined) {
    zoom = alignmentZoom;
    alignmentZoom = undefined;
  }
  editing = next;
  renderPages();
  if (next && mobile) {
    const first = $("#pages .song-line");
    if (first) {
      const rect = first.getBoundingClientRect(),
        viewport = previewScroll.getBoundingClientRect();
      previewScroll.scrollTop += rect.top - viewport.top - 24;
      previewScroll.scrollLeft += rect.left - viewport.left - 20;
    }
  }
}
$("#pencil").onclick = () => setSheetEditing(!editing);
$("#align-chords").onclick = () => {
  if ($("#editor-dialog").open) $("#editor-dialog").close();
  mobileView = "preview";
  songViews.set(active, mobileView);
  renderSettings();
  setSheetEditing(true);
  $("#pages-scroll").focus();
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
  if (target && !(editing && target.closest("#pages")))
    showChordTooltip(target);
});
document.addEventListener("pointerout", (event) => {
  if (event.target.closest("[data-chord]")) hideChordTooltip();
});
document.addEventListener("focusin", (event) => {
  const target = event.target.closest("[data-chord]");
  if (target && !(editing && target.closest("#pages")))
    showChordTooltip(target);
});
document.addEventListener("focusout", (event) => {
  if (event.target.closest("[data-chord]")) hideChordTooltip();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideChordTooltip();
});
// Sheet chords form one Tab stop; arrows, Home and End move between them.
$("#pages").addEventListener("keydown", (event) => {
  if (event.target.closest(".inline-chord-editor")) return;
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
function syncVisualViewport(event) {
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const input = document.activeElement;
  const editing = input?.matches("input, textarea, [contenteditable=true]");
  const keyboardOpen = Boolean(
    editing &&
    (viewport?.scale ?? 1) === 1 &&
    height < window.innerHeight - 100,
  );
  document.documentElement.toggleAttribute("data-keyboard-open", keyboardOpen);
  // Safari can report a negative height with a landscape software keyboard.
  // Keep the last valid layout instead of collapsing the editor and dialogs.
  if (!Number.isFinite(height) || height <= 0) return;
  document.documentElement.style.setProperty(
    "--visual-viewport-height",
    `${Math.round(height)}px`,
  );
  // Safari may pan the visual viewport to a caret even with a fixed body.
  // Follow that offset without scrolling the window back against its focus pan.
  const offset = viewport?.scale === 1 ? viewport.offsetTop : 0;
  const top = Number.isFinite(offset) ? Math.max(0, offset) : 0;
  document.documentElement.style.setProperty(
    "--visual-viewport-top",
    `${top}px`,
  );
  // Shrinking a focused textarea does not make Safari scroll its end caret.
  // Only adjust on resize: scrolling the caret can itself emit viewport scroll
  // events, and fighting Safari's focus pan can starve its page rendering.
  if (event?.type === "scroll") return;
  requestAnimationFrame(() => {
    if (
      document.activeElement === input &&
      input instanceof HTMLTextAreaElement &&
      input.selectionStart === input.selectionEnd &&
      input.selectionEnd === input.value.length
    ) {
      const bottom = input.scrollHeight - input.clientHeight;
      if (input.scrollTop < bottom - 1) input.scrollTop = bottom;
    }
  });
}
window.visualViewport?.addEventListener("resize", syncVisualViewport);
window.visualViewport?.addEventListener("scroll", syncVisualViewport);
syncVisualViewport();
window.addEventListener("resize", () => {
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
const alignment = setupChordAlignment({
  song,
  enabled: () => editing,
  editChord,
  editVerse(el) {
    editLine(el);
  },
  finish() {
    setSheetEditing(false);
  },
  update(text) {
    if (!updateText(text)) return false;
    changed();
    renderSource();
    renderPages();
    return true;
  },
});
for (const [id, name] of [
  ["pencil", "edit"],
  ["zoom-out", "minus"],
  ["zoom-in", "plus"],
  ["zoom-reset", "fit"],
])
  $("#" + id).innerHTML = icon(name);
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
    if (!delta) fitWidth = true;
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
