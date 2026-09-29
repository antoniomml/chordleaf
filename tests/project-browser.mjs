import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "es-ES",
    acceptDownloads: true,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page.locator("#title").fill("Proyecto prueba");
  await page.locator('.rail [data-desktop-view="edit"]').click();
  await page.locator("#source").fill("[C/G]Uno\n{new_page}\n[Dm7]Dos");
  await page.locator('.rail [data-desktop-view="document"]').click();
  const reset = page.locator("#undo-transpose");
  assert.equal(await reset.isVisible(), true);
  assert.equal(await reset.isDisabled(), true);
  const disabledColor = await reset.evaluate(
    (button) => getComputedStyle(button).color,
  );
  const plusBefore = await page.locator("#transpose-up").boundingBox();
  await page.locator("#transpose-up").click();
  assert.equal(await reset.isVisible(), true);
  assert.equal(await reset.isEnabled(), true);
  assert.notEqual(
    await reset.evaluate((button) => getComputedStyle(button).color),
    disabledColor,
  );
  const plusAfter = await page.locator("#transpose-up").boundingBox();
  assert.equal(plusAfter.x, plusBefore.x);
  assert.equal(plusAfter.y, plusBefore.y);
  assert.notEqual(
    await page.locator("#source").inputValue(),
    "[C/G]Uno\n{new_page}\n[Dm7]Dos",
  );
  assert.equal(await page.locator(".transpose-value").textContent(), "+1");
  assert.match(
    await page.locator(".transpose-value").getAttribute("aria-label"),
    /\+1 semitono/,
  );
  await page.mouse.click(
    plusBefore.x + plusBefore.width / 2,
    plusBefore.y + plusBefore.height / 2,
  );
  assert.equal(await page.locator(".transpose-value").textContent(), "+2");
  assert.equal(await page.locator("#settings .link-help").count(), 0);
  await page.locator("#artist").fill("Artista de prueba");
  assert.equal(await page.locator(".transpose-value").textContent(), "+2");
  await page.locator("#undo-transpose").click();
  assert.equal(
    await page.locator("#source").inputValue(),
    "[C/G]Uno\n{new_page}\n[Dm7]Dos",
  );
  await page.locator("#transpose-up").click();
  await page.locator("#transpose-up").click();
  assert.equal(await page.locator(".transpose-value").textContent(), "+2");
  await page.locator("#transpose-down").click();
  assert.equal(await page.locator(".transpose-value").textContent(), "+1");
  await page.locator("#transpose-down").click();
  assert.equal(await reset.isVisible(), true);
  assert.equal(await reset.isDisabled(), true);
  assert.equal(
    await page.locator("#source").inputValue(),
    "[C/G]Uno\n{new_page}\n[Dm7]Dos",
  );
  await page.locator(".more-document-options summary").click();
  await page.locator("#showBrand").uncheck();
  assert.equal(await page.locator(".sheet-brand").count(), 0);
  await page.locator('[data-notation="latin"]').click();
  assert.equal(
    await page.locator(".sheet-chord").first().textContent(),
    "Do/Sol",
  );
  assert.equal(
    await page.locator(".sheet-chord").first().getAttribute("data-chord"),
    "C/G",
  );
  await page.locator("#export").click();
  const pdfReady = page.waitForEvent("download");
  await page.locator('[data-export="pdf"]').click();
  const pdfFile = await pdfReady;
  const pdf = await getDocument({
    data: new Uint8Array(await readFile(await pdfFile.path())),
  }).promise;
  const pdfText = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const content = await (await pdf.getPage(n)).getTextContent();
    pdfText.push(...content.items.map((item) => item.str.trim()));
  }
  assert.equal(pdfText.includes("chordleaf.com"), false);
  assert.ok(pdfText.includes("Do/Sol"));
  assert.ok(pdfText.includes("Rem7"));
  await page.waitForFunction(
    () =>
      document.querySelector("#save-state").textContent ===
      "Guardado en este navegador",
  );
  await page.locator("#export").click();
  const projectReady = page.waitForEvent("download");
  await page.locator("#save-project").click();
  const project = await projectReady;
  assert.match(project.suggestedFilename(), /\.chordleaf\.json$/);
  const filePath = await project.path();
  await page.locator(".tab-close").click();
  await page.locator("#recent-list li").first().waitFor();
  await page.locator("#recent-list .recent-remove").first().click();
  assert.equal(await page.locator("#recent-list li").count(), 0);
  await page.reload();
  await page.locator("#empty-new").click();
  await page.locator("#open-project").click();
  await page.locator("#file").setInputFiles({
    name: project.suggestedFilename(),
    mimeType: "application/json",
    buffer: await readFile(filePath),
  });
  await page.locator('.rail [data-desktop-view="edit"]').click();
  await page.locator("#source").waitFor();
  assert.equal(
    await page.locator("#source").inputValue(),
    "[C/G]Uno\n{new_page}\n[Dm7]Dos",
  );
  assert.equal(await page.locator("#showBrand").isChecked(), false);
  assert.equal(
    await page.locator('[data-notation="latin"]').getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await page.locator(".page").count(), 2);
  assert.deepEqual(errors, []);
  console.log("Project save, close, reload and reopen checks passed");
} finally {
  await browser.close();
}
