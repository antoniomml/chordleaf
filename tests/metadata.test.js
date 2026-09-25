import assert from "node:assert/strict";
import test from "node:test";
import { buildJsonLd, buildSitemap } from "../build/metadata.js";

const origin = "https://chordleaf.com";

test("sitemap keeps canonical locales with lastmod and hreflang alternates", () => {
  const sitemap = buildSitemap(origin, "2026-09-25");
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.ok(
    sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'),
    "xhtml namespace for hreflang alternates",
  );
  const entries = sitemap.match(/<url>.*?<\/url>/gs) ?? [];
  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((entry) => entry.match(/<loc>([^<]+)<\/loc>/)?.[1]),
    [`${origin}/`, `${origin}/es/`],
    "/ stays canonical English and /es/ is the Spanish route",
  );
  for (const entry of entries) {
    assert.ok(entry.includes("<lastmod>2026-09-25</lastmod>"));
    for (const [hreflang, href] of [
      ["en", `${origin}/`],
      ["es", `${origin}/es/`],
      ["x-default", `${origin}/`],
    ])
      assert.ok(
        entry.includes(
          `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`,
        ),
        `alternate ${hreflang}`,
      );
  }
});

test("JSON-LD describes a free bilingual MusicApplication and the site", () => {
  for (const [locale, url] of [
    ["en", `${origin}/`],
    ["es", `${origin}/es/`],
  ]) {
    const json = buildJsonLd(origin, locale);
    assert.ok(!json.includes("aggregateRating"), "no invented ratings");
    const graph = JSON.parse(json);
    assert.equal(graph["@context"], "https://schema.org");
    const [application, website] = graph["@graph"];
    assert.equal(application["@type"], "SoftwareApplication");
    assert.equal(application.applicationCategory, "MusicApplication");
    assert.equal(application.url, url);
    assert.equal(application.operatingSystem, "Any");
    assert.deepEqual(application.inLanguage, ["es", "en"]);
    assert.equal(application.offers.price, 0);
    assert.equal(application.isAccessibleForFree, true);
    assert.ok(application.featureList.length >= 5);
    assert.deepEqual(application.screenshot, [`${origin}/social-preview.png`]);
    assert.equal(website["@type"], "WebSite");
    assert.equal(website.url, `${origin}/`);
    assert.deepEqual(website.inLanguage, ["es", "en"]);
    assert.equal(typeof website.description, "string");
  }
});
