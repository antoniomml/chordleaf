import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const origin = "https://chordleaf.com";
const image = `${origin}/social-preview.png`;
const read = (name) =>
  readFile(new URL(`../dist/${name}`, import.meta.url), "utf8");
const [root, english, spanish, robots, sitemap] = await Promise.all([
  read("index.html"),
  read("en/index.html"),
  read("es/index.html"),
  read("robots.txt"),
  read("sitemap.xml"),
]);

// Expectations are duplicated on purpose: this script is the independent SEO
// safety net, so it must not import the strings it is meant to verify.
const expected = {
  en: {
    title: "Chordleaf — Lyrics &amp; Guitar Chords Editor | Free PDF Sheets",
    description:
      "Write lyrics and chords, explore guitar shapes, transpose songs and export rehearsal sheets as PDF, Word or text. Free browser workspace in English and Spanish.",
    heading: "Chordleaf — Lyrics &amp; Guitar Chords Editor",
    imageAlt:
      "Chordleaf social card: a song sheet with lyrics, guitar chord positions and the Chordleaf logo.",
    locale: "en_US",
    featureCopy: "Write your way",
  },
  es: {
    title: "Chordleaf — Editor de letras y acordes | Hojas PDF gratis",
    description:
      "Escribe letras y acordes, explora posiciones de guitarra, transporta canciones y exporta hojas de ensayo en PDF, Word o texto. Gratis, en español e inglés.",
    heading: "Chordleaf — Editor de letras y acordes",
    imageAlt:
      "Tarjeta social de Chordleaf: una hoja con letra, acordes de guitarra y el logotipo de Chordleaf.",
    locale: "es_ES",
    featureCopy: "Escribe a tu manera",
  },
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Meta tags may be printed across several lines, so compare attribute pairs
// inside each tag instead of joining the whole tag into one string.
const hasMeta = (html, attribute, value) => {
  const [key, name] = attribute.split("=");
  return (html.match(/<meta\b[^>]*>/gs) ?? []).some(
    (tag) =>
      new RegExp(`${key}=${escapeRegExp(name)}`).test(tag) &&
      new RegExp(`content="${escapeRegExp(value)}"`).test(tag),
  );
};

for (const [name, html, lang, canonical] of [
  ["root index", root, "en", `${origin}/`],
  ["/en/ index", english, "en", `${origin}/`],
  ["/es/ index", spanish, "es", `${origin}/es/`],
]) {
  const e = expected[lang];
  assert.ok(html.includes(`<html lang="${lang}">`), `${name}: html lang`);
  assert.ok(
    html.includes(`<title>${e.title}</title>`),
    `${name}: keyword-first title`,
  );
  assert.ok(
    html.includes(`<h1>${e.heading}</h1>`),
    `${name}: keyword-first H1`,
  );
  assert.ok(
    hasMeta(html, 'name="description"', e.description),
    `${name}: description`,
  );
  assert.ok(
    html.includes(`<link rel="canonical" href="${canonical}">`),
    `${name}: canonical`,
  );
  for (const [hreflang, href] of [
    ["en", `${origin}/`],
    ["es", `${origin}/es/`],
    ["x-default", `${origin}/`],
  ])
    assert.ok(
      html.includes(
        `<link rel="alternate" hreflang="${hreflang}" href="${href}">`,
      ),
      `${name}: hreflang ${hreflang}`,
    );
  assert.ok(hasMeta(html, 'property="og:url"', canonical), `${name}: og:url`);
  assert.ok(
    hasMeta(html, 'property="og:locale"', e.locale),
    `${name}: og:locale`,
  );
  assert.ok(hasMeta(html, 'property="og:title"', e.title), `${name}: og:title`);
  assert.ok(
    hasMeta(html, 'property="og:description"', e.description),
    `${name}: og:description`,
  );
  assert.ok(
    hasMeta(html, 'property="og:site_name"', "Chordleaf"),
    `${name}: og:site_name`,
  );
  assert.ok(hasMeta(html, 'property="og:image"', image), `${name}: og:image`);
  assert.ok(
    hasMeta(html, 'property="og:image:type"', "image/png"),
    `${name}: og:image:type`,
  );
  assert.ok(
    hasMeta(html, 'property="og:image:alt"', e.imageAlt),
    `${name}: og:image:alt`,
  );
  assert.ok(
    hasMeta(html, 'property="og:image:width"', "1200"),
    `${name}: og:image:width`,
  );
  assert.ok(
    hasMeta(html, 'property="og:image:height"', "630"),
    `${name}: og:image:height`,
  );
  assert.ok(
    hasMeta(html, 'name="twitter:card"', "summary_large_image"),
    `${name}: twitter:card`,
  );
  assert.ok(
    hasMeta(html, 'name="twitter:title"', e.title),
    `${name}: twitter:title`,
  );
  assert.ok(
    hasMeta(html, 'name="twitter:description"', e.description),
    `${name}: twitter:description`,
  );
  assert.ok(
    hasMeta(html, 'name="twitter:image"', image),
    `${name}: twitter:image`,
  );
  assert.ok(
    hasMeta(html, 'name="twitter:image:alt"', e.imageAlt),
    `${name}: twitter:image:alt`,
  );
  assert.ok(html.includes(e.featureCopy), `${name}: crawlable intro features`);
  assert.ok(!html.includes("aggregateRating"), `${name}: no fake ratings`);

  const match = html.match(
    /<script type="application\/ld\+json">(.*?)<\/script>/s,
  );
  assert.ok(match, `${name}: JSON-LD script`);
  const jsonLd = JSON.parse(match[1]);
  assert.equal(
    jsonLd["@context"],
    "https://schema.org",
    `${name}: JSON-LD context`,
  );
  const nodes = jsonLd["@graph"] ?? [];
  const application = nodes.find(
    (node) => node["@type"] === "SoftwareApplication",
  );
  const website = nodes.find((node) => node["@type"] === "WebSite");
  assert.ok(application, `${name}: SoftwareApplication JSON-LD`);
  assert.ok(website, `${name}: WebSite JSON-LD`);
  assert.equal(website.url, `${origin}/`, `${name}: WebSite url`);
  assert.deepEqual(
    website.inLanguage,
    ["es", "en"],
    `${name}: WebSite inLanguage`,
  );
  assert.equal(
    website.description,
    e.description,
    `${name}: WebSite description`,
  );
  assert.equal(
    application.applicationCategory,
    "MusicApplication",
    `${name}: MusicApplication`,
  );
  assert.equal(application.url, canonical, `${name}: application url`);
  assert.equal(application.operatingSystem, "Any", `${name}: OS`);
  assert.deepEqual(
    application.inLanguage,
    ["es", "en"],
    `${name}: application inLanguage`,
  );
  assert.equal(application.offers.price, 0, `${name}: free offer`);
  assert.ok(
    Array.isArray(application.featureList) &&
      application.featureList.length >= 4,
    `${name}: featureList`,
  );
  assert.deepEqual(application.screenshot, [image], `${name}: screenshot`);
  assert.ok(
    !("aggregateRating" in application),
    `${name}: no invented aggregateRating`,
  );
}

assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`), "robots sitemap");
assert.ok(
  sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
  "sitemap XML declaration",
);
assert.ok(
  sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'),
  "sitemap xhtml namespace",
);
const urls = sitemap.match(/<url>.*?<\/url>/gs) ?? [];
assert.equal(urls.length, 2, "sitemap url count");
for (const entry of urls) {
  assert.match(
    entry,
    /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/,
    "sitemap lastmod",
  );
  assert.ok(
    entry.includes(
      `<xhtml:link rel="alternate" hreflang="en" href="${origin}/"/>`,
    ),
    "sitemap en alternate",
  );
  assert.ok(
    entry.includes(
      `<xhtml:link rel="alternate" hreflang="es" href="${origin}/es/"/>`,
    ),
    "sitemap es alternate",
  );
  assert.ok(
    entry.includes(
      `<xhtml:link rel="alternate" hreflang="x-default" href="${origin}/"/>`,
    ),
    "sitemap x-default alternate",
  );
}
assert.deepEqual(
  urls.map((entry) => entry.match(/<loc>([^<]+)<\/loc>/)?.[1]),
  [`${origin}/`, `${origin}/es/`],
  "sitemap canonical URLs",
);
const lastmod = sitemap.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1];
const lastmodTime = Date.parse(`${lastmod}T00:00:00Z`);
assert.ok(Number.isFinite(lastmodTime), "sitemap lastmod is a real date");
assert.ok(
  lastmodTime <= Date.now() + 24 * 60 * 60 * 1000,
  "sitemap lastmod is not in the future",
);

const preview = await stat(
  new URL("../dist/social-preview.png", import.meta.url),
);
assert.ok(preview.size > 0, "social preview exists");
assert.ok(
  preview.size < 40 * 1024,
  `social-preview.png must stay under 40 KB (got ${preview.size} bytes)`,
);

console.log("Production metadata, JSON-LD, social tags and sitemap passed");
