import { devices, webkit } from "@playwright/test";
import assert from "node:assert/strict";

const browser = await webkit.launch({ headless: true });
const page = await browser.newPage({
  ...devices["iPhone 13"],
  locale: "es-ES",
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

async function checkTextControls() {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("input, textarea, select")]
      .filter(
        (element) => !["checkbox", "radio", "file"].includes(element.type),
      )
      .map((element) => ({
        name: element.id || element.name || element.tagName.toLowerCase(),
        size: parseFloat(getComputedStyle(element).fontSize),
      }))
      .filter(({ size }) => size < 16),
  );
  assert.deepEqual(
    small,
    [],
    "Editable mobile controls must use at least 16px",
  );
}

try {
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await checkTextControls();

  const scale = await page.evaluate(() => visualViewport.scale);
  await page.locator('[data-mobile-view="edit"]').click();
  await page.locator("#source").fill("[C]Texto en el iPhone");
  assert.equal(await page.evaluate(() => visualViewport.scale), scale);
  await page.locator('[data-mobile-view="document"]').click();
  await page.locator("#title").fill("Título móvil");
  assert.equal(await page.evaluate(() => visualViewport.scale), scale);

  await page.locator("#mobile-tab-plus").click();
  await page.locator("#import").click();
  await checkTextControls();
  await page.locator("#import-text").fill("[G]Texto importado");
  assert.equal(await page.evaluate(() => visualViewport.scale), scale);
  await page.locator("#import-back").click();
  await page.locator("#web").click();
  await checkTextControls();
  await page.locator("#web-url").fill("https://www.cifraclub.com/");
  assert.equal(await page.evaluate(() => visualViewport.scale), scale);
  await page.locator("#new-dialog .dialog-close").click();

  await page.locator('[data-mobile-view="music"]').click();
  await page.locator('[data-music-section="chords"]').click();
  await page.locator('[data-harmony-view="search"]').click();
  await checkTextControls();
  await page.locator("#catalog-search").fill("C");
  assert.equal(await page.evaluate(() => visualViewport.scale), scale);

  await page.locator('.rail [data-mobile-view="preview"]').click();
  await page.locator("#pencil").click();
  assert.equal(await page.locator("#editor-dialog").isVisible(), true);
  assert.equal(await page.locator(".inline-editor").count(), 0);
  await checkTextControls();
  assert.equal(await page.evaluate(() => visualViewport.scale), scale);
  await page.locator("#collapse-editor").click();
  assert.equal(await page.locator(".preview-panel").isVisible(), true);

  assert.deepEqual(errors, []);
  console.log("iPhone text controls keep their font size and viewport scale");
} finally {
  await browser.close();
}
