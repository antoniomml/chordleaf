import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ locale: "es-ES" });
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173/es/");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page.locator('.rail [data-desktop-view="edit"]').click();

  const longText = "[G]Una línea larga de ensayo [C]con acordes\n".repeat(700);
  await page.locator("#source").fill(longText);
  assert.equal(await page.locator(".page-shell").count(), 1);
  await page.waitForFunction(
    () => document.querySelectorAll(".page-shell").length > 1,
  );
  assert.equal(await page.locator("#source").inputValue(), longText);

  // A queued preview must not render after switching to another song.
  await page.locator("#source").fill(longText + "[D]Final");
  await page.locator("#new").click();
  await page.locator("#blank").click();
  await page.waitForTimeout(180);
  assert.equal(await page.locator("#source").inputValue(), "");
  assert.equal(await page.locator(".page-shell").count(), 1);
  console.log("Long-song preview scheduling and cancellation passed");
} finally {
  await browser.close();
}
