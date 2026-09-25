import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const origin = "https://chordleaf.com";
const image = `${origin}/social-preview.png`;
const read = (name) =>
  readFile(new URL(`../dist/${name}`, import.meta.url), "utf8");
const exists = async (name) => {
  try {
    return (await stat(new URL(`../dist/${name}`, import.meta.url))).isFile();
  } catch {
    return false;
  }
};
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
const decodeEntities = (value) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
const metaContent = (html, attribute) => {
  const [key, name] = attribute.split("=");
  const tag = (html.match(/<meta\b[^>]*>/gs) ?? []).find(
    (candidate) =>
      new RegExp(`${key}=${escapeRegExp(name)}`).test(candidate) &&
      /content="/.test(candidate),
  );
  return tag
    ? decodeEntities(tag.match(/content="([^"]*)"/s)?.[1] ?? "")
    : null;
};
const titleOf = (html) =>
  decodeEntities(html.match(/<title>(.*?)<\/title>/s)?.[1] ?? "");
const bodyText = (html) =>
  html
    .slice(html.indexOf("<body>"))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, " ");
const wordCount = (html) =>
  bodyText(html)
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

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

/**
 * Content pages, declared as ES/EN slug pairs. Every page is checked for
 * metadata, reciprocal hreflang inside the pair, structured data, footer
 * navigation, escaping and a minimum of useful copy. `fileFor` derives the
 * dist path from the URL so this list and the sitemap cannot drift apart.
 */
const contentPairs = [
  ["chord-sheet-maker", "editor-de-acordes"],
  ["printable-chord-sheets", "hoja-de-acordes-para-imprimir"],
  ["transpose-chords", "transportar-acordes"],
  ["import-ultimate-guitar", "importar-cifra-club"],
  ["privacy", "privacidad"],
  ["import-policy", "politica-de-importacion"],
  ["guide", "guia"],
].map(([en, es]) => ({
  en: { url: `${origin}/en/${en}/` },
  es: { url: `${origin}/es/${es}/` },
}));
const fileFor = (url) =>
  `${new URL(url).pathname.replace(/^\//, "")}index.html`;
const ctaFor = (locale) =>
  locale === "en"
    ? { text: "Open the editor", href: "/" }
    : { text: "Abrir el editor", href: "/es/" };
const footerFor = (locale) => [
  locale === "en" ? "/en/guide/" : "/es/guia/",
  locale === "en" ? "/en/privacy/" : "/es/privacidad/",
  locale === "en" ? "/en/import-policy/" : "/es/politica-de-importacion/",
  "CHANGELOG.md",
  "github.com/antoniomml/chordleaf",
];

const titles = new Set();
const descriptions = new Set();
const internalLinks = new Set();
for (const pair of contentPairs) {
  const en = pair.en;
  const es = pair.es;
  assert.ok(await exists(fileFor(en.url)), `missing ${en.url}`);
  assert.ok(await exists(fileFor(es.url)), `missing ${es.url}`);
  for (const [locale, page, counterpart] of [
    ["en", en, es],
    ["es", es, en],
  ]) {
    const name = page.url;
    const html = await read(fileFor(page.url));
    const otherLocale = locale === "en" ? "es" : "en";
    const cta = ctaFor(locale);

    assert.ok(html.startsWith("<!doctype html>"), `${name}: doctype`);
    assert.ok(html.includes(`<html lang="${locale}">`), `${name}: html lang`);
    assert.equal(
      (html.match(/<h1[\s>]/g) ?? []).length,
      1,
      `${name}: exactly one h1`,
    );
    const title = titleOf(html);
    assert.ok(
      title.length >= 15 && title.length <= 75,
      `${name}: title length (${title.length})`,
    );
    assert.ok(!titles.has(title), `${name}: unique title`);
    titles.add(title);
    const description = metaContent(html, 'name="description"');
    assert.ok(
      description && description.length >= 60 && description.length <= 170,
      `${name}: description length (${description?.length})`,
    );
    assert.ok(!descriptions.has(description), `${name}: unique description`);
    descriptions.add(description);
    for (const [attribute, value] of [
      ['property="og:title"', title],
      ['property="og:description"', description],
      ['name="twitter:title"', title],
      ['name="twitter:description"', description],
    ])
      assert.equal(
        metaContent(html, attribute),
        value,
        `${name}: ${attribute}`,
      );
    assert.equal(
      metaContent(html, 'property="og:type"'),
      "article",
      `${name}: og:type`,
    );
    assert.equal(
      metaContent(html, 'property="og:site_name"'),
      "Chordleaf",
      `${name}: og:site_name`,
    );
    assert.equal(
      metaContent(html, 'property="og:locale"'),
      locale === "en" ? "en_US" : "es_ES",
      `${name}: og:locale`,
    );
    assert.ok(
      html.includes(`<link rel="canonical" href="${page.url}">`),
      `${name}: canonical`,
    );
    assert.ok(hasMeta(html, 'property="og:url"', page.url), `${name}: og:url`);
    for (const [hreflang, href] of [
      ["en", en.url],
      ["es", es.url],
      ["x-default", en.url],
    ])
      assert.ok(
        html.includes(
          `<link rel="alternate" hreflang="${hreflang}" href="${href}">`,
        ),
        `${name}: hreflang ${hreflang}`,
      );
    assert.ok(
      html.includes(
        `<a class="content-lang" href="${counterpart.url}" hreflang="${otherLocale}" lang="${otherLocale}">`,
      ),
      `${name}: language switch`,
    );
    assert.ok(hasMeta(html, 'property="og:image"', image), `${name}: og:image`);
    assert.ok(
      hasMeta(html, 'property="og:image:type"', "image/png"),
      `${name}: og:image:type`,
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
      hasMeta(html, 'name="twitter:image"', image),
      `${name}: twitter:image`,
    );
    const imageAlt =
      metaContent(html, 'property="og:image:alt"') ??
      metaContent(html, 'name="twitter:image:alt"');
    assert.ok(imageAlt && imageAlt.length >= 20, `${name}: social image alt`);

    // Only the FAQ/WebPage JSON-LD script may appear; no inline handlers.
    const scripts = html.match(/<script\b[^>]*>/g) ?? [];
    assert.equal(scripts.length, 1, `${name}: only the JSON-LD script`);
    assert.equal(
      scripts[0],
      '<script type="application/ld+json">',
      `${name}: JSON-LD script tag`,
    );
    assert.ok(!/<script[^>]*\bsrc=/.test(html), `${name}: no external scripts`);
    assert.ok(
      !/\son[a-z]+\s*=/i.test(html.replace(/<script[\s\S]*?<\/script>/gi, "")),
      `${name}: no inline event handlers`,
    );
    assert.ok(!html.includes("<iframe"), `${name}: no iframes`);
    const jsonLd = JSON.parse(
      html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1],
    );
    assert.equal(
      jsonLd["@context"],
      "https://schema.org",
      `${name}: JSON-LD context`,
    );
    const pageNode = (jsonLd["@graph"] ?? []).find(
      (node) => node["@type"] === "WebPage",
    );
    const faqNode = (jsonLd["@graph"] ?? []).find(
      (node) => node["@type"] === "FAQPage",
    );
    assert.ok(pageNode, `${name}: WebPage JSON-LD`);
    assert.ok(faqNode, `${name}: FAQPage JSON-LD`);
    assert.equal(pageNode.url, page.url, `${name}: WebPage url`);
    assert.equal(pageNode.name, title, `${name}: WebPage name`);
    assert.equal(pageNode.inLanguage, locale, `${name}: WebPage inLanguage`);
    assert.equal(
      pageNode.isPartOf?.url,
      `${origin}/`,
      `${name}: WebPage isPartOf`,
    );
    assert.ok(
      faqNode.mainEntity.length >= 3 && faqNode.mainEntity.length <= 4,
      `${name}: FAQ has 3-4 questions`,
    );
    for (const question of faqNode.mainEntity) {
      assert.equal(question["@type"], "Question", `${name}: FAQ question`);
      assert.ok(
        question.name && question.acceptedAnswer?.text,
        `${name}: FAQ answer`,
      );
    }
    assert.ok(!html.includes("aggregateRating"), `${name}: no fake ratings`);

    // A real screenshot, a repeated CTA and the footer navigation.
    assert.ok(
      html.includes('src="/images/editor-workspace.png"'),
      `${name}: real screenshot`,
    );
    const figure = html.match(
      /<img\s+src="\/images\/editor-workspace\.png"\s+alt="([^"]+)"/,
    );
    assert.ok(figure && figure[1].length >= 20, `${name}: screenshot alt`);
    const ctaMatches =
      html.match(/<a class="content-cta" href="([^"]+)">([^<]+)<\/a>/g) ?? [];
    assert.ok(ctaMatches.length >= 2, `${name}: CTA repeated`);
    for (const match of ctaMatches)
      assert.ok(
        match.includes(`href="${cta.href}"`) && match.includes(cta.text),
        `${name}: CTA copy and target`,
      );
    for (const target of footerFor(locale))
      assert.ok(html.includes(target), `${name}: footer link ${target}`);
    assert.ok(
      html.includes(
        'href="https://github.com/antoniomml/chordleaf/blob/main/CHANGELOG.md"',
      ),
      `${name}: changelog link`,
    );
    assert.ok(
      html.includes('href="https://github.com/antoniomml/chordleaf"'),
      `${name}: GitHub link`,
    );

    // Useful copy, escaped text and resolvable internal links.
    const words = wordCount(html);
    assert.ok(words >= 600, `${name}: at least 600 words (got ${words})`);
    const text = bodyText(html);
    assert.ok(!text.includes("<"), `${name}: no unescaped < in text`);
    assert.ok(
      !/&(?!(?:amp|lt|gt|quot|#39|nbsp);)/.test(text),
      `${name}: no unescaped & in text`,
    );
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^https?:/.test(href) || href.startsWith("#")) continue;
      assert.ok(href.startsWith("/"), `${name}: relative link ${href}`);
      internalLinks.add(href.endsWith("/") ? `${href}index.html` : href);
    }
  }
}

// Every internal link on a content page must resolve inside dist/.
for (const href of internalLinks) {
  const file = href.slice(1);
  assert.ok(await exists(file), `internal link target missing: ${href}`);
}
assert.ok(
  await exists("images/editor-workspace.png"),
  "workspace screenshot copied to dist",
);
assert.ok(await exists("content-pages.css"), "content pages stylesheet");

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
const entries = new Map(
  urls.map((entry) => [entry.match(/<loc>([^<]+)<\/loc>/)?.[1], entry]),
);
const sitePair = { en: `${origin}/`, es: `${origin}/es/` };
const expectedUrls = [
  sitePair.en,
  sitePair.es,
  ...contentPairs.flatMap((pair) => [pair.en.url, pair.es.url]),
];
assert.deepEqual(
  [...entries.keys()],
  expectedUrls,
  "sitemap canonical URLs in order",
);
for (const [index, url] of expectedUrls.entries()) {
  const entry = entries.get(url);
  assert.ok(entry, `sitemap entry for ${url}`);
  assert.match(
    entry,
    /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/,
    "sitemap lastmod",
  );
  const pair =
    index < 2
      ? sitePair
      : {
          en: contentPairs[Math.floor((index - 2) / 2)].en.url,
          es: contentPairs[Math.floor((index - 2) / 2)].es.url,
        };
  for (const [hreflang, href] of [
    ["en", pair.en],
    ["es", pair.es],
    ["x-default", pair.en],
  ])
    assert.ok(
      entry.includes(
        `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`,
      ),
      `sitemap ${url}: ${hreflang} alternate`,
    );
}
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

console.log(
  "Production metadata, content pages, JSON-LD, social tags and sitemap passed",
);
