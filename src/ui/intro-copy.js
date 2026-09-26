// Shared by the browser's empty workspace and the crawlable HTML entry pages.
const copy = {
  en: {
    label: "Features",
    guide: "User guide",
    source: "Open source on GitHub",
    links: [
      ["/en/guide/", "User guide"],
      ["/en/chord-sheet-maker/", "Chord sheet maker"],
      ["/en/printable-chord-sheets/", "Print your sheet"],
      ["/en/transpose-chords/", "Transpose chords"],
      ["/en/privacy/", "Privacy"],
      ["/en/import-policy/", "Import policy"],
    ],
    features: [
      [
        "Write your way",
        "Place chords on any syllable. Start fresh or import TXT, PDF, Word and supported song links.",
      ],
      [
        "Get ready to play",
        "Transpose chords, adjust the capo and explore guitar positions before rehearsal.",
      ],
      [
        "Share a clear song sheet",
        "Review the A4 layout and export PDF, Word or text. Your songs are saved in this browser.",
      ],
    ],
  },
  es: {
    label: "Funciones",
    guide: "Guía de uso",
    source: "Código abierto en GitHub",
    links: [
      ["/es/guia/", "Guía de uso"],
      ["/es/editor-de-acordes/", "Editor de acordes"],
      ["/es/hoja-de-acordes-para-imprimir/", "Imprimir tu hoja"],
      ["/es/transportar-acordes/", "Transportar acordes"],
      ["/es/privacidad/", "Privacidad"],
      ["/es/politica-de-importacion/", "Política de importación"],
    ],
    features: [
      [
        "Escribe a tu manera",
        "Coloca acordes sobre cualquier sílaba de la letra. Empieza desde cero o importa TXT, PDF, Word y enlaces compatibles.",
      ],
      [
        "Prepara la interpretación",
        "Transporta los acordes, ajusta la cejilla y explora posiciones de guitarra antes del ensayo.",
      ],
      [
        "Comparte una hoja clara",
        "Revisa el diseño A4 y exporta PDF, Word o texto. Tus canciones se guardan en este navegador.",
      ],
    ],
  },
};

export function introHtml(locale) {
  const content = copy[locale === "es" ? "es" : "en"];
  return `<section class="intro-features" aria-label="${content.label}">${content.features.map(([heading, body]) => `<div><h2>${heading}</h2><p>${body}</p></div>`).join("")}</section><nav class="intro-links" aria-label="${content.guide}">${content.links.map(([href, label]) => `<a href="${href}">${label}</a>`).join(" ")} <a href="https://github.com/antoniomml/chordleaf">${content.source}</a></nav>`;
}
