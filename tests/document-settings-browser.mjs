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
    assert.equal(await page.locator("#showBrand").isVisible(), false);
    await page.locator(".more-document-options summary").click();

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
      const transpose = document
        .querySelector("#transpose-up")
        .getBoundingClientRect();
      return { settings, checkbox, label, transpose };
    });
    assert.ok(geometry.checkbox.width <= 18);
    assert.ok(geometry.label.left >= geometry.checkbox.right);
    assert.ok(geometry.transpose.top >= geometry.settings.top);
    assert.ok(geometry.transpose.bottom <= geometry.settings.bottom);
    assert.ok(geometry.transpose.right <= geometry.settings.right);

    if (width > 760) {
      assert.equal(await page.locator("#settings").isVisible(), true);
      assert.equal(await page.locator("#source-area").isVisible(), false);
      await page.locator('.rail [data-desktop-view="edit"]').click();
      assert.equal(await page.locator("#settings").isVisible(), false);
      assert.equal(await page.locator("#source-area").isVisible(), true);
      const editorHeight = await page
        .locator("#source")
        .evaluate((el) => el.getBoundingClientRect().height);
      assert.ok(editorHeight >= (width >= 1200 ? 180 : 120));
      await page.locator('.rail [data-desktop-view="document"]').click();
      await page.locator(".more-document-options summary").click();
    }
    await page.locator(".footer-option").click();
    assert.equal(await page.locator("#showBrand").isChecked(), false);
    if (width > 760) {
      assert.equal(await page.locator(".rail [data-desktop-view]").count(), 6);
      assert.deepEqual(
        await page
          .locator(".rail [data-desktop-view]")
          .evaluateAll((buttons) =>
            buttons.map((button) => [
              button.dataset.desktopView,
              button.querySelector("span:last-child").textContent,
            ]),
          ),
        locale === "en-US"
          ? [
              ["document", "Settings"],
              ["edit", "Lyrics"],
              ["song", "Chords"],
              ["key", "Key"],
              ["search", "Search"],
              ["identify", "Identify"],
            ]
          : [
              ["document", "Configuración"],
              ["edit", "Letra"],
              ["song", "Acordes"],
              ["key", "Tonalidad"],
              ["search", "Buscar"],
              ["identify", "Identificar"],
            ],
      );
      for (const [view, panel] of [
        ["edit", "#source-area"],
        ["key", ".key-name"],
        ["song", "#song-chords"],
        ["search", "#catalog-search"],
        ["identify", "#fretboard"],
        ["document", "#settings"],
      ]) {
        await page.locator(`.rail [data-desktop-view="${view}"]`).click();
        assert.equal(await page.locator(panel).isVisible(), true, view);
        if (view === "key") {
          assert.equal(await page.locator("#settings .info-box").count(), 0);
        }
        if (view === "song" || view === "identify") {
          assert.equal(
            await page.locator("#chords-panel > .panel-title").count(),
            0,
          );
        }
        assert.equal(
          await page
            .locator(`.rail [data-desktop-view="${view}"]`)
            .getAttribute("aria-current"),
          "page",
        );
      }
      if (width === 1440) {
        await page.locator('.rail [data-desktop-view="identify"]').click();
        await page.locator("#new").click();
        await page.locator("#blank").click();
        assert.equal(
          await page
            .locator('.rail [data-desktop-view="document"]')
            .getAttribute("aria-current"),
          "page",
        );
        await page.locator(".tab-select").first().click();
        assert.equal(
          await page
            .locator('.rail [data-desktop-view="identify"]')
            .getAttribute("aria-current"),
          "page",
        );
      }
    }
    assert.equal(await page.locator("#transpose-interval").count(), 0);
    await page.close();
  }
  console.log(
    "Document controls remain aligned and visible at desktop and phone widths",
  );
} finally {
  await browser.close();
}
