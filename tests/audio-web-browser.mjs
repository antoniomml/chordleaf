import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import axe from "axe-core";
const browser = await chromium.launch({ headless: true });
const url = process.env.CHORDLEAF_URL || "http://localhost:5173";
try {
  const context = await browser.newContext({
    locale: "es-ES",
    viewport: { width: 1280, height: 1000 },
  });
  const page = await context.newPage();
  const uploads = [],
    downloads = [],
    runtimeResponses = [],
    errors = [];
  page.on("request", (request) => {
    if (/\/models\/|ort-wasm|huggingface/.test(request.url()))
      downloads.push(request.url());
    if (
      request.method() === "POST" ||
      new URL(request.url()).pathname.startsWith("/api/audio-import")
    )
      uploads.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (/ort-wasm/.test(response.url()))
      runtimeResponses.push(response.fromServiceWorker());
  });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", { value: undefined }),
  );
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    window.staleAudioMessages = 0;
    window.Worker = class extends OriginalWorker {
      constructor(url, options) {
        super(url, options);
        this.audioAnalysis = /analyze\.worker/.test(String(url));
      }
      terminate() {
        const callback = this.onmessage;
        super.terminate();
        if (this.audioAnalysis)
          setTimeout(() => {
            window.staleAudioMessages++;
            callback?.call(this, {
              data: { status: "stale-worker-message" },
            });
          }, 0);
      }
    };
  });
  await page.goto(url);
  await page.locator("#empty-new").click();
  await page.locator("#audio").click();
  await page
    .locator("#audio-browser-model-dialog")
    .waitFor({ state: "visible" });
  await page.evaluate(axe.source);
  async function checkAccessibility(state) {
    const result = await page.evaluate(() => axe.run());
    assert.deepEqual(
      result.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map(({ target }) => target),
      })),
      [],
      state,
    );
  }
  await checkAccessibility("browser model selection");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page
      .locator("#audio-browser-model-dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  );
  await checkAccessibility("mobile browser model selection");
  await page.setViewportSize({ width: 1280, height: 1000 });
  assert.equal(await page.locator("#browser-model-qwen").isDisabled(), true);
  assert.equal(await page.locator("#browser-chords-remove").isVisible(), false);
  assert.match(
    await page.locator("#browser-chords-state").textContent(),
    /13 MB/,
  );
  assert.deepEqual(uploads, []);
  await page.locator("#browser-model-chords").click();
  assert.deepEqual(downloads, []);
  await page.locator("#browser-model-next").click();
  await page
    .locator("#audio-browser-model-dialog")
    .waitFor({ state: "hidden", timeout: 120000 });
  assert.equal(await page.locator("#audio-lyrics").isChecked(), false);
  assert.equal(await page.locator("#audio-lyrics").isDisabled(), true);
  assert.ok(
    await page
      .locator("#audio-lyrics-option")
      .evaluate((el) => parseFloat(getComputedStyle(el).opacity) < 0.5),
  );
  assert.equal(await page.locator("#audio-enable-lyrics").count(), 0);
  assert.equal(await page.locator(".audio-capture").count(), 0);
  await checkAccessibility("audio file and disabled lyrics");
  const downloaded = downloads.length;
  await page.locator("#audio-model-settings").click();
  await page
    .locator("#audio-browser-model-dialog")
    .waitFor({ state: "visible" });
  assert.match(
    await page.locator("#browser-chords-state").textContent(),
    /Ya en tu dispositivo/,
  );
  assert.equal(await page.locator("#browser-chords-remove").isVisible(), true);
  assert.equal(await page.locator("#browser-qwen-remove").isVisible(), false);
  assert.equal(
    await page.locator("#browser-model-next").textContent(),
    "Siguiente",
  );
  await page.locator("#browser-model-next").click();
  await page
    .locator("#audio-browser-model-dialog")
    .waitFor({ state: "hidden" });
  assert.equal(downloads.length, downloaded);
  const runtimeDownloaded = runtimeResponses.length;
  // An interrupted voice download can be removed without discarding the
  // usable chord engine. This fixture registers only a small config file.
  const catalog = JSON.parse(
    await readFile(
      new URL("../src/browser-audio/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  const voiceConfig = catalog.qwen.find((file) => file.name === "config.json");
  await page.evaluate(async (url) => {
    const cache = await caches.open("chordleaf-audio-models-v1");
    await cache.put(url, new Response("{}"));
  }, voiceConfig.url);
  await page.locator("#audio-model-settings").click();
  await page.locator("#browser-qwen-remove").waitFor({ state: "visible" });
  await page.locator("#browser-qwen-remove").click();
  await page.locator("#browser-qwen-remove").waitFor({ state: "hidden" });
  assert.match(
    await page.locator("#browser-chords-state").textContent(),
    /Ya en tu dispositivo/,
  );
  assert.equal(
    await page.evaluate(
      async (url) =>
        Boolean(
          await (await caches.open("chordleaf-audio-models-v1")).match(url),
        ),
      voiceConfig.url,
    ),
    false,
  );
  await page.locator("#browser-model-next").click();
  await page
    .locator("#audio-browser-model-dialog")
    .waitFor({ state: "hidden" });
  const buffer = Buffer.alloc(44 + 22050 * 2);
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
  for (let i = 0; i < 22050; i++) {
    const value =
      [261.6256, 329.6276, 391.9954].reduce(
        (s, f) => s + Math.sin((2 * Math.PI * f * i) / 22050),
        0,
      ) / 6;
    buffer.writeInt16LE(Math.round(value * 32767), 44 + 2 * i);
  }
  const picker = page.waitForEvent("filechooser");
  await page.locator("#audio-file-name").click();
  await (
    await picker
  ).setFiles({ name: "Acorde local.wav", mimeType: "audio/wav", buffer });
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
  assert.equal(result.duration, 1);
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
  await page.waitForTimeout(50);
  assert.ok(await page.evaluate(() => window.staleAudioMessages >= 2));
  assert.match(await page.locator("#audio-status").textContent(), /cancelado/);
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
  assert.deepEqual(
    downloads.slice(downloaded).filter((url) => !/ort-wasm/.test(url)),
    [],
  );
  if (await page.evaluate(() => Boolean(navigator.serviceWorker?.controller))) {
    assert.ok(runtimeResponses.slice(runtimeDownloaded).length > 0);
    assert.ok(runtimeResponses.slice(runtimeDownloaded).every(Boolean));
  }
  await page.locator("#audio-model-settings").click();
  await page.locator("#browser-chords-remove").click();
  await page.locator("#browser-chords-remove").waitFor({ state: "hidden" });
  assert.match(
    await page.locator("#browser-chords-state").textContent(),
    /13 MB/,
  );
  assert.equal(await page.locator("#audio-file").isDisabled(), true);
  assert.equal(
    await page.locator("#browser-model-next").textContent(),
    "Descargar y continuar",
  );
  const english = await browser.newPage({ locale: "en-US" });
  await english.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", { value: undefined }),
  );
  await english.goto(url);
  await english.locator("#empty-new").click();
  await english.locator("#audio").click();
  await english
    .locator("#audio-browser-model-dialog")
    .waitFor({ state: "visible" });
  assert.match(
    await english.locator("#audio-browser-model-dialog h2").textContent(),
    /What would you like to get/,
  );
  assert.match(
    await english.locator("#browser-chords-state").textContent(),
    /Download.*13 MB/,
  );
  await english.locator("#browser-model-close").click();
  assert.equal(
    await english.getByText("Use audio from YouTube", { exact: true }).count(),
    0,
  );
  await english.close();
  console.log(
    "Browser audio: explicit download, real WASM chord inference, no uploads and offline inference passed.",
  );
} finally {
  await browser.close();
}
