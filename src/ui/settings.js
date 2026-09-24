import { t } from "../i18n.js";
import { keyInfo, transpose } from "../music.js";
import { escapeHtml as esc } from "./html.js";

export function renderKeySettings(s, key) {
  return t`<h2 class="panel-title"><span>Tu brújula musical</span><span>♯</span></h2><p class="section-caption">TONALIDAD PROBABLE</p><div class="key-name">${key ? key.name : t("Aún sin acordes")}<span>${key ? t("Estimación · según los acordes escritos") : t("Añade acordes para analizar la canción")}</span></div>${key ? t`<div class="degrees">${key.scale.map((c, i) => `<button class="chord degree" data-chord="${c}"><small>${key.degrees[i]}</small>${c}</button>`).join("")}</div><p class="key-note">Con cejilla ${s.capo}, suena en <strong>${keyInfo(transpose(s.text, s.capo))?.name}</strong>.</p>` : ""}<div class="info-box">Esta guía es solo para ti. La tonalidad y sus grados no aparecen en la hoja ni en las exportaciones.</div>`;
}

export function renderDocumentSettings(s, key) {
  return t`<h2 class="panel-title"><span>El documento</span><span class="muted">01</span></h2>
    <label class="field">TÍTULO<input id="title" value="${esc(s.title)}" maxlength="90" placeholder="Nombre de la canción"></label>
    <label class="field">ARTISTA<input id="artist" value="${esc(s.artist)}" maxlength="100" placeholder="Nombre del artista"></label>
    <div id="document-options-content">
      <div class="settings-row"><label class="field">TAMAÑO <div class="number-unit"><input id="fontSize" type="number" min="7" max="20" step="0.5" value="${s.fontSize}"><span>pt</span></div></label><label class="field">MÁRGENES <div class="number-unit"><input id="margin" type="number" min="5" max="35" step="1" value="${s.margin}"><span>mm</span></div></label><div class="field">COLUMNAS<div class="segmented" role="group" aria-label="Columnas"><button data-columns="1" class="${s.columns === 1 ? "selected" : ""}" aria-label="Una columna" aria-pressed="${s.columns === 1}">1</button><button data-columns="2" class="${s.columns === 2 ? "selected" : ""}" aria-label="Dos columnas" aria-pressed="${s.columns === 2}">2</button></div></div></div>
      <div class="music-controls"><div><label>TRANSPORTAR</label><div class="stepper"><button id="transpose-down" aria-label="Bajar un semitono">−</button><span>${key ? key.name.replace(t(" mayor"), "").replace(t(" menor"), "m") : "—"}</span><button id="transpose-up" aria-label="Subir un semitono">＋</button></div></div><button id="link" class="chain ${s.linked ? "linked" : ""}" aria-label="Vincular cejilla y acordes" aria-pressed="${s.linked}" title="${s.linked ? t("Mantener la tonalidad que suena") : t("La cejilla solo cambia la indicación")}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m10 14 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 -1)"/></svg></button><div><label>CEJILLA</label><div class="stepper"><button id="capo-down" aria-label="Bajar cejilla">−</button><input id="capo" type="number" min="0" max="12" value="${s.capo}" aria-label="Cejilla"><button id="capo-up" aria-label="Subir cejilla">＋</button></div></div></div>
      <p class="link-help">${s.linked ? t("Enlazados · cambiar la cejilla conserva la tonalidad que suena.") : t("Independientes · la cejilla solo cambia la indicación.")}</p>
    </div>`;
}
