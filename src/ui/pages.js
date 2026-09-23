import { escapeHtml as esc } from "./html.js";
import { t } from "../i18n.js";
import { PAGE } from "../layout.js";

/** Produce one complete preview from the current layout model. */
export function renderPageMarkup(s, l, editing) {
  return l.pages
    .map(
      (p, i) =>
        `<div class="page-shell"><article class="page" data-page="${i + 1}" style="width:${PAGE.width}px;height:${PAGE.height}px">${i === 0 ? `<div class="sheet-header" style="left:${l.margin}px;right:${l.margin}px;top:${l.margin}px;height:${l.headerHeight}px"><h1 style="font-size:${l.header.titleSize}px" ${s.title ? "" : `aria-label="${t("Canción sin título")}"`} ${editing ? 'contenteditable="true" data-header="title"' : ""}>${l.titleLines.map(esc).join("<br>")}</h1><p style="left:${l.header.artistX}px;top:${l.header.artistY - l.header.artistSize}px;font-size:${l.header.artistSize}px" ${editing ? 'contenteditable="true" data-header="artist"' : ""}>${l.header.artistLines.map(esc).join("<br>")}</p><span style="top:${l.header.capoY - 11}px">CAPO ${s.capo}</span></div>` : ""}${p.columns
          .flat()
          .map(
            (r) =>
              `<div class="song-line ${editing ? "editable" : ""}" data-line="${r.index}" data-end="${r.endIndex ?? r.index}" style="left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;font-size:${l.size}px" ${editing ? t('tabindex="0" role="button" aria-label="Editar verso"') : ""}>${r.marks.map((m) => `<span class="sheet-chord" data-chord="${esc(m.chord)}" style="left:${m.x * l.cw}px;top:${(m.lane || 0) * l.size * 1.44}px">${esc(m.chord)}</span>`).join("")}<span class="lyric" style="top:${r.lyricOffset}px">${esc(r.lyric) || " "}</span></div>`,
          )
          .join(
            "",
          )}<span class="sheet-brand">Chordleaf</span><span class="sheet-page">${i + 1}</span></article></div>`,
    )
    .join("");
}
