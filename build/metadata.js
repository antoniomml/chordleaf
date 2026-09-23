const copy = {
  en: {
    title: "Your music, on paper",
    description:
      "Write lyrics and chords, explore guitar shapes, transpose songs and export rehearsal sheets as PDF, Word or text. Free browser workspace in English and Spanish.",
    heading: "Chordleaf — your music, on paper",
    intro:
      "Write lyrics and chords, explore guitar positions, transpose songs and prepare rehearsal sheets.",
    privacy:
      "Import TXT, PDF or Word and export an editable song sheet. Your songs stay in your browser.",
  },
  es: {
    title: "Tu música, en papel",
    description:
      "Escribe letras y acordes, explora posiciones de guitarra, transporta canciones y exporta hojas de ensayo en PDF, Word o texto. Gratis, en español e inglés.",
    heading: "Chordleaf — tu música, en papel",
    intro:
      "Escribe letras y acordes, explora posiciones de guitarra, transporta canciones y prepara hojas de ensayo.",
    privacy:
      "Importa TXT, PDF o Word y exporta una hoja editable. Tus canciones se quedan en tu navegador.",
  },
};
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
              `<title>Chordleaf · ${c.title}</title>`,
            )
            .replace(
              /(<meta\s+name="description"\s+content=")[^"]*(")/s,
              `$1${c.description}$2`,
            )
            .replace(
              /(<meta\s+property="og:title"\s+content=")[^"]*(")/s,
              `$1Chordleaf · ${c.title}$2`,
            )
            .replace(
              /(<meta\s+property="og:description"\s+content=")[^"]*(")/s,
              `$1${c.description}$2`,
            )
            .replace(/<h1>.*?<\/h1>/s, `<h1>${c.heading}</h1>`)
            .replace(/<p>\s*Write lyrics.*?<\/p>/s, `<p>${c.intro}</p>`)
            .replace(/<p>\s*Import TXT.*?<\/p>/s, `<p>${c.privacy}</p>`);
          if (site) {
            const origin = site.origin;
            const tags = `<link rel="canonical" href="${origin}/${locale}/"><link rel="alternate" hreflang="en" href="${origin}/en/"><link rel="alternate" hreflang="es" href="${origin}/es/"><link rel="alternate" hreflang="x-default" href="${origin}/"><meta property="og:url" content="${origin}/${locale}/"><meta property="og:locale" content="${locale === "en" ? "en_US" : "es_ES"}"><meta property="og:image" content="${origin}/social-preview.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`;
            html = html.replace("</head>", tags + "</head>");
          }
          this.emitFile({
            type: "asset",
            fileName: `${locale}/index.html`,
            source: html,
          });
          if (locale === "en")
            index.source = site
              ? html
                  .replace(
                    `<link rel="canonical" href="${site.origin}/en/">`,
                    `<link rel="canonical" href="${site.origin}/">`,
                  )
                  .replace(
                    `<meta property="og:url" content="${site.origin}/en/">`,
                    `<meta property="og:url" content="${site.origin}/">`,
                  )
              : html;
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
            source: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["", "en/", "es/"].map((path) => `<url><loc>${site.origin}/${path}</loc></url>`).join("")}</urlset>`,
          });
      },
    },
  };
}
