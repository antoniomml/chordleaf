import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  assert.equal(await page.locator("#empty-state").isVisible(), true);
  assert.equal(await page.locator(".tab").count(), 0);
  assert.equal(await page.locator(".page").count(), 0);
  async function menu() {
    assert.equal(await page.locator("#new-menu").isVisible(), true);
    for (const selector of [
      "#text-import",
      "#web-import",
      "#import-back",
      "#import-error",
    ])
      assert.equal(await page.locator(selector).isVisible(), false, selector);
  }
  await page.locator("#empty-new").click();
  await menu();
  await page.locator("#web").click();
  assert.equal(await page.locator("#new-menu").isVisible(), false);
  assert.equal(await page.locator("#text-import").isVisible(), false);
  assert.equal(await page.locator("#web-url").isVisible(), true);
  assert.equal(
    await page.locator("#new-heading").textContent(),
    "Importar desde una web.",
  );
  await page.locator("#web-url").fill("https://www.cifraclub.com/a/b/");
  await page.screenshot({ path: "artifacts/new-song-web.png" });
  await page.locator("#import-back").click();
  await menu();
  await page.locator("#import").click();
  assert.equal(await page.locator("#new-menu").isVisible(), false);
  assert.equal(await page.locator("#web-import").isVisible(), false);
  await page.locator("#import-text").fill("[Solo] [C] [G]");
  await page.locator("#paste-import").click();
  await page.locator("#new").click();
  await menu();
  await page.locator("#web").click();
  assert.equal(await page.locator("#web-url").inputValue(), "");
  await page.keyboard.press("Escape");
  await page.locator("#tab-plus").click();
  await menu();
  await page.locator("#web").click();
  await page.route("**/api/import-web?**", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "Error de prueba" }),
    }),
  );
  await page.locator("#web-url").fill("https://www.cifraclub.com/a/b/");
  await page.locator("#web-submit").click();
  await page.locator("#import-error").waitFor({ state: "visible" });
  await page.locator(".dialog-close").click();
  await page.locator("#new").click();
  await menu();
  await page.unroute("**/api/import-web?**");
  // Going back during a download must not create a song in the new screen.
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/import-web?**", async (route) => {
    await gate;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://www.cifraclub.com/a/b/",
        html: "<h1>Prueba</h1><pre>C    G\nLuz del día</pre>",
      }),
    });
  });
  await page.locator("#web").click();
  await page.locator("#web-url").fill("https://www.cifraclub.com/a/b/");
  const request = page.waitForRequest("**/api/import-web?**");
  await page.locator("#web-submit").click();
  await request;
  const before = await page.locator(".tab").count();
  const cancelled = page.waitForEvent("requestfailed", (request) =>
    request.url().includes("/api/import-web?"),
  );
  await page.locator("#import-back").click();
  await menu();
  await cancelled;
  release();
  await page.waitForTimeout(100);
  await menu();
  assert.equal(await page.locator(".tab").count(), before);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#web").click();
  await page.screenshot({ path: "artifacts/new-song-web-mobile.png" });
  assert.ok(
    await page
      .locator("#new-dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  );
  assert.deepEqual(errors, []);
  console.log(
    "New-song screen navigation, reset, cancellation and mobile checks passed",
  );
} finally {
  await browser.close();
}
