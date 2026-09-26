import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  locale: "es-ES",
  viewport: { width: 1440, height: 1000 },
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
await page.locator("#empty-new").click();
await page.locator("#blank").click();
await page.locator("#title").fill("Al otro lado");
await page.locator("#artist").fill("Canción de ejemplo · Chordleaf");
await page.locator('.rail [data-desktop-view="edit"]').click();
await page
  .locator("#source")
  .fill(
    "[G]Hay un lugar al [D]otro lado\n[Em]donde el tiempo va [C]despacio.\n[G]Guardo la luz de [D]esta mañana\n[C]en las cuerdas de mi [G]guitarra.",
  );
await page.locator(".page").waitFor();
await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
const source = page.locator("#source"),
  original = await source.inputValue();
await page.locator('.rail [data-desktop-view="document"]').click();
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
await page.locator('.rail [data-desktop-view="edit"]').click();
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
await page.locator('.rail [data-desktop-view="document"]').click();
await page.locator('[data-columns="2"]').click();
await page.locator("#export").click();
let waiting = page.waitForEvent("download");
await page.locator('[data-export="docx"]').click();
await (await waiting).saveAs("artifacts/multipage.docx");
await page.locator("#export").click();
waiting = page.waitForEvent("download");
await page.locator('[data-export="pdf"]').click();
await (await waiting).saveAs("artifacts/multipage.pdf");
await page.locator('.rail [data-desktop-view="edit"]').click();
await source.fill(original + "\n[G]Cambio");
await page.locator(".tab-close").first().click();
assert.equal(await page.locator("#close-dialog").isVisible(), true);
assert.equal(await page.locator("#close-save-project .button-icon").count(), 1);
assert.equal(await page.locator("#confirm-close .button-icon").count(), 1);
assert.equal(
  (await page.locator("#confirm-close").textContent()).trim(),
  "Descartar",
);
await page.locator("#cancel-close-x").click();
assert.equal(
  await page.locator("#close-dialog").evaluate((el) => el.open),
  false,
);
await page.locator(".tab-close").first().click();
assert.equal(await page.locator("#close-dialog").isVisible(), true);
await page.locator("#cancel-close-x").click();
// Saving from the close prompt downloads the project and closes that song.
const tabsBeforeSave = await page.locator(".tab").count();
await page.locator(".tab-close").first().click();
const closeSave = page.waitForEvent("download");
await page.locator("#close-save-project").click();
await (await closeSave).saveAs("artifacts/close-save-project.json");
assert.equal(
  await page.locator("#close-dialog").evaluate((el) => el.open),
  false,
);
assert.equal(await page.locator(".tab").count(), tabsBeforeSave - 1);
await page.locator("#new").click();
await page.locator("#file").setInputFiles("artifacts/sample.pdf");
await page.waitForFunction(
  () => document.querySelector("#new-dialog").open === false,
);
assert.equal(await page.locator("#title").inputValue(), "Al Otro Lado");
assert.equal(await source.inputValue(), original);
await page.locator("#new").click();
await page.locator("#file").setInputFiles("artifacts/sample.docx");
await page.waitForFunction(() => !document.querySelector("#new-dialog").open);
assert.equal(await page.locator("#title").inputValue(), "Al Otro Lado");
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
await page.locator('.rail [data-desktop-view="edit"]').click();
await source.fill(original);
await page.locator('.rail [data-desktop-view="document"]').click();
await page.locator('[data-columns="1"]').click();
// Resizing works with keyboard and pointer, without losing source content.
await page.locator("#panel-splitter").focus();
const beforeWidth = await page
  .locator(".editor-panel")
  .evaluate((el) => el.clientWidth);
await page.keyboard.press("ArrowRight");
assert.ok(
  (await page.locator(".editor-panel").evaluate((el) => el.clientWidth)) >
    beforeWidth,
);
const handle = await page.locator("#panel-splitter").boundingBox();
await page.mouse.move(handle.x + 4, handle.y + 80);
await page.mouse.down();
await page.mouse.move(handle.x + 84, handle.y + 80);
await page.mouse.up();
assert.ok(
  (await page.locator(".editor-panel").evaluate((el) => el.clientWidth)) >
    beforeWidth + 50,
);
await page.locator("#panel-splitter").press("Home");
await page.locator('.rail [data-desktop-view="edit"]').click();
await page.locator("#expand-editor").click();
assert.equal(await page.locator("#editor-dialog").isVisible(), true);
await source.fill("Una ca[Emaj7]sa [Abm7b5]azul");
assert.equal(await page.locator("#chord-align").count(), 0);
await page.screenshot({
  path: "artifacts/expanded-editor.png",
  fullPage: true,
});
await source.press("Escape");
assert.equal(await page.locator("#editor-dialog").isVisible(), false);
assert.equal(await source.inputValue(), "Una ca[Emaj7]sa [Abm7b5]azul");
assert.equal(
  await page
    .locator(".sheet-chord")
    .first()
    .evaluate((el) => parseFloat(el.style.left)),
  36,
);
for (const type of ["pdf", "docx", "txt"]) {
  await page.locator("#export").click();
  const download = page.waitForEvent("download");
  await page.locator(`[data-export="${type}"]`).click();
  await (await download).saveAs(`artifacts/centered.${type}`);
}
await page.locator('[data-section="chords"]').click();
await page.locator('[data-mode="search"]').click();
await page.locator("#catalog-search").fill("Abm7b5");
await page.locator("#catalog-grid .chord-card").first().click();
assert.ok(
  (await page.locator("#chosen-position").textContent()).startsWith("1 /"),
);
await page.locator("#chosen-next").click();
assert.ok(
  (await page.locator("#chosen-position").textContent()).startsWith("2 /"),
);
await page.screenshot({ path: "artifacts/chord-library.png" });
await page.locator("#insert-chosen").click();
assert.ok((await source.inputValue()).endsWith("[Abm7b5]"));
await page.locator('[data-mode="song"]').click();
await page.locator('[data-section="document"]').click();
await page.locator("#new").click();
await page.locator("#blank").click();
assert.equal(await page.locator("#title").inputValue(), "");
assert.equal(
  await page.locator("#title").getAttribute("placeholder"),
  "Nombre de la canción",
);
assert.equal(await page.locator(".sheet-header h1").textContent(), "");
assert.equal(await source.inputValue(), "");
await page.locator("#title").fill("Prueba de edición");
await page.locator('.rail [data-desktop-view="edit"]').click();
await source.fill("Una ca[Emaj7]sa [Abm7b5]azul");
assert.equal(await page.locator("#chord-align").count(), 0);
await page.waitForTimeout(450);
await page.reload();
assert.equal(await source.inputValue(), "Una ca[Emaj7]sa [Abm7b5]azul");
assert.equal(await page.locator("#chord-align").count(), 0);
// View zoom leaves the document layout unchanged.
const pageWidth = await page
  .locator(".page")
  .first()
  .evaluate((el) => el.getBoundingClientRect().width);
await page.locator("#zoom-in").click();
assert.ok(
  (await page
    .locator(".page")
    .first()
    .evaluate((el) => el.getBoundingClientRect().width)) > pageWidth,
);
await page.locator("#zoom-reset").click();
await page.locator('.rail [data-desktop-view="document"]').click();
await page.locator("#title").fill("alone again");
await page.locator("#artist").fill("gilbert sullivan");
assert.equal(
  await page.locator(".sheet-header h1").textContent(),
  "ALONE AGAIN",
);
assert.equal(await page.locator("#title").inputValue(), "alone again");
await page.locator('[data-section="chords"]').click();
await page
  .getByRole("button", { name: "Editar posición de Emaj7", exact: true })
  .click();
assert.equal(
  await page.locator("#shape-dialog .shape-readings").isVisible(),
  true,
);
assert.match(
  await page.locator("#shape-dialog .shape-readings").textContent(),
  /Posibles nombres:.*Emaj7/,
);
await page.locator("#shape-dialog button", { hasText: "Guardar" }).click();
assert.equal(
  await page.locator(".sheet-chord").first().textContent(),
  "Emaj7*",
);
await page
  .getByRole("button", { name: "Añadir todos los diagramas", exact: true })
  .click();
assert.equal(await page.locator(".chord-sticker").count(), 1);
const sticker = page.locator(".chord-sticker");
await sticker.scrollIntoViewIfNeeded();
await sticker.focus();
const oldLeft = await sticker.evaluate((el) => parseFloat(el.style.left));
await sticker.press("ArrowRight");
assert.equal(
  await sticker.evaluate((el) => parseFloat(el.style.left)),
  oldLeft + 5,
);
const resizer = sticker.locator(".resize-corner");
await resizer.focus();
const oldWidth = await sticker.evaluate((el) => parseFloat(el.style.width));
await resizer.press("ArrowRight");
assert.ok(
  (await sticker.evaluate((el) => parseFloat(el.style.width))) > oldWidth,
);
// Pointer drag remains accurate when the document is zoomed. Drag towards the
// page body: a diagram that overlaps the page header blocks every export.
await page.locator("#zoom-in").click();
await sticker.scrollIntoViewIfNeeded();
const bounds = await sticker.boundingBox();
const origin = await sticker.evaluate((el) => [
  parseFloat(el.style.left),
  parseFloat(el.style.top),
]);
await page.mouse.move(bounds.x + 20, bounds.y + 25);
await page.mouse.down();
await page.mouse.move(bounds.x + 55, bounds.y + 60, { steps: 5 });
await page.mouse.up();
const moved = await sticker.evaluate((el) => [
  parseFloat(el.style.left),
  parseFloat(el.style.top),
]);
assert.ok(moved[0] > origin[0] + 20);
assert.ok(moved[1] > origin[1] + 20);
await page.locator("#zoom-reset").click();
await page
  .getByRole("button", { name: "Editar posición de Emaj7", exact: true })
  .click();
await page.locator("#shape-dialog [name=star]").uncheck();
await page.locator("#shape-dialog button", { hasText: "Guardar" }).click();
assert.equal(await page.locator(".sheet-chord").first().textContent(), "Emaj7");
await page
  .getByRole("button", { name: "Editar posición de Emaj7", exact: true })
  .click();
await page.locator("#shape-dialog [name=star]").check();
await page.locator("#shape-dialog button", { hasText: "Guardar" }).click();
for (const type of ["pdf", "docx", "txt"]) {
  await page.locator("#export").click();
  const download = page.waitForEvent("download");
  await page.locator(`[data-export="${type}"]`).click();
  await (await download).saveAs(`artifacts/dictionary.${type}`);
}
await page.waitForTimeout(450);
await page.reload();
assert.equal(await page.locator(".chord-sticker").count(), 1);
assert.equal(
  await page.locator(".sheet-chord").first().textContent(),
  "Emaj7*",
);
await page.screenshot({ path: "artifacts/dictionary.png", fullPage: true });
await page.locator("#new").click();
await page.locator("#file").setInputFiles("artifacts/dictionary.txt");
await page.waitForFunction(() => !document.querySelector("#new-dialog").open);
assert.equal(await page.locator(".chord-sticker").count(), 1);
assert.equal(
  await page.locator(".sheet-chord").first().textContent(),
  "Emaj7*",
);
assert.equal(await page.locator("#title").inputValue(), "Alone Again");
await page.setViewportSize({ width: 900, height: 800 });
await page.screenshot({ path: "artifacts/compact.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.locator('.rail [data-mobile-view="edit"]').click();
await page.locator("#expand-editor").click();
assert.equal(await page.locator("#editor-dialog").isVisible(), true);
assert.equal(
  await page
    .locator("#editor-dialog")
    .evaluate((el) => el.scrollWidth > el.clientWidth),
  false,
);
await page.screenshot({
  path: "artifacts/mobile-expanded.png",
  fullPage: true,
});
await page.locator("#collapse-editor").click();
assert.deepEqual(errors, []);
console.log("Browser checks passed; multi-page count:", count);
await browser.close();
