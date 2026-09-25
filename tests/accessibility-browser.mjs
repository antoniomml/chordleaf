import { chromium } from "@playwright/test";
import axe from "axe-core";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    bypassCSP: true,
    locale: "es-ES",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173/es/");
  await page.locator("#empty-new").waitFor();
  await page.addScriptTag({ content: axe.source });
  async function check(state) {
    const violations = await page.evaluate(() => axe.run());
    assert.deepEqual(
      violations.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map(({ target }) => target),
      })),
      [],
      `${state} has accessibility violations`,
    );
  }

  await check("empty workspace");
  assert.equal(
    await page.getByRole("heading", { name: "Escribe a tu manera" }).count(),
    1,
  );
  await page.locator("#empty-new").click();
  await check("new-song dialog");
  await page.locator("#blank").click();
  assert.equal(
    await page.locator(".sheet-header h1").getAttribute("aria-label"),
    "Canción sin título",
  );
  assert.equal(
    await page.locator('[data-columns="1"]').getAttribute("aria-pressed"),
    "true",
  );
  await check("untitled editor");
  await page.locator('[data-columns="2"]').click();
  assert.equal(
    await page.locator('[data-columns="2"]').getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.locator('[data-columns="1"]').getAttribute("aria-pressed"),
    "false",
  );
  await page.locator('.rail [data-desktop-view="edit"]').click();
  await page.locator("#source").fill("[G]Una línea [C]con acordes");
  await page.locator('[data-section="chords"]').click();
  await check("chord workspace");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const view of ["document", "edit", "music", "preview"]) {
    await page.locator(`.rail [data-mobile-view="${view}"]`).click();
    await check(`mobile ${view}`);
  }
  await page.locator('.rail [data-mobile-view="music"]').click();
  await page.locator('[data-music-section="key"]').click();
  await check("mobile key");
  console.log("Automated accessibility checks passed");
} finally {
  await browser.close();
}
