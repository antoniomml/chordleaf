import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const origin = "https://chordleaf.com";
const read = (name) =>
  readFile(new URL(`../dist/${name}`, import.meta.url), "utf8");
const [root, english, spanish, robots, sitemap] = await Promise.all([
  read("index.html"),
  read("en/index.html"),
  read("es/index.html"),
  read("robots.txt"),
  read("sitemap.xml"),
]);

for (const [html, lang, canonical] of [
  [root, "en", `${origin}/`],
  [english, "en", `${origin}/`],
  [spanish, "es", `${origin}/es/`],
]) {
  assert.ok(html.includes(`<html lang="${lang}">`));
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
  assert.ok(
    html.includes(`<link rel="alternate" hreflang="en" href="${origin}/">`),
  );
  assert.ok(
    html.includes(`<link rel="alternate" hreflang="es" href="${origin}/es/">`),
  );
  assert.ok(html.includes(`<meta property="og:url" content="${canonical}">`));
  assert.ok(
    html.includes(
      `<meta property="og:image" content="${origin}/social-preview.png">`,
    ),
  );
  assert.ok(
    html.includes(lang === "en" ? "Write your way" : "Escribe a tu manera"),
  );
}
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
assert.deepEqual(
  [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]),
  [`${origin}/`, `${origin}/es/`],
);
console.log("Production metadata, locale links and sitemap passed");
