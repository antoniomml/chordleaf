import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const browser = await chromium.launch();
try {
  for (const locale of ["es", "en"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.startupShifts = [];
      new PerformanceObserver((list) => {
        window.startupShifts.push(
          ...list
            .getEntries()
            .filter((entry) => !entry.hadRecentInput)
            .map((entry) => entry.value),
        );
      }).observe({ type: "layout-shift", buffered: true });
    });
    // Keep the built entry on screen before the application initializes.
    await page.route("**/assets/index-*.js", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await page.goto(
      `${process.env.CHORDLEAF_URL || "http://localhost:5173"}/${locale}/`,
    );
    await page.locator("#empty-new:not([disabled])").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const cls = await page.evaluate(() =>
      window.startupShifts.reduce((sum, value) => sum + value, 0),
    );
    assert.ok(cls < 0.1, `${locale}: startup CLS ${cls}`);
    await context.close();

    const noJS = await browser.newContext({ javaScriptEnabled: false });
    const fallback = await noJS.newPage();
    await fallback.goto(
      `${process.env.CHORDLEAF_URL || "http://localhost:5173"}/${locale}/`,
    );
    assert.equal(await fallback.locator("#empty-state").isVisible(), true);
    assert.equal(await fallback.locator("#empty-new").isDisabled(), true);
    assert.ok(await fallback.locator("noscript").innerText());
    assert.ok((await fallback.locator(".intro-links a:visible").count()) >= 6);
    await noJS.close();
    console.log(
      `${locale}: stable startup (${cls.toFixed(4)}) and readable no-JS entry passed`,
    );
  }
} finally {
  await browser.close();
}
