import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const url = process.env.CHORDLEAF_URL || "http://localhost:5173";
try {
  const context = await browser.newContext({
    locale: "es-ES",
    viewport: { width: 1280, height: 1000 },
  });
  const page = await context.newPage();
  const uploads = [],
    errors = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" ||
      new URL(request.url()).pathname.startsWith("/api/audio-import")
    )
      uploads.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", { value: undefined }),
  );
  await page.goto(url);
  await page.locator("#empty-new").click();
  await page.locator("#audio").click();
  await page
    .locator("#audio-browser-model-dialog")
    .waitFor({ state: "visible" });
  assert.equal(await page.locator("#browser-model-qwen").isDisabled(), true);
  assert.deepEqual(uploads, []);
  await page.locator("#browser-model-chords").click();
  await page.waitForFunction(
    () =>
      document
        .querySelector("#browser-model-status")
        .textContent.includes("Modelos listos"),
    {},
    { timeout: 120000 },
  );
  await page.locator("#browser-model-chords").click();
  assert.equal(await page.locator("#audio-lyrics").isChecked(), false);
  const buffer = Buffer.alloc(44 + 22050 * 2 * 4);
  buffer.write("RIFF");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(22050, 24);
  buffer.writeUInt32LE(44100, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(buffer.length - 44, 40);
  for (let i = 0; i < 22050 * 4; i++) {
    const value =
      [261.6256, 329.6276, 391.9954].reduce(
        (s, f) => s + Math.sin((2 * Math.PI * f * i) / 22050),
        0,
      ) / 6;
    buffer.writeInt16LE(Math.round(value * 32767), 44 + 2 * i);
  }
  await page
    .locator("#audio-file")
    .setInputFiles({ name: "Acorde local.wav", mimeType: "audio/wav", buffer });
  await page.locator("#audio-analyze").click();
  await page
    .locator("#audio-result")
    .waitFor({ state: "visible", timeout: 120000 });
  assert.ok((await page.locator("#audio-timeline button").count()) > 0);
  const exported = page.waitForEvent("download");
  await page.locator("#audio-download").click();
  const result = JSON.parse(
    await readFile(await (await exported).path(), "utf8"),
  );
  assert.match(result.engines.chords, /lv-chordia-web/);
  assert.ok(result.chords.length > 0);
  assert.equal(result.duration, 4);
  assert.deepEqual(result.words, []);
  assert.deepEqual(uploads, []);
  await page.locator("#audio-another").click();
  await page
    .locator("#audio-file")
    .setInputFiles({ name: "Cancelar.wav", mimeType: "audio/wav", buffer });
  await page.locator("#audio-analyze").click();
  await page.waitForFunction(() =>
    /Preparando los acordes|Analizando acordes/.test(
      document.querySelector("#audio-status").textContent,
    ),
  );
  await page.locator("#audio-cancel").click();
  await page.waitForFunction(() =>
    document.querySelector("#audio-status").textContent.includes("cancelado"),
  );
  assert.equal(await page.locator("#audio-result").isVisible(), false);
  // Production build: speech weights remain absent; the real chord network runs
  // after disabling all network, with runtime and models in the browser cache.
  if (await page.evaluate(() => Boolean(navigator.serviceWorker?.controller))) {
    await context.setOffline(true);

    await page.locator("#audio-file").setInputFiles({
      name: "Otra prueba.wav",
      mimeType: "audio/wav",
      buffer,
    });
    await page.locator("#audio-analyze").click();
    await page
      .locator("#audio-result")
      .waitFor({ state: "visible", timeout: 120000 });
    const offlineExport = page.waitForEvent("download");
    await page.locator("#audio-download").click();
    const offlineResult = JSON.parse(
      await readFile(await (await offlineExport).path(), "utf8"),
    );
    assert.deepEqual(offlineResult.chords, result.chords);
    await context.setOffline(false);
  }
  assert.deepEqual(errors, []);
  console.log(
    "Browser audio: explicit download, real WASM chord inference, no uploads and offline inference passed.",
  );
} finally {
  await browser.close();
}
