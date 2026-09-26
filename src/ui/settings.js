import { t } from "../i18n.js";
import { keyInfo, transpose } from "../music.js";
import { escapeHtml as esc } from "./html.js";
import { blankLineCount } from "../text-tools.js";

export function renderKeySettings(s, key) {
  return t`<h2 class="panel-title"><span>Tonalidad probable</span><span>♯</span></h2><div class="key-name">${key ? key.name : t("Aún sin acordes")}<span>${key ? t("Estimación · según los acordes escritos") : t("Añade acordes para analizar la canción")}</span></div>${key ? t`<div class="degrees">${key.scale.map((c, i) => `<button class="chord degree" data-chord="${c}"><small>${key.degrees[i]}</small>${c}</button>`).join("")}</div><p class="key-note">Con cejilla ${s.capo}, suena en <strong>${keyInfo(transpose(s.text, s.capo))?.name}</strong>.</p>` : ""}`;
}

export function renderDocumentSettings(s, transposeInfo = null) {
  const hasBlanks = blankLineCount(s.text) > 0;
  return t`<h2 class="panel-title"><span>El documento</span><span class="muted">01</span></h2>
    <div class="settings-meta-row"><label class="field">TÍTULO<input id="title" value="${esc(s.title)}" maxlength="90" placeholder="Nombre de la canción"></label>
    <label class="field">ARTISTA<input id="artist" value="${esc(s.artist)}" maxlength="100" placeholder="Nombre del artista"></label></div>
    <div id="document-options-content">
      <div class="settings-group-label">ACORDES Y CEJILLA</div>
      <div class="music-controls"><div><label>SEMITONOS</label><div class="stepper"><button id="undo-transpose" type="button" aria-label="${t("Volver al tono original")}" title="${t("Volver al tono original")}" ${transposeInfo ? "" : "disabled"}>↺</button><button id="transpose-down" aria-label="Bajar un semitono">−</button><span class="transpose-value" role="status" aria-label="${transposeInfo ? t`Transposición ${transposeInfo.offset > 0 ? "+" : ""}${transposeInfo.offset} ${Math.abs(transposeInfo.offset) === 1 ? t("semitono") : t("semitonos")}` : t("Tono original")}">${transposeInfo ? `${transposeInfo.offset > 0 ? "+" : ""}${transposeInfo.offset}` : "0"}</span><button id="transpose-up" aria-label="Subir un semitono">＋</button></div></div><div><label>CEJILLA</label><div class="stepper"><button id="capo-down" aria-label="Bajar cejilla">−</button><input id="capo" type="number" min="0" max="12" value="${s.capo}" aria-label="Cejilla"><button id="capo-up" aria-label="Subir cejilla">＋</button></div></div></div>
      <button id="link" class="capo-link-toggle ${s.linked ? "linked" : ""}" aria-pressed="${s.linked}"><span class="toggle-mark" aria-hidden="true">${s.linked ? "✓" : ""}</span><span>Mantener el tono al mover la cejilla</span></button>
      <div class="settings-group-label">FORMATO DE PÁGINA</div>
      <div class="settings-row"><label class="field">TAMAÑO <div class="number-unit"><input id="fontSize" type="number" min="7" max="20" step="0.5" value="${s.fontSize}"><span>pt</span></div></label><label class="field">MÁRGENES <div class="number-unit"><input id="margin" type="number" min="5" max="35" step="1" value="${s.margin}"><span>mm</span></div></label><div class="field">COLUMNAS<div class="segmented" role="group" aria-label="Columnas"><button data-columns="1" class="${s.columns === 1 ? "selected" : ""}" aria-label="Una columna" aria-pressed="${s.columns === 1}">1</button><button data-columns="2" class="${s.columns === 2 ? "selected" : ""}" aria-label="Dos columnas" aria-pressed="${s.columns === 2}">2</button></div></div></div>
      <div class="settings-group-label">LIMPIAR TEXTO</div>
      <div class="text-tools"><button id="compress-blank-lines" type="button" ${hasBlanks ? "" : "disabled"}>Comprimir líneas vacías</button></div>
      <p class="text-tools-help">Una línea vacía suelta se elimina; si hay varias seguidas, se deja solo una. Los acordes no se mueven.</p>
      <details class="more-document-options"><summary>Más opciones</summary><label class="footer-option"><input id="showBrand" type="checkbox" ${s.showBrand !== false ? "checked" : ""}><span>Mostrar chordleaf.com en el pie</span></label></details>
    </div>`;
}
