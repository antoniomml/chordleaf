import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (name) => readFile(new URL(`../${name}`, import.meta.url), "utf8");

test("the mobile viewport opts into the safe areas", async () => {
  const html = await read("index.html");
  assert.match(html, /viewport-fit=cover/);
});

test("the runtime document title matches the SEO titles", async () => {
  const source = await read("src/ui/language.js");
  assert.ok(
    source.includes(
      "Chordleaf — Lyrics & Guitar Chords Editor | Free PDF Sheets",
    ),
  );
  assert.ok(
    source.includes(
      "Chordleaf — Editor de letras y acordes | Hojas PDF gratis",
    ),
  );
  assert.ok(!source.includes("Your music, on paper"));
});
