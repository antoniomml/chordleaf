import { t } from "../i18n.js";

export function renderOfflineStatus(state) {
  const text = {
    preparing: t("Preparando uso sin conexión…"),
    ready: t("Sin conexión: listo"),
    update: t(
      "Cierra las pestañas de Chordleaf para completar la actualización sin conexión.",
    ),
    unavailable: t(
      "Sin conexión no disponible. Vuelve a abrir Chordleaf con conexión para reintentar.",
    ),
  }[state];
  for (const element of document.querySelectorAll("[data-offline-state]")) {
    element.textContent = text;
    element.hidden = !text;
    element.dataset.offlineState = state;
  }
}
