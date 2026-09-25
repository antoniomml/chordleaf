import { Document, Paragraph, Packer } from "docx";
import { chromium, firefox, webkit } from "@playwright/test";
import assert from "node:assert/strict";
const wordFile = {
  name: "worker-check.docx",
  mimeType:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  buffer: await Packer.toBuffer(
    new Document({
      sections: [{ children: [new Paragraph("[C]Worker import song")] }],
    }),
  ),
};
function workerClosed(worker) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Import worker was not terminated")),
      5000,
    );
    worker.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
const url = process.env.CHORDLEAF_URL || "http://localhost:5173";
for (const engine of [chromium, firefox, webkit].filter(
  (engine) =>
    !process.env.CHORDLEAF_BROWSERS ||
    process.env.CHORDLEAF_BROWSERS.split(",").includes(engine.name()),
)) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    await page.goto(url);
    await page.locator("#empty-new").click();
    await page.locator("#blank").click();
    await page.locator('.rail [data-desktop-view="edit"]').click();
    await page.locator("#source").fill("[C]Keep my changes\n[G]Across windows");
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("chordleaf-v1"))?.songs?.[0]?.text ===
        "[C]Keep my changes\n[G]Across windows",
    );
    const second = await context.newPage();
    await second.goto(url);
    await second
      .getByRole("heading", { name: "Your workspace is open in another tab" })
      .waitFor();
    await second.getByRole("button", { name: "Try again" }).click();
    await second
      .getByRole("button", { name: "Waiting for the other tab to close…" })
      .waitFor();
    assert.equal(await second.locator("#source").count(), 0);
    await page.close();
    await second.waitForFunction(
      () =>
        document.querySelector("#source")?.value ===
        "[C]Keep my changes\n[G]Across windows",
    );
    await second.locator('.rail [data-desktop-view="edit"]').click();
    await second.locator("#source").waitFor();
    assert.equal(
      await second.locator("#source").inputValue(),
      "[C]Keep my changes\n[G]Across windows",
    );
    await second.locator("#export").click();
    const pending = second.waitForEvent("download");
    await second.locator("#workspace-backup").click();
    const download = await pending;
    const path = await download.path();
    await second.locator("#new").click();
    await second.locator("#import").click();
    await second.locator("#file").setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: await (await import("node:fs/promises")).readFile(path),
    });
    await second.waitForFunction(
      () => document.querySelectorAll(".tab").length === 2,
    );
    assert.equal(
      await second.locator("#source").inputValue(),
      "[C]Keep my changes\n[G]Across windows",
    );
    await second.locator("#language").click();
    await second.locator('[data-language="es"]').click();
    await second.waitForFunction(() => document.documentElement.lang === "es");
    await second.reload();
    await second.waitForFunction(
      () => document.querySelectorAll(".tab").length === 2,
    );
    await second.locator('.rail [data-desktop-view="edit"]').click();
    await second.locator("#source").waitFor();
    assert.equal(await second.locator(".tab").count(), 2);
    await second.locator("#new").click();
    await second.locator("#import").click();
    await second.locator("#file").setInputFiles(wordFile);
    await second.waitForFunction(
      () => document.querySelectorAll(".tab").length === 3,
    );
    assert.match(
      await second.locator("#source").inputValue(),
      /Worker import song/,
    );
    // A decoder that never replies must be terminated by both cancel and timeout.
    await second.route("**/docx-worker-*.js", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: "self.onmessage = () => {};",
      }),
    );
    await second.locator("#new").click();
    await second.locator("#import").click();
    let started = second.waitForEvent("worker");
    await second.locator("#file").setInputFiles(wordFile);
    let worker = await started;
    const closed = workerClosed(worker);
    await second.keyboard.press("Escape");
    await closed;
    assert.equal(await second.locator(".tab").count(), 3);
    await second.clock.install();
    await second.locator("#new").click();
    await second.locator("#import").click();
    started = second.waitForEvent("worker");
    await second.locator("#file").setInputFiles(wordFile);
    worker = await started;
    const timedOut = workerClosed(worker);
    await second.clock.fastForward(16000);
    await timedOut;
    await second.locator("#import-error").waitFor();
    assert.match(
      await second.locator("#import-error").innerText(),
      /tardado demasiado/,
    );
    assert.equal(await second.locator(".tab").count(), 3);
    console.log(
      `${engine.name()}: persistence, exclusive editing, backups, languages and cancellable Word import passed`,
    );
  } finally {
    await browser.close();
  }
}
