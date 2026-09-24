import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page
    .locator("#source")
    .fill("[C]Verso con acordes y letra\n".repeat(45));
  await page.locator('[data-section="chords"]').click();
  await page.getByRole("button", { name: "Añadir diagrama de C" }).click();
  const overlap = await page.evaluate(() => {
    const sticker = document
      .querySelector(".chord-sticker")
      .getBoundingClientRect();
    return [...document.querySelectorAll(".song-line")].some((line) => {
      const row = line.getBoundingClientRect();
      return (
        row.left < sticker.right &&
        row.right > sticker.left &&
        row.top < sticker.bottom &&
        row.bottom > sticker.top
      );
    });
  });
  assert.equal(overlap, false);
  for (const type of ["pdf", "docx"]) {
    await page.locator("#export").click();
    const ready = page.waitForEvent("download");
    await page.locator(`[data-export="${type}"]`).click();
    const file = await ready;
    assert.match(file.suggestedFilename(), new RegExp(`\\.${type}$`));
    if (process.env.CHORDLEAF_EXPORT_ARTIFACTS)
      await file.saveAs(`artifacts/p0-diagram.${type}`);
  }
  console.log(
    "Diagram avoids lyrics in preview, PDF and Word export completed",
  );
} finally {
  await browser.close();
}
