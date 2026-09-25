import { t } from "./i18n.js";

// One horizontal guitar neck for chord identification and position editing.
export function fretboardMarkup(frets, first) {
  const labels = ["E", "A", "D", "G", "B", "e"];
  const rows = [5, 4, 3, 2, 1, 0]
    .map((string) => {
      const selected = frets[string];
      const state =
        selected < 0 ? "is-muted" : selected === 0 ? "is-open" : "is-fretted";
      const stateLabel =
        selected < 0
          ? t("Apagada")
          : selected === 0
            ? t("Al aire")
            : t("Traste");
      const openLabel =
        selected < 0
          ? t("apagada; poner al aire")
          : selected === 0
            ? t("al aire; silenciar")
            : t`traste ${selected}; silenciar`;
      return t`<div class="guitar-string" style="--string-weight:${0.7 + (5 - string) * 0.22}px"><span class="string-name">${labels[string]}</span><button type="button" class="open-string ${state}" data-string="${string}" data-fret="-1" aria-label="Cuerda ${string + 1}: ${openLabel}" aria-pressed="${selected === 0}" title="${openLabel}"><span class="string-state-symbol" aria-hidden="true">${selected < 0 ? "×" : selected === 0 ? "○" : ""}</span><span class="string-state-label" aria-hidden="true">${stateLabel}</span></button>${Array.from(
        { length: 5 },
        (_, i) => {
          const fret = first + i;
          return t`<button type="button" class="fret-point ${selected === fret ? "pressed" : ""} ${i === 0 && first === 1 ? "at-nut" : ""}" data-string="${string}" data-fret="${fret}" aria-label="Cuerda ${string + 1}, traste ${fret}" aria-pressed="${selected === fret}"><span aria-hidden="true"></span></button>`;
        },
      ).join("")}</div>`;
    })
    .join("");
  const markers = `<div class="fret-markers"><span></span><span></span>${Array.from({ length: 5 }, (_, i) => `<span>${[3, 5, 7, 9, 15, 17, 19, 21].includes(first + i) ? "•" : [12, 24].includes(first + i) ? "••" : ""}</span>`).join("")}</div>`;
  const numbers = `<div class="fret-numbers"><span></span><span>0</span>${Array.from({ length: 5 }, (_, i) => `<span>${first + i}</span>`).join("")}</div>`;
  return rows + markers + numbers;
}
