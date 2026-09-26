import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page.locator('.rail [data-desktop-view="edit"]').click();
  await page.locator("#source").fill("[C]Luz\n\n\n[G]Vuelve\n\n[Am]Otra");
  await page.locator('.rail [data-desktop-view="document"]').click();

  const compress = page.locator("#compress-blank-lines");
  assert.equal(await compress.isEnabled(), true);
  await compress.click();
  // The run of two blanks keeps one; the lone blank is removed.
  assert.equal(
    await page.locator("#source").inputValue(),
    "[C]Luz\n\n[G]Vuelve\n[Am]Otra",
  );
  assert.match(await page.locator("#toast").textContent(), /2 líneas vacías/);
  assert.equal(await compress.isEnabled(), true);
  await compress.click();
  assert.equal(
    await page.locator("#source").inputValue(),
    "[C]Luz\n[G]Vuelve\n[Am]Otra",
  );
  assert.match(await page.locator("#toast").textContent(), /1 línea vacía/);
  assert.equal(await compress.isEnabled(), false);

  // Inline chord anchors and lane spacing survive the cleanup.
  await page.locator('.rail [data-desktop-view="edit"]').click();
  await page.locator("#source").fill("[C]Luz    [G]del\n\n\n[Am]día");
  await page.locator('.rail [data-desktop-view="document"]').click();
  await compress.click();
  assert.equal(
    await page.locator("#source").inputValue(),
    "[C]Luz    [G]del\n\n[Am]día",
  );
  assert.deepEqual(errors, []);
  console.log("Blank-line compression acts on the song text");
} finally {
  await browser.close();
}
