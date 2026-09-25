import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ locale: "es-ES" });
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  const icons = await page
    .locator("#new-menu .choice-icon")
    .evaluateAll((els) =>
      els.map((el) => [
        el.getBoundingClientRect().width,
        el.getBoundingClientRect().height,
      ]),
    );
  assert.deepEqual(icons, [
    [40, 40],
    [40, 40],
    [40, 40],
    [40, 40],
  ]);
  await page.locator("#blank").click();
  await page.locator('.rail [data-desktop-view="edit"]').click();
  await page.locator("#source").fill("[C] [F#7/A#] [A7/C#]");
  await page.locator('[data-section="chords"]').click();
  const missingCard = page.locator('.chord-card[data-name="F#7/A#"]');
  assert.equal(
    await missingCard.locator(".edit-shape-text").textContent(),
    "Arreglar",
  );
  await missingCard.locator(".edit-shape-text").click();
  assert.equal(await page.locator("#shape-dialog").isVisible(), true);
  await page.locator("#shape-dialog .cancel-shape").click();
  await page
    .getByRole("button", { name: "Añadir todos los diagramas" })
    .click();
  const missing = page.locator("#missing-shapes-dialog");
  assert.equal(await missing.isVisible(), true);
  assert.deepEqual(await missing.locator("[data-missing]").allTextContents(), [
    "F#7/A# · Definir posición",
    "A7/C# · Definir posición",
  ]);
  await missing.locator(".omit-missing").click();
  assert.equal(await page.locator(".chord-sticker").count(), 1);
  assert.deepEqual(
    await page.locator(".sticker-image > svg > g > text").allTextContents(),
    ["C"],
  );
  assert.equal(
    await page.locator(".sticker-image").getByText("Sin posición").count(),
    0,
  );
  assert.deepEqual(
    await page
      .locator(".chord-sticker")
      .evaluate((el) => getComputedStyle(el).zIndex),
    "2",
  );
  await page.locator(".chord-sticker .remove-sticker").click();

  await page
    .getByRole("button", { name: "Añadir todos los diagramas" })
    .click();
  await missing
    .getByRole("button", { name: "F#7/A# · Definir posición" })
    .click();
  assert.equal(await page.locator("#shape-dialog .fret-inputs").count(), 0);
  assert.equal(
    await page.locator("#shape-dialog .shape-readings").isVisible(),
    false,
  );
  for (const [i, fret] of [-1, 1, 2, 3, 2, 2].entries())
    if (fret >= 0)
      await page
        .locator(`#shape-dialog [data-string="${i}"][data-fret="${fret}"]`)
        .click();
  assert.match(
    await page.locator("#shape-dialog .shape-readings").textContent(),
    /F#7\/A#/,
  );
  await page.locator("#shape-dialog .primary").click();
  assert.equal(await missing.isVisible(), true);
  assert.deepEqual(await missing.locator("[data-missing]").allTextContents(), [
    "A7/C# · Definir posición",
  ]);
  await missing
    .getByRole("button", { name: "A7/C# · Definir posición" })
    .click();
  for (const [i, fret] of [-1, 4, 2, 2, 2, 3].entries())
    if (fret >= 0)
      await page
        .locator(`#shape-dialog [data-string="${i}"][data-fret="${fret}"]`)
        .click();
  await page.locator("#shape-dialog .primary").click();
  assert.equal(await page.locator(".chord-sticker").count(), 1);
  assert.deepEqual(
    await page.locator(".sticker-image > svg > g > text").allTextContents(),
    ["C", "F#7/A#*", "A7/C#*"],
  );
  console.log(
    "Missing chord choices, manual positions and sticker stacking passed",
  );
} finally {
  await browser.close();
}
