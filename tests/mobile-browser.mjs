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
  assert.equal(
    await page.locator("#document-options-content").isVisible(),
    false,
  );
  await page
    .locator("#source")
    .fill(
      "[G]Una línea muy larga que debe ajustarse al ancho de un teléfono sin desplazamiento horizontal",
    );
  assert.equal(
    await page
      .locator("#source")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
    true,
  );
  await page.locator("#source").fill("[G]Una canción [D]en el bolsillo");
  await page.locator("#document-options-toggle").click();
  assert.equal(
    await page
      .locator("#document-options-toggle")
      .getAttribute("aria-expanded"),
    "true",
  );
  await page.locator('[data-columns="2"]').click();
  assert.equal(
    await page.locator("#document-options-content").isVisible(),
    true,
  );
  await page.locator('[data-columns="1"]').click();
  await page.locator("#document-options-toggle").click();

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
  assert.equal(await page.locator(".preview-footer").isVisible(), false);
  assert.equal(await page.locator("#zoom-reset").innerText(), "↔");
  const initialWidth = (await page.locator(".page-shell").first().boundingBox())
    .width;
  await page.locator("#pages-scroll").evaluate((scroll) => {
    const touch = (id, x) =>
      new Touch({
        identifier: id,
        target: scroll,
        clientX: x,
        clientY: 240,
      });
    scroll.dispatchEvent(
      new TouchEvent("touchstart", {
        bubbles: true,
        touches: [touch(1, 145), touch(2, 245)],
      }),
    );
    scroll.dispatchEvent(
      new TouchEvent("touchmove", {
        bubbles: true,
        cancelable: true,
        touches: [touch(1, 115), touch(2, 275)],
      }),
    );
    scroll.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
  });
  assert.ok(
    (await page.locator(".page-shell").first().boundingBox()).width >
      initialWidth * 1.5,
  );
  await page.locator("#zoom-reset").click();
  assert.ok(
    Math.abs(
      (await page.locator(".page-shell").first().boundingBox()).width -
        initialWidth,
    ) < 1,
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
    for (const id of ["zoom-out", "zoom-reset", "zoom-in", "fit", "pencil"]) {
      const button = await page.locator(`#${id}`).boundingBox();
      assert.ok(button.x >= 0 && button.x + button.width <= width);
      assert.ok(button.height >= 44);
    }
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

  await page.setViewportSize({ width: 320, height: 640 });
  await page.locator('[data-section="chords"]').click();
  await page.locator(".chord-card .edit-shape").first().click();
  const dialogBounds = await page.locator("#shape-dialog").boundingBox();
  for (const button of await page
    .locator("#shape-dialog .dialog-actions button")
    .all()) {
    const bounds = await button.boundingBox();
    assert.ok(bounds.x >= dialogBounds.x);
    assert.ok(bounds.x + bounds.width <= dialogBounds.x + dialogBounds.width);
    assert.ok(bounds.height >= 44);
  }
  await page.locator("#shape-dialog .cancel-shape").click();
  await page.locator("#mobile-tab-plus").click();
  await page.locator("#blank").click();
  await page.locator("#title").fill("Segunda canción");
  const activeTab = await page.locator(".tab.active").boundingBox();
  const tabs = await page.locator("#tabs").boundingBox();
  assert.ok(
    activeTab.x >= tabs.x &&
      activeTab.x + activeTab.width <= tabs.x + tabs.width,
  );

  await page.setViewportSize({ width: 667, height: 375 });
  const sourceBounds = await page.locator("#source").boundingBox();
  const settingsBounds = await page.locator("#settings").boundingBox();
  assert.ok(sourceBounds.x >= settingsBounds.x + settingsBounds.width);
  assert.ok(sourceBounds.height >= 100);

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
