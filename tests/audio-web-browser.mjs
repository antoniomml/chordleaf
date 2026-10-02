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
    window.audioResults = [];
    // The reported quota is deliberately smaller than the chord bundle. It
    // is an estimate; successful real Cache writes must remain allowed.
    navigator.storage.estimate = async () => ({ quota: 1e6, usage: 0 });
    const put = Cache.prototype.put;
    window.failModelWrite = true;
    window.failModelInternally = true;
    window.completedModelWrites = [];
    Cache.prototype.put = async function (request, response) {
      const url = String(request);
      if (window.failModelInternally && url.includes("net-1.onnx"))
        throw new DOMException("Unexpected internal error", "UnknownError");
      if (window.failModelWrite && url.includes("net-1.onnx"))
        throw new DOMException("Origin quota reached", "QuotaExceededError");
      const result = await put.call(this, request, response);
      if (url.includes("/models/")) window.completedModelWrites.push(url);
      return result;
    };
    window.Worker = class extends OriginalWorker {
      constructor(url, options) {
        super(url, options);
        this.audioAnalysis = /analyze\.worker/.test(String(url));
        if (this.audioAnalysis)
          this.addEventListener("message", (event) => {
            if (event.data.result) window.audioResults.push(event.data.result);
          });
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
    await page.evaluate(axe.source);
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
  const mandatory = page.locator("#browser-required-chords");
  assert.equal(await mandatory.isChecked(), true);
  assert.equal(await mandatory.isDisabled(), true);
  assert.ok(
    await page
      .locator(".browser-chord-required")
      .evaluate((el) => el.classList.contains("is-selected")),
  );
  assert.match(
    await page.locator(".browser-chord-models legend").textContent(),
    /Acordes.*Obligatorio/,
  );
  assert.match(
    await page.locator("#browser-voice-heading").textContent(),
    /Letra.*Opcional/,
  );
  assert.ok(
    await page
      .locator("#browser-chords-download")
      .evaluate((el) => el.classList.contains("primary")),
  );
  const voiceBefore = await page
    .locator('input[name="browser-audio-model"]:checked')
    .getAttribute("id");
  await page.locator(".browser-chord-required").click();
  assert.equal(
    await page
      .locator('input[name="browser-audio-model"]:checked')
      .getAttribute("id"),
    voiceBefore,
  );
  assert.deepEqual(downloads, []);
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
  await page.screenshot({ path: "artifacts/audio-browser-models.png" });
  await page.locator("#browser-model-chords").click();
  assert.deepEqual(downloads, []);
  await page.locator("#browser-model-next").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#browser-model-status")
      .textContent.includes("navegación privada"),
  );
  await page.waitForFunction(
    () => !document.querySelector("#browser-model-next").disabled,
  );
  assert.equal(
    await page.locator("#audio-browser-model-dialog").isVisible(),
    true,
  );
  await page.evaluate(() => {
    window.failModelInternally = false;
  });
  await page.locator("#browser-model-next").click();
  await page.waitForFunction(
    () =>
      document
        .querySelector("#browser-model-status")
        .textContent.includes("límite de almacenamiento"),
    { timeout: 120000 },
  );
  await page.waitForFunction(
    () => !document.querySelector("#browser-model-next").disabled,
  );
  const storageError = await page
    .locator("#browser-model-status")
    .textContent();
  await page.waitForTimeout(300);
  assert.equal(await page.locator("#browser-model-status").isVisible(), true);
  assert.equal(
    await page.locator("#browser-model-status").textContent(),
    storageError,
  );
  assert.equal(
    await page.locator("#audio-browser-model-dialog").isVisible(),
    true,
  );
  const completedWrites = await page.evaluate(
    () => window.completedModelWrites,
  );
  assert.ok(completedWrites.length > 0);
  const completedRequests = new Map(
    completedWrites.map((url) => [
      url,
      downloads.filter((request) => request === url).length,
    ]),
  );
  await page.evaluate(() => {
    window.failModelWrite = false;
  });
  await page.locator("#browser-model-next").click();
  await page
    .locator("#audio-browser-model-dialog")
    .waitFor({ state: "hidden", timeout: 120000 });
  for (const [url, count] of completedRequests)
    assert.equal(downloads.filter((request) => request === url).length, count);
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
  // A second setup session can upgrade the cached chords to lyrics. The
  // hardware fixture is only for the menu: no speech graph or fake weights run.
  const upgrade = await context.newPage(),
    upgradeRequests = [];
  upgrade.on("pageerror", (error) => errors.push(error.message));
  upgrade.on("request", (request) => upgradeRequests.push(request.url()));
  await upgrade.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", {
      value: {
        requestAdapter: async () => ({ features: new Set(["shader-f16"]) }),
      },
    }),
  );
  await upgrade.route("https://huggingface.co/**", (route) => route.abort());
  await upgrade.goto(url);
  await upgrade.getByRole("button", { name: "Usar aquí", exact: true }).click();
  await upgrade.locator("#new").click();
  await upgrade.locator("#audio").click();
  await upgrade.waitForFunction(
    () => !document.querySelector("#audio-file").disabled,
  );
  await upgrade.locator("#audio-model-settings").click();
  await upgrade.locator("#browser-model-qwen").check();
  await upgrade.locator("#browser-model-next").click();
  await upgrade.waitForFunction(() =>
    document
      .querySelector("#browser-model-status")
      .textContent.includes("conexión"),
  );
  await upgrade.waitForFunction(
    () => !document.querySelector("#browser-model-next").disabled,
  );
  await upgrade.waitForTimeout(300);
  assert.equal(
    await upgrade.locator("#browser-model-status").isVisible(),
    true,
  );
  assert.equal(await upgrade.locator("#browser-model-qwen").isChecked(), true);
  assert.match(
    await upgrade.locator("#browser-chords-state").textContent(),
    /Ya en tu dispositivo/,
  );
  assert.ok(upgradeRequests.some((url) => url.includes("huggingface.co")));
  assert.equal(
    upgradeRequests.some((url) => url.includes("/api/audio-import")),
    false,
  );
  await upgrade.locator("#browser-model-chords").check();
  await upgrade.locator("#browser-model-next").click();
  await upgrade
    .locator("#audio-browser-model-dialog")
    .waitFor({ state: "hidden" });
  await upgrade.close();
  await page.getByRole("button", { name: "Usar aquí", exact: true }).click();
  await page.locator("#empty-new").click();
  await page.locator("#audio").click();
  await page.waitForFunction(
    () => !document.querySelector("#audio-file").disabled,
  );
  const reusedResources = downloads.length;
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
    const time = i / 22050,
      onset = time % 0.5;
    const value =
      [130.8128, 164.8138, 195.9977, 261.6256, 329.6276].reduce(
        (sum, frequency) => {
          for (let harmonic = 1; harmonic <= 8; harmonic++) {
            sum +=
              (Math.sin(2 * Math.PI * frequency * harmonic * time) *
                Math.exp(-onset * (2 + harmonic * 0.3))) /
              harmonic;
          }
          return sum;
        },
        0,
      ) / 18;
    buffer.writeInt16LE(Math.round(value * 32767), 44 + 2 * i);
  }
  const picker = page.waitForEvent("filechooser");
  await page.locator("#audio-file-name").click();
  await (
    await picker
  ).setFiles({ name: "Acorde local.wav", mimeType: "audio/wav", buffer });
  await page.locator("#audio-analyze").click();
  await page.waitForFunction(
    () =>
      window.audioResults.length > 0 ||
      !document.querySelector("#import-error").hidden,
    null,
    { timeout: 120000 },
  );
  await page
    .locator("#new-dialog")
    .waitFor({ state: "hidden", timeout: 120000 });
  assert.equal(await page.locator("#source").isVisible(), true);
  assert.equal(await page.locator("#audio-result").count(), 0);
  const result = await page.evaluate(() => window.audioResults.at(-1));
  assert.match(result.engines.chords, /lv-chordia-web/);
  assert.ok(result.chords.some((chord) => chord.label !== "N"));
  assert.equal(result.duration, 4);
  assert.deepEqual(result.words, []);
  assert.deepEqual(uploads, []);
  const importedText = await page.locator("#source").inputValue();
  assert.match(importedText, /\[[^\]]+\]/);
  await page.locator("#new").click();
  await page.locator("#audio").click();
  await page.waitForFunction(
    () => !document.querySelector("#audio-file").disabled,
  );
  await page
    .locator("#audio-file")
    .setInputFiles({ name: "Cancelar.wav", mimeType: "audio/wav", buffer });
  await page.locator("#audio-analyze").click();
  await page.waitForFunction(() =>
    /Detectando acordes/.test(
      document.querySelector("#audio-progress-stage").textContent,
    ),
  );
  assert.equal(await page.locator("#audio-upload-controls").isVisible(), false);
  assert.equal(await page.locator("#audio-model-settings").isVisible(), false);
  assert.match(
    await page.locator("#audio-progress-percent").textContent(),
    /\d+ %/,
  );
  await checkAccessibility("analysis progress");
  await page.locator("#audio-cancel").click();
  await page.waitForFunction(() =>
    document.querySelector("#audio-status").textContent.includes("cancelado"),
  );
  await page.waitForTimeout(50);
  assert.ok(await page.evaluate(() => window.staleAudioMessages >= 2));
  assert.match(await page.locator("#audio-status").textContent(), /cancelado/);
  assert.equal(await page.locator("#audio-result").count(), 0);
  assert.equal(await page.locator(".tab").count(), 1);
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
      .locator("#new-dialog")
      .waitFor({ state: "hidden", timeout: 120000 });
    const offlineResult = await page.evaluate(() => window.audioResults.at(-1));
    assert.deepEqual(offlineResult.chords, result.chords);
    assert.equal(await page.locator("#source").inputValue(), importedText);
    assert.equal(await page.locator(".tab").count(), 2);
    await context.setOffline(false);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(
    downloads.slice(reusedResources).filter((url) => !/ort-wasm/.test(url)),
    [],
  );
  if (await page.evaluate(() => Boolean(navigator.serviceWorker?.controller))) {
    assert.ok(runtimeResponses.slice(runtimeDownloaded).length > 0);
    assert.ok(runtimeResponses.slice(runtimeDownloaded).every(Boolean));
  }
  if (!(await page.locator("#new-dialog").isVisible())) {
    await page.locator("#new").click();
    await page.locator("#audio").click();
    await page.waitForFunction(
      () => !document.querySelector("#audio-file").disabled,
    );
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
    /Audio models/,
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
    "Browser audio: quota recovery, chord-to-voice upgrade failure, real WASM chord inference, direct editor opening, no uploads and offline inference passed.",
  );
} finally {
  await browser.close();
}
