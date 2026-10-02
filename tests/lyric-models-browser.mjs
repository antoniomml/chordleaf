// UI/cache lifecycle only. Real weight inference is opt-in via
// experiments/audio/verify-browser-whisper.mjs, not mocked here.
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import catalog from "../src/browser-audio/catalog.json" with { type: "json" };
const url = process.env.CHORDLEAF_URL || "http://localhost:5173";
const runtime = (await readdir("dist/assets"))
  .filter((name) => name.startsWith("ort-wasm") && /\.(mjs|wasm)$/.test(name))
  .map((name) => "/assets/" + name);
assert.ok(runtime.length >= 2);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 390, height: 844 },
  });
  const errors = [],
    downloads = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("huggingface.co")) downloads.push(request.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "gpu", { value: undefined });
    Object.defineProperty(navigator, "userAgentData", {
      value: { mobile: true },
    });
  });
  await page.goto(url);
  await page.evaluate(
    async ({ files, runtime }) => {
      const cache = await caches.open("chordleaf-audio-models-v1");
      for (const file of [...files, ...runtime.map((url) => ({ url }))])
        await cache.put(
          new URL(file.url, location.origin).href,
          new Response("UI cache fixture"),
        );
    },
    {
      files: ["chords", "whisper-small", "whisper-turbo"].flatMap(
        (name) => catalog[name],
      ),
      runtime,
    },
  );
  await page.locator("#empty-new").click();
  await page.locator("#audio").click();
  await expect(page.locator("#audio-model-settings")).toBeEnabled();
  await page.locator("#audio-model-settings").click();
  await expect(page.locator("#browser-whisper-recommended")).toBeVisible();
  await expect(
    page.locator("#browser-whisper-turbo-recommended"),
  ).not.toBeVisible();
  for (const model of ["whisper", "whisper-small", "whisper-turbo", "qwen"])
    await expect(
      page.locator(`[data-bundle="${model}"] small`).first(),
    ).toContainText("Tiempos por palabra");
  for (const model of ["whisper", "whisper-small", "whisper-turbo"])
    await expect(page.locator("#browser-model-" + model)).toBeEnabled();
  await expect(page.locator("#browser-model-qwen")).toBeDisabled();
  assert.equal(
    await page
      .locator("#audio-browser-model-dialog")
      .evaluate(
        (el) =>
          el.scrollWidth <= el.clientWidth &&
          el.getBoundingClientRect().bottom <= innerHeight,
      ),
    true,
  );
  assert.deepEqual(
    downloads,
    [],
    "reading installed choices never downloads weights",
  );
  for (const model of ["whisper-small", "whisper-turbo"]) {
    await page.locator("#browser-model-" + model).check();
    await expect(page.locator("#browser-" + model + "-state")).toContainText(
      "Ya en tu dispositivo",
    );
    await expect(page.locator("#browser-model-next")).toHaveText("Siguiente");
    await page.locator("#browser-model-next").click();
    await expect(page.locator("#audio-browser-model-dialog")).not.toBeVisible();
    await expect(page.locator("#new-description")).toContainText("borrador");
    await expect(page.locator("#audio-model-name")).toHaveAttribute(
      "data-model",
      model,
    );
    await expect(page.locator("#audio-lyrics")).toBeChecked();
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("chordleaf-browser-audio-mode"),
      ),
      model,
    );
    await page.locator("#audio-model-settings").click();
    await expect(page.locator("#browser-model-" + model)).toBeChecked();
  }
  await page.locator("#browser-whisper-small-remove").click();
  await expect(page.locator("#browser-whisper-small-remove")).not.toBeVisible();
  await expect(page.locator("#browser-whisper-turbo-state")).toContainText(
    "Ya en tu dispositivo",
  );
  await expect(page.locator("#browser-chords-state")).toContainText(
    "Ya en tu dispositivo",
  );
  const retained = await page.evaluate(async (urls) => {
    const cache = await caches.open("chordleaf-audio-models-v1");
    return Promise.all(
      urls.map((url) =>
        cache.match(new URL(url, location.origin).href).then(Boolean),
      ),
    );
  }, runtime);
  assert.ok(
    retained.every(Boolean),
    "removing Small retains the shared runtime",
  );
  await page.route("https://huggingface.co/**", (route) => route.abort());
  await page.locator("#browser-model-whisper-small").check();
  await page.locator("#browser-model-next").click();
  await expect(page.locator("#browser-model-status")).toContainText("conexión");
  await expect(page.locator("#browser-model-next")).toBeEnabled();
  assert.ok(downloads.length > 0);
  assert.ok(
    downloads.every((url) => url.includes("whisper-small_timestamped")),
    "a failed Small download does not fetch another model",
  );
  await expect(page.locator("#browser-whisper-turbo-state")).toContainText(
    "Ya en tu dispositivo",
  );
  await page.screenshot({ path: "artifacts/lyric-models-mobile.png" });
  assert.deepEqual(errors, []);
  for (const gpu of [true, false]) {
    const desktop = await browser.newPage();
    await desktop.addInitScript((gpu) => {
      Object.defineProperty(navigator, "deviceMemory", { value: 8 });
      Object.defineProperty(navigator, "hardwareConcurrency", { value: 8 });
      Object.defineProperty(navigator, "gpu", {
        value: gpu
          ? {
              requestAdapter: async () => ({
                features: new Set(["shader-f16"]),
              }),
            }
          : undefined,
      });
    }, gpu);
    await desktop.goto(url + "/en/");
    await desktop.locator("#empty-new").click();
    await desktop.locator("#audio").click();
    const model = gpu ? "qwen" : "whisper-small";
    await expect(
      desktop.locator("#browser-" + model + "-recommended"),
    ).toBeVisible();
    await expect(desktop.locator("#browser-model-" + model)).toBeChecked();
    await expect(desktop.locator("#browser-model-hardware")).toContainText(
      "8 GB estimated memory",
    );
    // A saved user choice wins over the hardware recommendation on reopen.
    await desktop.evaluate(() =>
      localStorage.setItem("chordleaf-browser-audio-mode", "whisper"),
    );
    await desktop.locator("#browser-model-close").click();
    await expect(desktop.locator("#new-description")).toContainText("draft");
    await desktop.locator("#audio-model-settings").click();
    await expect(desktop.locator("#browser-model-whisper")).toBeChecked();
    await desktop.close();
  }
  console.log(
    "Whisper Small/Turbo: CPU choices, independent cache, selection, persistence, removal, retained runtime, failed download and mobile layout passed.",
  );
} finally {
  await browser.close();
}
