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
  await page.locator("#source").fill("[C/G]Uno\n{new_page}\n[Dm7]Dos");
  await page.locator("#transpose-interval").selectOption("2");
  await page.locator("#transpose-up").click();
  assert.equal(
    await page.locator("#source").inputValue(),
    "[D/A]Uno\n{new_page}\n[Em7]Dos",
  );
  assert.match(
    await page.locator("#undo-transpose").locator("..").textContent(),
    /\+2 semitonos/,
  );
  await page.locator("#undo-transpose").click();
  assert.equal(
    await page.locator("#source").inputValue(),
    "[C/G]Uno\n{new_page}\n[Dm7]Dos",
  );
  await page.locator("#transpose-interval").selectOption("4");
  await page.locator("#transpose-up").click();
  await page.locator("#transpose-down").click();
  assert.equal(
    await page.locator("#source").inputValue(),
    "[C/G]Uno\n{new_page}\n[Dm7]Dos",
  );
  await page.locator("#showBrand").uncheck();
  assert.equal(await page.locator(".sheet-brand").count(), 0);
  await page.locator("#export").click();
  const pdfReady = page.waitForEvent("download");
  await page.locator('[data-export="pdf"]').click();
  const pdfFile = await pdfReady;
  const pdf = await getDocument({
    data: new Uint8Array(await readFile(await pdfFile.path())),
  }).promise;
  for (let n = 1; n <= pdf.numPages; n++) {
    const content = await (await pdf.getPage(n)).getTextContent();
    assert.equal(
      content.items.some((item) => item.str.includes("chordleaf.com")),
      false,
    );
  }
  assert.match(
    await page.locator("#save-state").textContent(),
    /PDF descargado · proyecto sin guardar/,
  );
  await page.locator(".tab-close").click();
  assert.match(
    await page.locator("#close-message").textContent(),
    /PDF o Word/,
  );
  await page.locator("#cancel-close").click();
  await page.locator("#export").click();
  const projectReady = page.waitForEvent("download");
  await page.locator("#save-project").click();
  const project = await projectReady;
  assert.match(project.suggestedFilename(), /\.chordleaf\.json$/);
  const filePath = await project.path();
  await page.locator("#source").fill("[C/G]Cambio posterior");
  await page.locator(".tab-close").click();
  assert.match(
    await page.locator("#close-message").textContent(),
    /cambios posteriores/,
  );
  await page.locator("#cancel-close").click();
  await page.locator("#source").fill("[C/G]Uno\n{new_page}\n[Dm7]Dos");
  await page.locator(".tab-close").click();
  assert.equal(
    await page.locator("#close-dialog").evaluate((el) => el.open),
    false,
  );
  await page.reload();
  await page.locator("#empty-new").click();
  await page.locator("#open-project").click();
  await page.locator("#file").setInputFiles({
    name: project.suggestedFilename(),
    mimeType: "application/json",
    buffer: await readFile(filePath),
  });
  await page.locator("#source").waitFor();
  assert.equal(
    await page.locator("#source").inputValue(),
    "[C/G]Uno\n{new_page}\n[Dm7]Dos",
  );
  assert.equal(await page.locator("#showBrand").isChecked(), false);
  assert.equal(await page.locator(".page").count(), 2);
  assert.deepEqual(errors, []);
  console.log("Project save, close, reload and reopen checks passed");
} finally {
  await browser.close();
}
