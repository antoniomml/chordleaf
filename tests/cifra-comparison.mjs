// Optional live regression: CHORDLEAF_URL=http://127.0.0.1:5180 node tests/cifra-comparison.mjs
// Only aggregate diagnostics are printed; downloaded song text is not committed.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  const report = await page.evaluate(async () => {
    const { parseWebSong } = await import("/src/web-import.js");
    const { parseSong, fingerings, chordRE } = await import("/src/music.js");
    const url =
      "https://www.cifraclub.com/gilbert-osullivan/alone-again-naturally/";
    const response = await fetch(
      `/api/import-web?url=${encodeURIComponent(url)}`,
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    const source = new DOMParser()
      .parseFromString(data.html, "text/html")
      .querySelector("pre[data-chord-content], pre");
    const expected = [...source.querySelectorAll("b")].map((b) =>
      b.textContent.trim(),
    );
    const song = parseWebSong(data.html, url);
    const actual = [...song.text.matchAll(/\[([^\]]+)\]/g)]
      .map((m) => m[1])
      .filter((c) => chordRE.test(c));
    const unsupported = [...new Set(expected)].filter(
      (c) => !chordRE.test(c) || !fingerings(c).length,
    );
    const lines = parseSong(song.text);
    // The source markup specifies every chord independently of our chord parser.
    // Removing those nodes yields the unchanged lyrics/section labels.
    for (const b of source.querySelectorAll("b")) b.replaceWith("");
    const clean = (text) =>
      text
        .split("\n")
        .map((s) => s.trim().replace(/\s+/g, " "))
        .filter(Boolean);
    const expectedLyrics = clean(source.textContent);
    const actualLyrics = clean(lines.map((l) => l.lyric || "").join("\n"));
    return {
      expectedCount: expected.length,
      actualCount: actual.length,
      sameOrder: JSON.stringify(expected) === JSON.stringify(actual),
      unsupported,
      lyricsIntact:
        JSON.stringify(expectedLyrics) === JSON.stringify(actualLyrics),
      expectedLines: expectedLyrics.length,
      actualLines: actualLyrics.length,
    };
  });
  assert.ok(report.expectedCount > 100);
  assert.equal(report.actualCount, report.expectedCount);
  assert.equal(report.sameOrder, true);
  assert.deepEqual(report.unsupported, []);
  assert.equal(report.lyricsIntact, true);
  console.log("Cifra Club comparison passed:", report);
} finally {
  await browser.close();
}
