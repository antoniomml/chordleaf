import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
try {
  for (const { width, height, locale } of [
    { width: 1440, height: 900, locale: "es-ES" },
    { width: 1024, height: 768, locale: "en-US" },
    { width: 390, height: 844, locale: "es-ES" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, locale });
    await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
    await page.locator("#empty-new").click();
    await page.locator("#blank").click();

    const geometry = await page.evaluate(() => {
      const settings = document
        .querySelector("#settings")
        .getBoundingClientRect();
      const checkbox = document
        .querySelector("#showBrand")
        .getBoundingClientRect();
      const label = document
        .querySelector(".footer-option span")
        .getBoundingClientRect();
      const interval = document
        .querySelector("#transpose-interval")
        .getBoundingClientRect();
      return { settings, checkbox, label, interval };
    });
    assert.ok(geometry.checkbox.width <= 18);
    assert.ok(geometry.label.left >= geometry.checkbox.right);
    assert.ok(geometry.interval.top >= geometry.settings.top);
    assert.ok(geometry.interval.bottom <= geometry.settings.bottom);
    assert.ok(geometry.interval.right <= geometry.settings.right);

    if (width > 760) {
      const editorHeight = await page
        .locator("#source")
        .evaluate((el) => el.getBoundingClientRect().height);
      assert.ok(editorHeight >= (width >= 1200 ? 350 : 200));
    }
    await page.locator(".footer-option").click();
    assert.equal(await page.locator("#showBrand").isChecked(), false);
    await page.locator("#transpose-interval").selectOption("2");
    assert.equal(await page.locator("#transpose-interval").inputValue(), "2");
    await page.close();
  }
  console.log(
    "Document controls remain aligned and visible at desktop and phone widths",
  );
} finally {
  await browser.close();
}
