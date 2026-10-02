import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page.locator('.rail [data-desktop-view="edit"]').click();
  const source =
    "[G][D/F#]Luz [Em7]del [Em7]día\n[Cmaj7]a[Dmaj7]b[Am]c\nUna ca[Emaj7]sa [Abm7b5]azul";
  await page.locator("#source").fill(source);
  await page.waitForFunction(
    () => document.querySelectorAll(".sheet-chord").length === 9,
  );
  await page.evaluate(() => document.fonts.ready);
  const geometry = await page.locator(".song-line").evaluateAll((rows) =>
    rows.map((row) =>
      [...row.querySelectorAll(".sheet-chord")].map((mark) => {
        const r = mark.getBoundingClientRect();
        return { x: r.x, right: r.right, y: r.y };
      }),
    ),
  );
  for (const marks of geometry)
    for (let i = 1; i < marks.length; i++) {
      assert.equal(marks[i].y, marks[0].y);
      assert.ok(marks[i].x > marks[i - 1].right);
    }
  assert.equal(await page.locator("#source").inputValue(), source);
  await page.screenshot({ path: "artifacts/chord-spacing.png" });
  await page.locator("#export").click();
  const download = page.waitForEvent("download");
  await page.locator('[data-export="pdf"]').click();
  const pdfPath = "artifacts/chord-spacing.pdf";
  await (await download).saveAs(pdfPath);
  const loading = getDocument({
    data: new Uint8Array(await readFile(pdfPath)),
    useSystemFonts: true,
  });
  const doc = await loading.promise;
  // PDF.js combines adjacent text draws. Expand the monospaced chord runs
  // into tokens so the assertion checks their actual printed geometry.
  const items = (await (await doc.getPage(1)).getTextContent()).items.flatMap(
    (item) => {
      if (
        !item.str
          .trim()
          .split(/\s+/)
          .every((token) =>
            [
              "G",
              "D/F#",
              "Em7",
              "Cmaj7",
              "Dmaj7",
              "Am",
              "Emaj7",
              "Abm7b5",
            ].includes(token),
          )
      )
        return [];
      const cw = item.width / item.str.length;
      return [...item.str.matchAll(/\S+/g)].map((match) => ({
        transform: [
          0,
          0,
          0,
          0,
          item.transform[4] + match.index * cw,
          item.transform[5],
        ],
        width: match[0].length * cw,
      }));
    },
  );
  assert.equal(items.length, 9);
  assert.equal(
    new Set(items.slice(0, 4).map((item) => item.transform[5])).size,
    1,
  );
  for (let i = 1; i < 4; i++)
    assert.ok(
      items[i].transform[4] > items[i - 1].transform[4] + items[i - 1].width,
    );
  await loading.destroy();
  // Direct editing opens lyrics without chord tokens or layout padding.
  await page.locator("#pencil").click();
  await page.locator(".song-line").first().click();
  assert.equal(
    await page.locator(".inline-editor").inputValue(),
    source.split("\n")[0].replace(/\[[^\]]+\]/g, ""),
  );
  console.log(
    "Crowded chords: single row, no visual overlaps, PDF geometry matches, source and direct editing unchanged.",
  );
} finally {
  await browser.close();
}
