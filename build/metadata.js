import { introHtml } from "../src/ui/intro-copy.js";

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
  const alternates = [
    `<xhtml:link rel="alternate" hreflang="en" href="${origin}/"/>`,
    `<xhtml:link rel="alternate" hreflang="es" href="${origin}/es/"/>`,
    `<xhtml:link rel="alternate" hreflang="x-default" href="${origin}/"/>`,
  ].join("");
  const urls = ["", "es/"]
    .map(
      (path) =>
        `<url><loc>${origin}/${path}</loc><lastmod>${lastmod}</lastmod>${alternates}</url>`,
    )
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
