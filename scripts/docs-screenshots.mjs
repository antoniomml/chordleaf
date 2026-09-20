// Public documentation uses only the built-in, original demo song.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir(new URL("../docs/images/", import.meta.url), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto(process.env.CHORDI_URL || "http://localhost:5173");
  await page.locator(".page").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/images/workspace.png" });
  await page.locator("#browse-chords").click();
  await page.locator("#chord-name").fill("Abm7b5");
  await page
    .locator("#chord-library")
    .screenshot({ path: "docs/images/chord-library.png" });
} finally {
  await browser.close();
}
