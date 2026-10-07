import { t, getLocale } from "../i18n.js";
import { escapeHtml as esc } from "./html.js";
import { forget } from "../recent-projects.js";

/** Recent lists and explicit deletion, with a durable-save rollback. */
export function setupRecentProjects({
  recent,
  setRecent,
  hasSong,
  persist,
  open,
}) {
  const $ = (selector) => document.querySelector(selector);
  const expanded = new Set();
  const dialog = $("#delete-recent-dialog");
  const relativeTime = new Intl.RelativeTimeFormat(getLocale(), {
    numeric: "auto",
  });
  let pending;

  function closedAgo(time) {
    const minutes = Math.round((time - Date.now()) / 60000);
    if (Math.abs(minutes) < 60) return relativeTime.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return relativeTime.format(hours, "hour");
    const days = Math.round(hours / 24);
    return Math.abs(days) < 30
      ? relativeTime.format(days, "day")
      : new Date(time).toLocaleDateString(getLocale());
  }
  function markup(entries) {
    return entries
      .map(({ song, closedAt }) => {
        const title = esc(song.title || t("Canción sin título"));
        const label = `${t("Eliminar canción guardada")}: ${title}`;
        return `<li><button class="recent-open" data-recent="${song.id}"><span class="recent-title">${title}</span><small>${esc([closedAgo(closedAt), song.artist].filter(Boolean).join(" · "))}</small></button><button class="recent-remove" data-recent-remove="${song.id}" aria-label="${label}" title="${label}">×</button></li>`;
      })
      .join("");
  }
  function render() {
    const entries = recent();
    for (const [section, list, limit, button] of [
      ["#recent-projects", "#recent-list", 6, "#recent-all"],
      ["#dialog-recent", "#dialog-recent-list", 4, "#dialog-recent-all"],
    ]) {
      $(section).hidden = !entries.length;
      $(list).innerHTML = markup(
        expanded.has(list) ? entries : entries.slice(0, limit),
      );
      $(button).hidden = entries.length <= limit;
      $(button).textContent = expanded.has(list)
        ? t("Mostrar menos")
        : t("Ver todas");
      $(button).setAttribute("aria-expanded", String(expanded.has(list)));
      $(button).onclick = () => {
        if (expanded.has(list)) expanded.delete(list);
        else expanded.add(list);
        render();
      };
    }
    $("#export").disabled = !hasSong() && !entries.length;
  }
  function requestRemoval(button) {
    const id = button.dataset.recentRemove;
    const entry = recent().find((item) => item.song.id === id);
    if (!entry) return;
    pending = { id, button, list: button.closest("ul").id };
    $("#delete-recent-name").textContent =
      entry.song.title || t("Canción sin título");
    $("#delete-recent-error").textContent = "";
    dialog.showModal();
    $("#delete-recent-cancel").focus();
  }
  function cancel() {
    dialog.close();
    pending?.button.focus();
    pending = undefined;
  }
  $("#delete-recent-cancel").onclick = cancel;
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    cancel();
  });
  $("#delete-recent-confirm").onclick = () => {
    if (!pending) return;
    const previous = recent();
    const index = previous.findIndex((item) => item.song.id === pending.id);
    setRecent(forget(previous, pending.id));
    if (!persist()) {
      setRecent(previous);
      $("#delete-recent-error").textContent = t(
        "No se pudo eliminar la canción. La copia guardada se conserva.",
      );
      return;
    }
    const list = pending.list;
    pending = undefined;
    dialog.close();
    render();
    const buttons = $(`#${list}`).querySelectorAll(".recent-open");
    const fallback = $("#new-dialog").open ? $("#blank") : $("#empty-new");
    (
      buttons[Math.max(0, Math.min(index, buttons.length - 1))] ?? fallback
    )?.focus();
  };
  for (const list of ["#recent-list", "#dialog-recent-list"])
    $(list).addEventListener("click", (event) => {
      const remove = event.target.closest("[data-recent-remove]");
      if (remove) return requestRemoval(remove);
      const button = event.target.closest("[data-recent]");
      if (button) open(button.dataset.recent);
    });
  return { render };
}
