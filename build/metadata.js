import { introHtml } from "../src/ui/intro-copy.js";

const CHANGELOG_URL =
  "https://github.com/antoniomml/chordleaf/blob/main/CHANGELOG.md";
const REPOSITORY_URL = "https://github.com/antoniomml/chordleaf";
const WORKSPACE_IMAGE = "/images/editor-workspace.png";

const copy = {
  en: {
    title: "Chordleaf — Lyrics & Guitar Chords Editor | Free PDF Sheets",
    description:
      "Write lyrics and chords, explore guitar shapes, transpose songs and export rehearsal sheets as PDF, Word or text. Free browser workspace in English and Spanish.",
    heading: "Chordleaf — Lyrics & Guitar Chords Editor",
    intro:
      "Write lyrics and chords, explore guitar positions, transpose songs and prepare rehearsal sheets.",
    privacy:
      "Import TXT, PDF or Word and export an editable song sheet. Your songs stay in your browser.",
    imageAlt:
      "Chordleaf social card: a song sheet with lyrics, guitar chord positions and the Chordleaf logo.",
    featureList: [
      "Write lyrics and place chords on any syllable",
      "Transpose chords and adjust the capo",
      "Explore guitar chord positions and diagrams",
      "Import TXT, PDF, Word and supported song links",
      "Export rehearsal sheets as PDF, Word or text",
      "Local-first workspace: songs stay in the browser",
    ],
  },
  es: {
    title: "Chordleaf — Editor de letras y acordes | Hojas PDF gratis",
    description:
      "Escribe letras y acordes, explora posiciones de guitarra, transporta canciones y exporta hojas de ensayo en PDF, Word o texto. Gratis, en español e inglés.",
    heading: "Chordleaf — Editor de letras y acordes",
    intro:
      "Escribe letras y acordes, explora posiciones de guitarra, transporta canciones y prepara hojas de ensayo.",
    privacy:
      "Importa TXT, PDF o Word y exporta una hoja editable. Tus canciones se quedan en tu navegador.",
    imageAlt:
      "Tarjeta social de Chordleaf: una hoja con letra, acordes de guitarra y el logotipo de Chordleaf.",
    featureList: [
      "Escribe letras y coloca acordes sobre cualquier sílaba",
      "Transporta acordes y ajusta la cejilla",
      "Explora posiciones y diagramas de acordes de guitarra",
      "Importa TXT, PDF, Word y enlaces de canciones compatibles",
      "Exporta hojas de ensayo en PDF, Word o texto",
      "Espacio local: las canciones se quedan en el navegador",
    ],
  },
};

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/**
 * Static content pages are declared in ES/EN pairs so every page can link to
 * its counterpart with reciprocal canonical and hreflang tags. Each page keeps
 * its own copy, screenshot caption, FAQ and internal links; nothing here may
 * reproduce third-party lyrics or promise features that do not exist.
 */
const pairEditor = {
  id: "editor",
  es: {
    slug: "editor-de-acordes",
    kicker: "Editor de acordes",
    title: "Editor de acordes online y gratis — Chordleaf",
    description:
      "Escribe la letra, coloca los acordes sobre cada sílaba y exporta la hoja en PDF, Word, texto o ChordPro. Sin cuenta y con tus canciones en el navegador.",
    h1: "Editor de acordes para escribir canciones con letra y música",
    lead: "Chordleaf es un editor de acordes que funciona en el navegador. Escribe o pega la letra, coloca cada acorde sobre la sílaba exacta y prepara una hoja de ensayo limpia para imprimir o exportar. No hay cuentas, anuncios ni instalaciones obligatorias.",
    imageAlt:
      "Captura del editor de Chordleaf con una hoja abierta, acordes sobre la letra y el panel de ajustes del documento.",
    imageCaption:
      "El editor con la hoja abierta: acordes anclados a la letra y ajustes del documento a la derecha.",
    sections: [
      {
        h: "Qué puedes hacer en Chordleaf",
        p: [
          "Chordleaf reúne en una sola pantalla lo que suele estar repartido entre un editor de texto, una web de acordes y una aplicación de diagramas. Escribes la letra, colocas los acordes encima y el editor recalcula la maquetación de la página mientras trabajas.",
          "Está pensado para guitarristas que preparan canciones para clase, ensayo o culto, y para cualquier persona que quiera una hoja legible sin pelearse con tabulaciones ni con espacios manuales. También sirve para transcribir a mano una canción que ya conoces y guardarla con un formato consistente.",
        ],
        list: [
          "Colocar acordes sobre cualquier sílaba, sin alinear columnas a mano.",
          "Consultar posiciones de guitarra y crear diagramas para la hoja.",
          "Transportar la canción por semitonos y ajustar la cejilla.",
          "Importar TXT, PDF, Word o pegar la letra desde otra web.",
          "Exportar PDF A4, Word, texto o ChordPro, además del proyecto editable.",
        ],
      },
      {
        h: "Cómo se colocan los acordes sobre la letra",
        p: [
          "El flujo es directo: escribe o pega la letra, sitúa el cursor en el punto exacto y elige un acorde del panel de acordes. El editor guarda cada acorde anclado a esa posición en lugar de una fila de texto con espacios, así que puedes seguir editando la letra sin descolocar lo que ya habías puesto.",
          "Si un acorde importado no está en el vocabulario del editor, Chordleaf lo conserva y lo marca para revisarlo. Desde el panel puedes sustituirlo por la posición correcta o añadirlo a tus acordes personalizados; nada se borra sin que lo decidas tú.",
          "La colocación funciona igual con teclado o con pantalla táctil. En el móvil, el editor cambia entre la letra, los controles musicales y la vista previa para que cada tarea tenga espacio suficiente.",
        ],
      },
      {
        h: "Diagramas, cejilla y tonalidad",
        p: [
          "El diccionario incluye posiciones de guitarra y un mástil interactivo para dibujar acordes propios, incluso los que no aparecen en los diccionarios habituales. Los diagramas se colocan como bloques en la hoja y se distribuyen en columnas sin deformarse.",
          "La tonalidad probable se estima a partir de los acordes que has escrito. Con el transporte y la cejilla adaptas la canción a tu voz sin tocar la letra, y el aviso de tonalidad te dice en qué tono suena realmente lo que tocas cuando usas cejilla.",
        ],
      },
      {
        h: "De la pantalla al papel",
        p: [
          "La vista previa usa una página A4 real con márgenes, tamaño de letra y una o dos columnas. Puedes cambiar esos valores y comprobar el resultado antes de exportar, sin sorpresas al imprimir.",
          "El menú de exportación genera un PDF listo para imprimir, un documento Word, texto plano y ChordPro (.cho), además del proyecto .chordleaf.json para seguir editando otro día. La impresión directa del navegador comparte el mismo diseño: fondo blanco, sin la interfaz del editor y con las páginas cortadas donde corresponde.",
        ],
      },
      {
        h: "Tus canciones se quedan contigo",
        p: [
          "Chordleaf no pide cuenta ni sube tus canciones a un servidor. El trabajo se guarda en el almacenamiento local de tu navegador, en este dispositivo.",
          "Puedes exportar el proyecto .chordleaf.json como copia de seguridad y volver a abrirlo cuando quieras. Si borras los datos del navegador, esas canciones locales desaparecen, así que conviene guardar el proyecto o el PDF si quieres conservarlas.",
          "Al ser una aplicación web instalable, después de la primera visita puedes abrir el editor sin conexión y seguir trabajando con lo que tengas guardado en el dispositivo.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Chordleaf es gratis?",
        a: "Sí. Es un proyecto de código abierto con licencia MIT, sin anuncios ni planes de pago. Puedes usarlo y consultar su código en GitHub.",
      },
      {
        q: "¿Necesito una cuenta o instalar algo?",
        a: "No. Se abre en el navegador y funciona sin registro. Si quieres, puedes instalarlo como aplicación desde el propio navegador para tenerlo a mano y trabajar sin conexión.",
      },
      {
        q: "¿Puedo importar canciones que ya tengo?",
        a: "Sí: pega el texto, importa un TXT, PDF o DOCX, o usa un enlace compatible de Cifra Club, LaCuerda o Ultimate Guitar. La guía de importación explica los tres caminos y qué hacer cuando una web bloquea la descarga.",
      },
      {
        q: "¿Dónde se guardan mis canciones?",
        a: "En el almacenamiento local de tu navegador. No se sincronizan entre dispositivos y nadie más las ve desde Chordleaf. Exporta el proyecto para tener una copia.",
      },
    ],
    related: [
      {
        href: "/es/hoja-de-acordes-para-imprimir/",
        label: "Preparar una hoja A4 para el atril",
      },
      {
        href: "/es/transportar-acordes/",
        label: "Transportar acordes y usar la cejilla",
      },
      {
        href: "/es/importar-cifra-club/",
        label: "Importar una canción desde Cifra Club",
      },
      { href: "/es/guia/", label: "Guía completa de Chordleaf" },
    ],
  },
  en: {
    slug: "chord-sheet-maker",
    kicker: "Chord sheet maker",
    title: "Chord sheet maker for lyrics & guitar — Chordleaf",
    description:
      "Build a clear chord sheet in your browser: write lyrics, place chords on the right syllable, add diagrams and export PDF, Word or text. Free and local-first.",
    h1: "A chord sheet maker that keeps lyrics and chords aligned",
    lead: "Chordleaf turns a plain lyric text into a rehearsal-ready chord sheet. Write or paste the words, drop guitar chords on the exact syllable, add diagrams and export a clean A4 PDF. There is no account and nothing to install.",
    imageAlt:
      "Screenshot of the Chordleaf editor with a song sheet open, chords over the lyrics and document settings on the right.",
    imageCaption:
      "The editor with a song open: chords anchored to the lyrics and document settings on the right.",
    sections: [
      {
        h: "What a chord sheet maker gives you",
        p: [
          "A chord sheet maker keeps two things together that are easy to lose in a plain text file: the words and the chords that belong above them. Chordleaf stores every chord as an anchor on a syllable, so editing a line never drags the chord grid out of place.",
          "It is aimed at guitarists preparing songs for a lesson, a rehearsal or a worship set, and at anyone who wants a readable sheet without counting spaces by hand. You can start from a blank page, paste an existing text or import a file you already have.",
        ],
        list: [
          "Place a chord on any syllable without manual alignment.",
          "Look up guitar shapes and build diagrams for the sheet.",
          "Transpose by semitones and set a capo.",
          "Import TXT, PDF, Word or supported song links.",
          "Export A4 PDF, Word, plain text or ChordPro, plus an editable project.",
        ],
      },
      {
        h: "Placing chords on the lyrics",
        p: [
          "Write or paste the lyrics, put the cursor where the chord changes and pick a chord from the panel. The editor records the anchor at that position, so you can rewrite a verse later and the chords stay with the right syllables.",
          "When an imported chord is not recognised, Chordleaf keeps it and flags it for review instead of silently deleting it. You can replace it from the chord panel or save a custom shape; the final call is always yours.",
          "The same workflow works with a mouse, a keyboard or a touch screen. On a phone the workspace swaps between lyrics, music controls and the sheet preview so each task has room to breathe.",
        ],
      },
      {
        h: "Chord diagrams, capo and key",
        p: [
          "The chord dictionary holds guitar shapes and an interactive fretboard for drawing your own, including voicings that common dictionaries skip. Diagrams can be placed as blocks on the sheet and are distributed in columns without stretching.",
          "The likely key is estimated from the chords you wrote. Transposition and the capo let you fit the song to your voice without touching the lyrics, and the key note tells you what actually sounds when a capo is on the neck.",
        ],
      },
      {
        h: "From the screen to the music stand",
        p: [
          "The preview uses a real A4 page with margins, font size and one or two columns. Adjust those values and check the result before exporting; what you see in the preview is what comes out.",
          "The export menu produces a print-ready PDF, a Word document, plain text and ChordPro (.cho), in addition to the .chordleaf.json project for later edits. Printing from the browser uses the same layout: white background, no editor chrome and page breaks where they belong.",
        ],
      },
      {
        h: "Free, open source and local-first",
        p: [
          "Chordleaf does not ask for an account and does not upload your songs. Work is stored in your browser's local storage on this device.",
          "Export the .chordleaf.json project as a backup and reopen it whenever you want. Clearing the browser data removes those local songs, so save the project or the PDF when the arrangement matters.",
          "Installed as a web app, the editor opens offline after the first visit and keeps working with whatever is already stored on the device.",
        ],
      },
    ],
    faq: [
      {
        q: "Is Chordleaf free?",
        a: "Yes. It is an open source project under the MIT licence, with no ads and no paid tier. You can read the code on GitHub.",
      },
      {
        q: "Do I need an account or an installation?",
        a: "No. It runs in the browser without registration. You can install it as a web app if you want a shortcut and offline access.",
      },
      {
        q: "Can I bring songs I already have?",
        a: "Yes: paste the text, import a TXT, PDF or DOCX file, or use a supported link from Cifra Club, LaCuerda or Ultimate Guitar. The import guide explains all three routes and the manual fallback.",
      },
      {
        q: "Where are my songs stored?",
        a: "In your browser's local storage. They are not synchronised across devices and Chordleaf does not show them to anyone else. Export the project to keep a backup.",
      },
    ],
    related: [
      {
        href: "/en/printable-chord-sheets/",
        label: "Prepare an A4 sheet for the stand",
      },
      {
        href: "/en/transpose-chords/",
        label: "Transpose chords and use a capo",
      },
      {
        href: "/en/import-ultimate-guitar/",
        label: "Import a song from Ultimate Guitar",
      },
      { href: "/en/guide/", label: "Full Chordleaf user guide" },
    ],
  },
};

const contentPairs = [pairEditor];

const chrome = {
  es: {
    siteName: "Chordleaf",
    home: "/es/",
    locale: "es_ES",
    alternateLocale: "en_US",
    langLabel: "English",
    skip: "Ir al contenido",
    footerLabel: "Navegación del sitio",
    faqHeading: "Preguntas frecuentes",
    relatedHeading: "Sigue leyendo",
    cta: "Abrir el editor",
    ctaHref: "/es/",
    footerNote:
      "Chordleaf es software libre con licencia MIT. Tus canciones se quedan en tu navegador.",
    footer: [
      ["/es/guia/", "Guía"],
      ["/es/privacidad/", "Privacidad"],
      ["/es/politica-de-importacion/", "Importación"],
      [CHANGELOG_URL, "Changelog"],
      [REPOSITORY_URL, "GitHub"],
    ],
    socialImageAlt:
      "Tarjeta social de Chordleaf: una hoja con letra, acordes de guitarra y el logotipo de Chordleaf.",
  },
  en: {
    siteName: "Chordleaf",
    home: "/",
    locale: "en_US",
    alternateLocale: "es_ES",
    langLabel: "Español",
    skip: "Skip to content",
    footerLabel: "Site navigation",
    faqHeading: "Frequently asked questions",
    relatedHeading: "Keep reading",
    cta: "Open the editor",
    ctaHref: "/",
    footerNote:
      "Chordleaf is free software under the MIT licence. Your songs stay in your browser.",
    footer: [
      ["/en/guide/", "Guide"],
      ["/en/privacy/", "Privacy"],
      ["/en/import-policy/", "Import policy"],
      [CHANGELOG_URL, "Changelog"],
      [REPOSITORY_URL, "GitHub"],
    ],
    socialImageAlt:
      "Chordleaf social card: a song sheet with lyrics, guitar chord positions and the Chordleaf logo.",
  },
};

const contentPagesCss = `main.content-main {
  display: block;
  height: auto;
  min-height: 0;
  padding: 34px 20px 10px;
}
.content-page {
  color: #cfd8c9;
  font-family: "DM Sans", Arial, sans-serif;
  font-size: 15.5px;
  line-height: 1.7;
}
.content-page a {
  color: var(--green, #c9e79c);
}
.content-shell,
.content-header,
.content-footer nav,
.content-footer p {
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}
.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 0;
}
.content-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #edf2e7;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
}
.content-brand img {
  display: block;
}
.content-lang {
  font-size: 13px;
}
.content-kicker {
  margin: 0 0 10px;
  color: var(--green, #c9e79c);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.content-page h1 {
  margin: 0 0 14px;
  color: #edf2e7;
  font-size: clamp(26px, 4vw, 38px);
  line-height: 1.15;
  letter-spacing: -0.5px;
}
.content-lead {
  margin: 0 0 20px;
  color: #c3ceba;
  font-size: 17px;
  line-height: 1.65;
}
.content-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 0 26px;
}
.content-cta {
  display: inline-block;
  padding: 11px 18px;
  border-radius: 6px;
  background: var(--green, #c9e79c);
  color: #171a19 !important;
  font-weight: 700;
  text-decoration: none;
}
.content-figure {
  margin: 0 0 28px;
}
.content-figure img {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--border, #343934);
  border-radius: 10px;
}
.content-figure figcaption {
  margin-top: 10px;
  color: var(--muted, #8a918b);
  font-size: 13px;
}
.content-page h2 {
  margin: 34px 0 12px;
  color: #edf2e7;
  font-size: 22px;
}
.content-page h3 {
  margin: 22px 0 8px;
  color: #e5e7df;
  font-size: 17px;
}
.content-page p {
  margin: 0 0 14px;
}
.content-page ul {
  margin: 0 0 16px;
  padding-left: 22px;
}
.content-page li {
  margin-bottom: 8px;
}
.content-faq p {
  color: #b9c4b0;
}
.content-related ul {
  display: grid;
  gap: 8px;
  margin: 0 0 24px;
  padding: 0;
  list-style: none;
}
.content-footer {
  margin-top: 40px;
  padding: 24px 20px 40px;
  border-top: 1px solid var(--border, #343934);
  color: var(--muted, #8a918b);
  font-size: 13px;
}
.content-footer nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-bottom: 12px;
}
.content-footer p {
  margin: 0;
}
@media (max-width: 600px) {
  .content-page h2 {
    font-size: 20px;
  }
  .content-lead {
    font-size: 16px;
  }
}
`;

export function contentPageUrl(origin, page) {
  return `${origin}/${page.locale}/${page.slug}/`;
}

/** Flat registry used by tests and the sitemap builder. */
export function contentPageEntries() {
  const entries = [];
  for (const pair of contentPairs)
    for (const locale of ["es", "en"])
      if (pair[locale]) entries.push({ pair, locale, page: pair[locale] });
  return entries;
}

export { contentPagesCss, contentPairs, chrome };

function pageAlternates(origin, pair) {
  if (!origin) return "";
  const en = contentPageUrl(origin, pair.en);
  const es = contentPageUrl(origin, pair.es);
  return (
    `<link rel="alternate" hreflang="en" href="${en}">` +
    `<link rel="alternate" hreflang="es" href="${es}">` +
    `<link rel="alternate" hreflang="x-default" href="${en}">`
  );
}

export function buildContentJsonLd(origin, locale, page, pair) {
  const url = contentPageUrl(origin, page);
  const webpage = {
    "@type": "WebPage",
    url,
    name: page.title,
    description: page.description,
    inLanguage: locale,
    isPartOf: {
      "@type": "WebSite",
      name: "Chordleaf",
      url: `${origin}/`,
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${origin}${WORKSPACE_IMAGE}`,
    },
  };
  const faq = {
    "@type": "FAQPage",
    mainEntity: page.faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [webpage, faq],
  }).replaceAll("<", "\\u003c");
}

export function renderContentPage(options) {
  const { origin, locale, page, pair, cssHref } = options;
  const c = chrome[locale];
  const otherLocale = locale === "es" ? "en" : "es";
  const other = pair[otherLocale];
  const url = origin ? contentPageUrl(origin, { ...page, locale }) : null;
  const otherUrl = origin
    ? contentPageUrl(origin, { ...other, locale: otherLocale })
    : `/${otherLocale}/${other.slug}/`;
  const canonical = url
    ? `<link rel="canonical" href="${url}">` + pageAlternates(origin, pair)
    : "";
  const socialImage = origin ? `${origin}/social-preview.png` : null;
  const ogTags =
    `<meta property="og:type" content="article">` +
    `<meta property="og:site_name" content="${c.siteName}">` +
    `<meta property="og:title" content="${escapeHtml(page.title)}">` +
    `<meta property="og:description" content="${escapeHtml(page.description)}">` +
    (url ? `<meta property="og:url" content="${url}">` : "") +
    `<meta property="og:locale" content="${c.locale}">` +
    `<meta property="og:locale:alternate" content="${c.alternateLocale}">` +
    (socialImage
      ? `<meta property="og:image" content="${socialImage}">` +
        `<meta property="og:image:type" content="image/png">` +
        `<meta property="og:image:width" content="1200">` +
        `<meta property="og:image:height" content="630">` +
        `<meta property="og:image:alt" content="${escapeHtml(c.socialImageAlt)}">`
      : "") +
    `<meta name="twitter:card" content="summary_large_image">` +
    `<meta name="twitter:title" content="${escapeHtml(page.title)}">` +
    `<meta name="twitter:description" content="${escapeHtml(page.description)}">` +
    (socialImage
      ? `<meta name="twitter:image" content="${socialImage}">` +
        `<meta name="twitter:image:alt" content="${escapeHtml(c.socialImageAlt)}">`
      : "");
  const jsonLd = origin
    ? `<script type="application/ld+json">${buildContentJsonLd(origin, locale, page, pair)}</script>`
    : "";
  const sections = page.sections
    .map(
      ({ h, p = [], list }) =>
        `<section><h2>${h}</h2>${p.map((text) => `<p>${text}</p>`).join("")}` +
        (list
          ? `<ul>${list.map((item) => `<li>${item}</li>`).join("")}</ul>`
          : "") +
        `</section>`,
    )
    .join("\n        ");
  const faq = page.faq
    .map(({ q, a }) => `<h3>${q}</h3><p>${a}</p>`)
    .join("\n        ");
  const related = page.related
    .map(({ href, label }) => `<li><a href="${href}">${label}</a></li>`)
    .join("\n          ");
  const footerNav = c.footer
    .map(
      ([href, label]) =>
        `<a href="${href}"${href.startsWith("http") ? ' rel="noopener"' : ""}>${label}</a>`,
    )
    .join("\n          ");
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1,viewport-fit=cover"
    />
    <meta name="theme-color" content="#171a19" />
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}" />
    <link rel="icon" href="/logo.svg" />
    ${canonical}
    ${ogTags}
    ${cssHref ? `<link rel="stylesheet" href="${cssHref}" />` : ""}
    <link rel="stylesheet" href="/content-pages.css" />
    ${jsonLd}
  </head>
  <body>
    <div class="content-page">
      <header class="content-header">
        <a class="content-brand" href="${c.home}">
          <img src="/logo.svg" alt="" width="26" height="26" />
          ${c.siteName}
        </a>
        <a class="content-lang" href="${otherUrl}" hreflang="${otherLocale}" lang="${otherLocale}">${c.langLabel}</a>
      </header>
      <main class="content-main" id="content">
        <article class="content-shell">
          <p class="content-kicker">${page.kicker}</p>
          <h1>${page.h1}</h1>
          <p class="content-lead">${page.lead}</p>
          <p class="content-cta-row"><a class="content-cta" href="${c.ctaHref}">${c.cta}</a></p>
          <figure class="content-figure">
            <img
              src="${WORKSPACE_IMAGE}"
              alt="${escapeHtml(page.imageAlt)}"
              width="1440"
              height="1000"
            />
            <figcaption>${page.imageCaption}</figcaption>
          </figure>
        ${sections}
        <section class="content-faq">
          <h2>${c.faqHeading}</h2>
          ${faq}
        </section>
        <section class="content-related">
          <h2>${c.relatedHeading}</h2>
          <ul>
            ${related}
          </ul>
        </section>
        <p class="content-cta-row"><a class="content-cta" href="${c.ctaHref}">${c.cta}</a></p>
        </article>
      </main>
      <footer class="content-footer">
        <nav aria-label="${c.footerLabel}">
          ${footerNav}
        </nav>
        <p>${c.footerNote} · <a href="${otherUrl}" hreflang="${otherLocale}" lang="${otherLocale}">${c.langLabel}</a></p>
      </footer>
    </div>
  </body>
</html>
`;
}

export function buildJsonLd(origin, locale) {
  const c = copy[locale === "es" ? "es" : "en"];
  const url = locale === "es" ? `${origin}/es/` : `${origin}/`;
  const application = {
    "@type": "SoftwareApplication",
    name: "Chordleaf",
    url,
    applicationCategory: "MusicApplication",
    operatingSystem: "Any",
    inLanguage: ["es", "en"],
    offers: { "@type": "Offer", price: 0, priceCurrency: "EUR" },
    featureList: [...c.featureList],
    screenshot: [`${origin}/social-preview.png`],
    description: c.description,
    isAccessibleForFree: true,
    sameAs: ["https://github.com/antoniomml/chordleaf"],
  };
  const website = {
    "@type": "WebSite",
    name: "Chordleaf",
    url: `${origin}/`,
    inLanguage: ["es", "en"],
    description: c.description,
  };
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [application, website],
  }).replaceAll("<", "\\u003c");
}

export function buildSitemap(origin, lastmod) {
  const pairUrls = [
    { en: `${origin}/`, es: `${origin}/es/` },
    ...contentPairs.map((pair) => ({
      en: contentPageUrl(origin, { ...pair.en, locale: "en" }),
      es: contentPageUrl(origin, { ...pair.es, locale: "es" }),
    })),
  ];
  const urls = pairUrls
    .map(({ en, es }) => {
      const alternates =
        `<xhtml:link rel="alternate" hreflang="en" href="${en}"/>` +
        `<xhtml:link rel="alternate" hreflang="es" href="${es}"/>` +
        `<xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>`;
      return [en, es]
        .map(
          (loc) =>
            `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod>${alternates}</url>`,
        )
        .join("");
    })
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">` +
    urls +
    `</urlset>`
  );
}

export function metadataPlugin(site) {
  return {
    name: "chordleaf-public-metadata",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const index = bundle["index.html"];
        if (!index) throw new Error("Built index.html is missing");
        const cssAsset = Object.keys(bundle).find((name) =>
          name.endsWith(".css"),
        );
        const cssHref = cssAsset ? `/${cssAsset}` : null;
        const base = String(index.source);
        for (const locale of ["en", "es"]) {
          const c = copy[locale];
          let html = base
            .replace('<html lang="en">', `<html lang="${locale}">`)
            .replace(
              /<title>.*?<\/title>/s,
              `<title>${escapeHtml(c.title)}</title>`,
            )
            .replace(
              /(<meta\s+name="description"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.description)}$2`,
            )
            .replace(
              /(<meta\s+property="og:title"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.title)}$2`,
            )
            .replace(
              /(<meta\s+property="og:description"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.description)}$2`,
            )
            .replace(
              /(<meta\s+property="og:image:alt"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.imageAlt)}$2`,
            )
            .replace(
              /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.title)}$2`,
            )
            .replace(
              /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.description)}$2`,
            )
            .replace(
              /(<meta\s+name="twitter:image:alt"\s+content=")[^"]*(")/s,
              `$1${escapeHtml(c.imageAlt)}$2`,
            )
            .replace(/<h1>.*?<\/h1>/s, `<h1>${escapeHtml(c.heading)}</h1>`)
            .replace(/<p>\s*Write lyrics.*?<\/p>/s, `<p>${c.intro}</p>`)
            .replace(/<p>\s*Import TXT.*?<\/p>/s, `<p>${c.privacy}</p>`)
            .replace('<div id="fallback-features"></div>', introHtml(locale));
          if (site) {
            const origin = site.origin;
            const pageUrl = locale === "en" ? `${origin}/` : `${origin}/es/`;
            const tags =
              `<link rel="canonical" href="${pageUrl}">` +
              `<link rel="alternate" hreflang="en" href="${origin}/">` +
              `<link rel="alternate" hreflang="es" href="${origin}/es/">` +
              `<link rel="alternate" hreflang="x-default" href="${origin}/">` +
              `<meta property="og:url" content="${pageUrl}">` +
              `<meta property="og:locale" content="${locale === "en" ? "en_US" : "es_ES"}">` +
              `<meta property="og:image" content="${origin}/social-preview.png">` +
              `<meta property="og:image:width" content="1200">` +
              `<meta property="og:image:height" content="630">` +
              `<meta name="twitter:image" content="${origin}/social-preview.png">` +
              `<script type="application/ld+json">${buildJsonLd(origin, locale)}</script>`;
            html = html.replace("</head>", tags + "</head>");
          }
          this.emitFile({
            type: "asset",
            fileName: `${locale}/index.html`,
            source: html,
          });
          if (locale === "en") index.source = html;
        }
        const origin = site ? site.origin : null;
        for (const pair of contentPairs) {
          for (const locale of ["es", "en"]) {
            const page = pair[locale];
            if (!page) continue;
            this.emitFile({
              type: "asset",
              fileName: `${locale}/${page.slug}/index.html`,
              source: renderContentPage({
                origin,
                locale,
                page,
                pair,
                cssHref,
              }),
            });
          }
        }
        this.emitFile({
          type: "asset",
          fileName: "content-pages.css",
          source: contentPagesCss,
        });
        this.emitFile({
          type: "asset",
          fileName: "robots.txt",
          source:
            "User-agent: *\nAllow: /\nDisallow: /api/\n" +
            (site ? `Sitemap: ${site.origin}/sitemap.xml\n` : ""),
        });
        if (site)
          this.emitFile({
            type: "asset",
            fileName: "sitemap.xml",
            source: buildSitemap(
              site.origin,
              new Date().toISOString().slice(0, 10),
            ),
          });
      },
    },
  };
}
