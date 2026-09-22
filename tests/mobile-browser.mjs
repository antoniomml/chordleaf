import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  locale: "es-ES",
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page.locator("#title").fill("Canción móvil");
  await page.locator("#source").fill("[G]Una canción [D]en el bolsillo");

  const editor = page.locator(".editor-panel");
  const preview = page.locator(".preview-panel");
  const previewTab = page.locator('.rail [data-mobile-view="preview"]');
  assert.equal(await editor.isVisible(), true);
  assert.equal(await preview.isVisible(), false);

  await previewTab.click();
  assert.equal(await editor.isVisible(), false);
  assert.equal(await preview.isVisible(), true);
  assert.equal(await previewTab.getAttribute("aria-current"), "page");
  assert.equal(
    await page.locator(".sheet-header h1").innerText(),
    "CANCIÓN MÓVIL",
  );
  assert.ok(
    (await page.locator(".page-shell").first().boundingBox()).width > 250,
  );
  await page.screenshot({ path: "artifacts/mobile-preview-390.png" });

  await page.locator('[data-section="key"]').click();
  assert.equal(await preview.isVisible(), false);
  assert.equal(await page.locator("#settings").isVisible(), true);
  await page.locator('[data-section="chords"]').click();
  assert.equal(await page.locator("#chords-panel").isVisible(), true);
  await page.locator('[data-section="document"]').click();
  assert.equal(await page.locator("#title").inputValue(), "Canción móvil");
  assert.equal(
    await page.locator("#source").inputValue(),
    "[G]Una canción [D]en el bolsillo",
  );
  await page.screenshot({ path: "artifacts/mobile-editor-390.png" });

  for (const width of [320, 390, 760]) {
    await page.setViewportSize({ width, height: 844 });
    await previewTab.click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `Document overflows at ${width}px`,
    );
    const bounds = await page.locator(".rail").boundingBox();
    assert.equal(Math.round(bounds.width), width);
    assert.equal(Math.round(bounds.y + bounds.height), 844);
    assert.ok(
      (await page.locator(".page-shell").first().boundingBox()).width > 0,
    );
    await page.locator('[data-section="document"]').click();
    assert.equal(await editor.isVisible(), true);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `Editor overflows at ${width}px`,
    );
  }

  await page.setViewportSize({ width: 900, height: 844 });
  assert.equal(await previewTab.isVisible(), false);
  assert.equal(await editor.isVisible(), true);
  assert.equal(await preview.isVisible(), true);
  assert.ok((await editor.boundingBox()).width >= 280);
  assert.deepEqual(errors, []);
  console.log("Mobile workspace navigation passed");
} finally {
  await browser.close();
}
