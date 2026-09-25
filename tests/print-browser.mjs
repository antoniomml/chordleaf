import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__printed = 0;
    window.print = () => {
      window.__printed++;
    };
  });
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page.locator("#title").fill("Hoja de impresión");
  await page.locator('.rail [data-desktop-view="edit"]').click();
  await page
    .locator("#source")
    .fill(
      Array.from(
        { length: 140 },
        (_, i) => `[C]Línea ${i + 1} con acordes [G]y letra`,
      ).join("\n"),
    );
  assert.ok(
    (await page.locator(".page-shell").count()) >= 2,
    "the song must span several pages",
  );

  // The print entry lives in the export menu with translated copy.
  await page.locator("#export").click();
  const printButton = page.locator("#print-document");
  assert.equal(await printButton.isVisible(), true);
  assert.match(await printButton.innerText(), /Imprimir/);
  await printButton.click();
  assert.equal(await page.evaluate(() => window.__printed), 1);
  assert.equal(await page.locator("#export-menu").isHidden(), true);

  // Emulate paper: only the sheets remain, sized as A4 and never split.
  await page.emulateMedia({ media: "print" });
  for (const selector of [
    ".topbar",
    ".tabs-wrap",
    ".rail",
    ".editor-panel",
    ".preview-toolbar",
    ".preview-footer",
    "#toast",
    "#chord-tooltip",
  ])
    assert.equal(
      await page
        .locator(selector)
        .evaluate((el) => getComputedStyle(el).display),
      "none",
      `${selector} must not reach paper`,
    );
  assert.equal(
    await page
      .locator(".preview-panel")
      .evaluate((el) => getComputedStyle(el).display),
    "block",
  );
  const pageWidth = await page
    .locator(".page-shell")
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).width));
  assert.ok(
    Math.abs(pageWidth - 210 * (96 / 25.4)) < 2,
    `A4 width expected, got ${pageWidth}px`,
  );
  const shells = await page.locator(".page-shell").evaluateAll((els) =>
    els.map((el) => ({
      after: getComputedStyle(el).breakAfter,
      inside: getComputedStyle(el).breakInside,
    })),
  );
  shells.slice(0, -1).forEach((shell) => assert.equal(shell.after, "page"));
  shells.forEach((shell) => assert.equal(shell.inside, "avoid"));
  const transforms = await page
    .locator(".page")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
  for (const transform of transforms)
    assert.match(transform, /^matrix\(1\.3333/, transform);
  await page.screenshot({ path: "artifacts/print-emulated.png" });

  // Printing from the phone editor still paints the sheets, not the editor.
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.rail [data-mobile-view="edit"]').click();
  assert.equal(
    await page
      .locator(".preview-panel")
      .evaluate((el) => getComputedStyle(el).display),
    "none",
  );
  await page.emulateMedia({ media: "print" });
  assert.equal(
    await page
      .locator(".preview-panel")
      .evaluate((el) => getComputedStyle(el).display),
    "block",
  );
  assert.equal(
    await page.locator("#pages-scroll").evaluate((el) => el.scrollWidth > 0),
    true,
  );
  assert.deepEqual(errors, []);
  console.log("Print stylesheet renders A4 sheets without chrome or breaks");
} finally {
  await browser.close();
}
