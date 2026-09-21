// Public documentation uses only the built-in, original demo song.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir(new URL("../docs/images/", import.meta.url), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "en-US",
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto(process.env.CHORDI_URL || "http://localhost:5173");
  await page.locator(".page").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/images/workspace.png" });
  await page.locator('[data-section="chords"]').click();
  await page
    .locator(".editor-panel")
    .screenshot({ path: "docs/images/chord-library.png" });
  await page.locator('[data-mode="identify"]').click();
  for (const [string, fret] of [
    [1, 3],
    [2, 2],
    [3, 0],
    [4, 1],
    [5, 0],
  ]) {
    await page
      .locator(
        `[data-string="${string}"][data-fret="${fret === 0 ? -1 : fret}"]`,
      )
      .click();
  }
  await page
    .locator(".editor-panel")
    .screenshot({ path: "docs/images/chord-identifier.png" });
} finally {
  await browser.close();
}
