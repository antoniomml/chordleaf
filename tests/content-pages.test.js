import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContentJsonLd,
  contentPageEntries,
  contentPageUrl,
  contentPagesCss,
  contentPairs,
  renderContentPage,
} from "../build/metadata.js";

const origin = "https://chordleaf.com";

// Pages use lowercase markup: strip script/style by index scan so no tag
// variant can slip past a regular expression.
const withoutElement = (html, tag) => {
  let out = "";
  let index = 0;
  while (index < html.length) {
    const open = html.indexOf(`<${tag}`, index);
    if (open < 0) return out + html.slice(index);
    out += html.slice(index, open);
    const close = html.indexOf(`</${tag}`, open);
    if (close < 0) return out;
    const closeEnd = html.indexOf(">", close);
    index = closeEnd < 0 ? html.length : closeEnd + 1;
  }
  return out;
};
const scriptTags = (html) => {
  const tags = [];
  let index = 0;
  while ((index = html.indexOf("<script", index)) >= 0) {
    const end = html.indexOf(">", index);
    if (end < 0) break;
    tags.push(html.slice(index, end + 1));
    index = end + 1;
  }
  return tags;
};
const bodyWords = (html) =>
  withoutElement(
    withoutElement(html.slice(html.indexOf("<body>")), "script"),
    "style",
  )
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, " ")
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

const render = (entry) =>
  renderContentPage({
    origin,
    locale: entry.locale,
    page: entry.page,
    pair: entry.pair,
    cssHref: "/assets/index-test.css",
  });

test("content page registry is paired, complete and internally consistent", () => {
  assert.equal(contentPairs.length, 7);
  const entries = contentPageEntries();
  assert.equal(entries.length, 14);
  const urls = new Set([
    "/",
    "/es/",
    ...entries.map((entry) => `/${entry.locale}/${entry.page.slug}/`),
  ]);
  const titles = new Set();
  const descriptions = new Set();
  for (const pair of contentPairs) {
    assert.ok(pair.es && pair.en, `${pair.id}: both locales`);
    for (const [locale, page] of [
      ["en", pair.en],
      ["es", pair.es],
    ]) {
      assert.ok(page.slug && page.title && page.description, "page fields");
      assert.ok(!page.slug.includes("/"), "slug has no slashes");
      assert.ok(
        page.faq.length >= 3 && page.faq.length <= 4,
        `${pair.id}/${locale}: 3-4 FAQ`,
      );
      assert.ok(page.sections.length >= 4, `${pair.id}/${locale}: sections`);
      for (const { q, a } of page.faq) assert.ok(q && a, "FAQ copy");
      for (const { href } of page.related)
        assert.ok(urls.has(href), `${pair.id}/${locale}: related ${href}`);
      assert.ok(!titles.has(page.title), "unique title");
      assert.ok(!descriptions.has(page.description), "unique description");
      titles.add(page.title);
      descriptions.add(page.description);
    }
  }
  assert.ok(contentPagesCss.includes("content-main"));
});

test("rendered content pages carry full metadata and useful copy", () => {
  for (const entry of contentPageEntries()) {
    const html = render(entry);
    const url = contentPageUrl(origin, { ...entry.page, locale: entry.locale });
    const pair = entry.pair;
    const other = entry.locale === "es" ? pair.en : pair.es;
    const otherLocale = entry.locale === "es" ? "en" : "es";
    assert.ok(html.startsWith("<!doctype html>"), `${url}: doctype`);
    assert.ok(
      html.includes(`<html lang="${entry.locale}">`),
      `${url}: html lang`,
    );
    assert.ok(
      !html.includes("undefined"),
      `${url}: no unresolved locale interpolation`,
    );
    assert.ok(
      html.includes(`<link rel="canonical" href="${url}">`),
      `${url}: canonical`,
    );
    for (const [hreflang, target] of [
      ["en", contentPageUrl(origin, { ...pair.en, locale: "en" })],
      ["es", contentPageUrl(origin, { ...pair.es, locale: "es" })],
      ["x-default", contentPageUrl(origin, { ...pair.en, locale: "en" })],
    ])
      assert.ok(
        html.includes(
          `<link rel="alternate" hreflang="${hreflang}" href="${target}">`,
        ),
        `${url}: hreflang ${hreflang}`,
      );
    assert.ok(
      html.includes(
        `<a class="content-lang" href="${contentPageUrl(origin, { ...other, locale: otherLocale })}"`,
      ),
      `${url}: language switch`,
    );
    const scripts = scriptTags(html);
    assert.deepEqual(
      scripts,
      ['<script type="application/ld+json">'],
      `${url}: only JSON-LD`,
    );
    const jsonLd = JSON.parse(
      html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1],
    );
    const nodes = jsonLd["@graph"] ?? [];
    const webpage = nodes.find((node) => node["@type"] === "WebPage");
    const faqPage = nodes.find((node) => node["@type"] === "FAQPage");
    assert.equal(webpage.url, url, `${url}: WebPage url`);
    assert.equal(webpage.inLanguage, entry.locale, `${url}: inLanguage`);
    assert.equal(faqPage.mainEntity.length, entry.page.faq.length);
    assert.ok(!html.includes("aggregateRating"), `${url}: no ratings`);
    assert.equal(
      buildContentJsonLd(origin, entry.locale, entry.page, entry.pair).includes(
        "undefined",
      ),
      false,
    );
    assert.ok(bodyWords(html) >= 600, `${url}: at least 600 useful words`);
    assert.ok(
      html.includes('src="/images/editor-workspace.png"'),
      `${url}: real screenshot`,
    );
    for (const [label, href] of entry.locale === "en"
      ? [
          ["Guide", "/en/guide/"],
          ["Privacy", "/en/privacy/"],
          ["Import policy", "/en/import-policy/"],
        ]
      : [
          ["Guía", "/es/guia/"],
          ["Privacidad", "/es/privacidad/"],
          ["Importación", "/es/politica-de-importacion/"],
        ]) {
      assert.ok(
        html.includes(`>${label}</a>`) && html.includes(`href="${href}"`),
        `${url}: footer ${label}`,
      );
    }
    assert.ok(
      html.includes('href="https://github.com/antoniomml/chordleaf"'),
      `${url}: GitHub footer link`,
    );
  }
});
