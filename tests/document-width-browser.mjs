import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const url = process.env.CHORDLEAF_URL || "http://localhost:5173";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1920, height: 1080 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.locator("#example-song").click();
  await expect(page.locator(".page-shell").first()).toBeVisible();
  async function expectWidth(multiplier = 1, gutter = 64) {
    await expect
      .poll(() =>
        page.evaluate(
          ({ multiplier, gutter }) => {
            const width = document
              .querySelector(".page-shell")
              .getBoundingClientRect().width;
            const available =
              document.querySelector("#pages-scroll").clientWidth - gutter;
            return Math.abs(width - available * multiplier);
          },
          { multiplier, gutter },
        ),
      )
      .toBeLessThan(2);
  }
  await expect
    .poll(
      async () =>
        (await page.locator(".page-shell").first().boundingBox()).width,
    )
    .toBeCloseTo((595.28 * 4) / 3, 0);
  await page.screenshot({ path: "artifacts/document-default-width.png" });
  await page.locator("#zoom-reset").click();
  await expectWidth();
  const original = await page.locator(".page-shell").first().boundingBox();
  await page.locator("#panel-splitter").focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowLeft");
  await expectWidth();
  const wider = await page.locator(".page-shell").first().boundingBox();
  assert.ok(
    wider.width > original.width + 50,
    "shrinking the editor enlarges the document",
  );
  assert.ok(
    wider.width > 1000,
    "width fitting can enlarge the page beyond the previous scale cap",
  );
  await page.locator("#zoom-in").click();
  await expectWidth(1.1);
  await page.locator("#zoom-reset").click();
  await expectWidth();
  // Geometry changes without a window resize still update width fitting.
  await page
    .locator(".workspace")
    .evaluate((el) => el.style.setProperty("--editor-width", "700px"));
  await expectWidth();
  await page.screenshot({ path: "artifacts/document-fill-width.png" });
  // A fresh import resets explicit fill-width zoom to the readable A4 default.
  await page.locator("#new").click();
  await page.locator("#import").click();
  await page.locator("#file").setInputFiles({
    name: "Ancho.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("{title: Ancho}\n[C]Una canción"),
  });
  await expect(page.locator("#new-dialog")).not.toBeVisible();
  await expect
    .poll(
      async () =>
        (await page.locator(".page-shell").first().boundingBox()).width,
    )
    .toBeCloseTo((595.28 * 4) / 3, 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.rail [data-mobile-view="preview"]').click();
  await page.locator("#zoom-reset").click();
  await expectWidth(1, 24);
  assert.deepEqual(errors, []);
  console.log(
    "Document width fitting follows panel and viewport changes, exceeds the old scale cap, and preserves manual zoom and mobile fitting.",
  );
} finally {
  await browser.close();
}
