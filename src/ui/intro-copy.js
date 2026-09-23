// Shared by the browser's empty workspace and the crawlable HTML entry pages.
const copy = {
  en: {
    label: "Features",
    guide: "User guide",
    source: "Open source on GitHub",
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
  return `<section class="intro-features" aria-label="${content.label}">${content.features.map(([heading, body]) => `<div><h2>${heading}</h2><p>${body}</p></div>`).join("")}</section><p class="intro-links"><a href="https://github.com/antoniomml/chordleaf/wiki/User-guide">${content.guide}</a> · <a href="https://github.com/antoniomml/chordleaf">${content.source}</a></p>`;
}
