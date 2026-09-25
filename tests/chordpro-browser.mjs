import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  locale: "es-ES",
  viewport: { width: 1440, height: 1000 },
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page.locator("#title").fill("Luz");
  await page.locator("#artist").fill("Noche");
  await page.locator('.rail [data-desktop-view="edit"]').click();
  await page.locator("#source").fill("[C]Una ca[G]sa\n[Dm]azul");
  await page.locator('.rail [data-desktop-view="document"]').click();
  await page.locator("#capo-up").click();
  await page.locator("#capo-up").click();
  await page.locator("#export").click();
  const waiting = page.waitForEvent("download");
  await page.locator('[data-export="cho"]').click();
  const download = await waiting;
  const path = "artifacts/chordpro.cho";
  await download.saveAs(path);
  assert.equal(download.suggestedFilename(), "Luz.cho");
  assert.equal(
    await readFile(path, "utf8"),
    "{title: Luz}\n{artist: Noche}\n{capo: 2}\n\n[C]Una ca[G]sa\n[Dm]azul",
  );
  await page.locator("#new").click();
  await page.locator("#file").setInputFiles(path);
  await page.waitForFunction(() => !document.querySelector("#new-dialog").open);
  assert.equal(await page.locator("#title").inputValue(), "Luz");
  assert.equal(await page.locator("#artist").inputValue(), "Noche");
  assert.equal(await page.locator("#capo").inputValue(), "2");
  assert.equal(
    await page.locator("#source").inputValue(),
    "[C]Una ca[G]sa\n[Dm]azul",
  );
  assert.deepEqual(errors, []);
  console.log("ChordPro export and re-import checks passed");
} finally {
  await browser.close();
}
