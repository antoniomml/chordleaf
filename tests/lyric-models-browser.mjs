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
  await expect(
    page.locator('#audio-browser-model-dialog [data-kind="recommended"]'),
  ).toHaveCount(0);
  assert.deepEqual(
    await page
      .locator(".browser-voice-scroll .browser-model-card")
      .evaluateAll((cards) => cards.map((card) => card.dataset.bundle)),
    ["whisper", "whisper-small", "qwen", "whisper-turbo", "chords"],
  );
  await expect(page.locator("#browser-model-hardware")).toHaveCount(0);
  const fixedBefore = await page
    .locator("#browser-voice-heading")
    .boundingBox();
  await page.locator(".browser-voice-scroll").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  assert.deepEqual(
    await page.locator("#browser-voice-heading").boundingBox(),
    fixedBefore,
  );
  await expect(page.locator("#browser-required-chords")).toBeVisible();
  await expect(page.locator("#browser-model-chords")).toBeVisible();
  for (const model of ["whisper", "whisper-small", "whisper-turbo", "qwen"])
    await expect(
      page.locator(`[data-bundle="${model}"] small`).first(),
    ).toHaveText(model === "qwen" ? "WebGPU" : "CPU");
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
    await expect(page.locator("#audio-model-name")).toHaveText(
      (model === "whisper-small" ? "Whisper Small" : "Whisper Large v3 Turbo") +
        " · LV-Chordia",
    );
    await expect(page.locator("#audio-experimental")).toBeVisible();
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const buttonBefore = await page.locator("#audio-analyze").boundingBox();
      await page.locator("#audio-lyrics").uncheck();
      await expect(page.locator("#audio-language")).toBeVisible();
      await expect(page.locator("#audio-language")).toBeDisabled();
      const buttonAfter = await page.locator("#audio-analyze").boundingBox();
      assert.equal(
        buttonAfter.y,
        buttonBefore.y,
        "the language field keeps the action row in place",
      );
      await page.locator("#audio-lyrics").check();
      await expect(page.locator("#audio-language")).toBeEnabled();
      const settings = await page
        .locator("#audio-model-settings")
        .boundingBox();
      assert.equal(
        settings.y + settings.height / 2,
        buttonBefore.y + buttonBefore.height / 2,
      );
      assert.equal(
        await page
          .locator("#new-dialog")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
        true,
      );
    }
    await page.screenshot({ path: "artifacts/audio-import-mobile.png" });
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
  for (const { gpu, memory, cores } of [
    { gpu: true, memory: 8, cores: 8 },
    { gpu: false, memory: 8, cores: 8 },
    { gpu: true, memory: null, cores: 8 },
    { gpu: true, memory: 8, cores: null },
  ]) {
    const desktop = await browser.newPage();
    await desktop.addInitScript(
      ({ gpu, memory, cores }) => {
        Object.defineProperty(navigator, "deviceMemory", { value: memory });
        Object.defineProperty(navigator, "hardwareConcurrency", {
          value: cores,
        });
        Object.defineProperty(navigator, "gpu", {
          value: gpu
            ? {
                requestAdapter: async () => ({
                  features: new Set(["shader-f16"]),
                }),
              }
            : undefined,
        });
      },
      { gpu, memory, cores },
    );
    await desktop.goto(url + "/en/");
    await desktop.locator("#empty-new").click();
    await desktop.locator("#audio").click();
    await expect(
      desktop.locator('#audio-browser-model-dialog [data-kind="recommended"]'),
    ).toHaveCount(0);
    await expect(desktop.locator("#browser-model-whisper")).toBeChecked();
    await expect(desktop.locator("#browser-model-hardware")).toHaveCount(0);
    // A saved user choice is retained on reopen.
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
