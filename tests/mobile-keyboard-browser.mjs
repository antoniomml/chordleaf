// A synthetic visual viewport catches layout regressions in CI. Actual iOS
// keyboard behavior is additionally verified on the physical iPhone.
import { chromium, webkit, devices, expect } from "@playwright/test";
import assert from "node:assert/strict";

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      ...devices["iPhone 14 Pro"],
      locale: "es-ES",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const originalHeight = visualViewport.height;
      window.testKeyboardHeight = originalHeight;
      Object.defineProperty(visualViewport, "height", {
        get: () => window.testKeyboardHeight,
      });
      window.testViewportTop = 0;
      Object.defineProperty(visualViewport, "offsetTop", {
        get: () => window.testViewportTop,
      });
    });
    await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
    // The first import also needs usable bounds before a song exists.
    await page.locator("#empty-new").click();
    await page.locator("#web").click();
    await page.evaluate(() => {
      window.testKeyboardHeight = 365;
      visualViewport.dispatchEvent(new Event("resize"));
    });
    const dialog = page.locator("#new-dialog");
    let box = await dialog.boundingBox();
    assert.ok(box.y >= 15 && box.y + box.height <= 350);
    await page.locator("#web-url").fill("https://example.com/song");
    await page.locator("#web-submit").click({ trial: true });
    box = await page.locator("#web-submit").boundingBox();
    assert.ok(box.height >= 44 && box.y >= 16 && box.y + box.height <= 349);
    // Safari's focus pan can move the visible origin even with a fixed body.
    await page.evaluate(() => {
      window.testViewportTop = 73;
      visualViewport.dispatchEvent(new Event("scroll"));
    });
    box = await dialog.boundingBox();
    assert.ok(box.y >= 89 && box.y + box.height <= 423);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await page.evaluate(() => {
      window.testKeyboardHeight = 695;
      window.testViewportTop = 0;
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.locator("#empty-new").click();
    await page.locator("#blank").click();
    await page.evaluate(() => {
      window.testKeyboardHeight = 365;
      visualViewport.dispatchEvent(new Event("resize"));
      window.scrollTo(0, 73);
    });
    assert.equal(await page.evaluate(() => scrollY), 0);
    await page.locator("#artist").fill("Demo artist");
    await page.evaluate(() => {
      window.testViewportTop = 185;
      visualViewport.dispatchEvent(new Event("scroll"));
    });
    box = await page.locator(".topbar").boundingBox();
    assert.equal(box.y, 185);
    box = await page.locator(".rail").boundingBox();
    assert.ok(box.y >= 185 && box.y + box.height <= 550);
    await page.evaluate(() => {
      window.testViewportTop = 0;
      visualViewport.dispatchEvent(new Event("scroll"));
    });
    box = await page.locator(".rail").boundingBox();
    assert.ok(box.y >= 0 && box.y + box.height <= 365);
    box = await page.locator("#artist").boundingBox();
    assert.ok(box.y >= 96 && box.y + box.height <= 305);
    await page.locator('.rail [data-mobile-view="edit"]').click();
    await page.locator("#source").fill("[C]An original test line");
    box = await page.locator("#source").boundingBox();
    assert.ok(box.height >= 44 && box.y >= 96 && box.y + box.height <= 305);
    await page
      .locator("#source")
      .fill(
        Array.from({ length: 30 }, (_, i) => `[C]Original line ${i + 1}`).join(
          "\n",
        ),
      );
    await page.evaluate(() => {
      window.testKeyboardHeight = 365;
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await expect(page.locator(".source-help")).not.toBeVisible();
    await page.waitForFunction(
      () => document.querySelector("#source").scrollTop > 0,
    );
    const validHeight = await page.evaluate(() =>
      document.documentElement.style.getPropertyValue(
        "--visual-viewport-height",
      ),
    );
    await page.evaluate(() => {
      window.testKeyboardHeight = -9;
      visualViewport.dispatchEvent(new Event("resize"));
    });
    assert.equal(
      await page.evaluate(() =>
        document.documentElement.style.getPropertyValue(
          "--visual-viewport-height",
        ),
      ),
      validHeight,
    );
    // Landscape on the physical iPhone is 852px wide: it still needs the
    // mobile rail, one panel and usable text controls, rather than desktop UI.
    await page.setViewportSize({ width: 852, height: 283 });
    await page.evaluate(() => {
      window.testKeyboardHeight = 283;
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.locator('.rail [data-mobile-view="document"]').click();
    await expect(page.locator("#title")).toBeVisible();
    await expect(page.locator("#source")).not.toBeVisible();
    await expect(page.locator(".preview-panel")).not.toBeVisible();
    box = await page.locator(".rail").boundingBox();
    assert.ok(box.width === 852 && box.y + box.height <= 283);
    assert.equal(
      await page
        .locator("#title")
        .evaluate((e) => getComputedStyle(e).fontSize),
      "16px",
    );
    await page.locator('.rail [data-mobile-view="edit"]').click();
    await expect(page.locator("#source")).toBeVisible();
    await expect(page.locator("#title")).not.toBeVisible();
    box = await page.locator("#source").boundingBox();
    assert.ok(
      box.height >= 44 && box.y >= 88 && box.y + box.height <= 231,
      JSON.stringify(box),
    );
    const desktop = await browser.newPage({
      viewport: { width: 852, height: 283 },
    });
    await desktop.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
    await desktop.locator("#empty-new").click();
    await desktop.locator("#blank").click();
    await expect(desktop.locator(".preview-panel")).toBeVisible();
    const desktopRail = await desktop.locator(".rail").boundingBox();
    assert.ok(desktopRail.width < 100);
    await desktop.close();
    assert.deepEqual(errors, []);
    console.log(
      `${engine.name()}: workspace and first-import dialog remain usable above a 365px visual viewport`,
    );
  } finally {
    await browser.close();
  }
}
