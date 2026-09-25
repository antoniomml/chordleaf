import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

// Regression for the P0-1 crash: `resize` fired with no active song (empty
// workspace, or after closing the last tab) called renderSettings() with
// `song()` undefined. Mobile browsers fire resize when the URL bar moves.
const browser = await chromium.launch({ headless: true });
try {
  for (const profile of [
    {
      name: "desktop",
      options: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile",
      options: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ]) {
    const page = await browser.newPage({
      locale: "es-ES",
      ...profile.options,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
    await page.locator("#empty-new").waitFor();

    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await page.waitForTimeout(150);
    assert.deepEqual(
      errors,
      [],
      `${profile.name}: resize in the empty state must not raise`,
    );

    await page.locator("#empty-new").click();
    await page.locator("#blank").click();
    await page.locator(".tab-close").first().click();
    await page.locator("#confirm-close").click();
    await page.locator("#empty-new").waitFor();

    errors.length = 0;
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await page.waitForTimeout(150);
    assert.deepEqual(
      errors,
      [],
      `${profile.name}: resize after closing the last tab must not raise`,
    );
    await page.close();
  }
  console.log("Empty-state resize checks passed");
} finally {
  await browser.close();
}
