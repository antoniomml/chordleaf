import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.CHORDI_URL || "http://localhost:5173");
await page.locator(".page").waitFor();
await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
const source = page.locator("#source"),
  original = await source.inputValue();
await page.locator("#link").click();
assert.equal(await source.inputValue(), original);
await page.locator("#capo-up").click();
assert.notEqual(await source.inputValue(), original);
await page.locator("#capo-down").click();
assert.equal(await source.inputValue(), original);
await page.locator("#link").click();
await page.locator("#capo-up").click();
assert.equal(await source.inputValue(), original);
await page.locator("#capo-down").click();
await page.locator("#pencil").click();
await page.locator(".song-line").first().click();
await page.locator(".inline-editor").fill("[G]Un verso editado [D]en la hoja");
await page.locator(".inline-editor").press("Enter");
assert.ok((await source.inputValue()).startsWith("[G]Un verso editado"));
await source.fill(original);
for (const type of ["pdf", "docx", "txt"]) {
  await page.locator("#export").click();
  const waiting = page.waitForEvent("download");
  await page.locator(`[data-export="${type}"]`).click();
  const dl = await waiting;
  await dl.saveAs(`artifacts/sample.${type}`);
}
await source.fill(
  "[G]Una canción [D]larga que [Em]prueba la [C]distribución.\n".repeat(100),
);
const count = await page.locator(".page").count();
assert.ok(count > 1);
await page.locator(".page-shell").last().scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
assert.ok(
  (await page.locator("#page-count").textContent()).includes(
    `Página ${count} de ${count}`,
  ),
);
await page.locator('[data-columns="2"]').click();
await page.locator("#export").click();
let waiting = page.waitForEvent("download");
await page.locator('[data-export="docx"]').click();
await (await waiting).saveAs("artifacts/multipage.docx");
await page.locator("#export").click();
waiting = page.waitForEvent("download");
await page.locator('[data-export="pdf"]').click();
await (await waiting).saveAs("artifacts/multipage.pdf");
await source.fill(original + "\n[G]Cambio");
await page.locator(".tab-close").first().click();
assert.equal(await page.locator("#close-dialog").isVisible(), true);
await page.locator("#cancel-close").click();
await page.locator("#new").click();
await page.locator("#file").setInputFiles("artifacts/sample.pdf");
await page.waitForFunction(
  () => document.querySelector("#new-dialog").open === false,
);
assert.equal(await page.locator("#title").inputValue(), "Al otro lado");
assert.equal(await source.inputValue(), original);
await page.locator("#new").click();
await page.locator("#file").setInputFiles("artifacts/sample.docx");
await page.waitForFunction(() => !document.querySelector("#new-dialog").open);
assert.equal(await page.locator("#title").inputValue(), "Al otro lado");
assert.equal((await source.inputValue()).trim(), original.trim());
await page.locator("#new").click();
await page.locator("#file").setInputFiles("artifacts/multipage.pdf");
await page.waitForFunction(() => !document.querySelector("#new-dialog").open);
assert.equal(
  await page.locator('[data-columns="2"]').getAttribute("class"),
  "selected",
);
assert.equal(
  [...(await source.inputValue()).matchAll(/\[[^\]]+\]/g)].length,
  400,
);
await source.fill(original);
await page.locator('[data-columns="1"]').click();
await page.setViewportSize({ width: 900, height: 800 });
await page.screenshot({ path: "artifacts/compact.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
assert.deepEqual(errors, []);
console.log("Browser checks passed; multi-page count:", count);
await browser.close();
