import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const url = process.env.CHORDLEAF_URL || "http://localhost:5173";
async function device(memoryGB, locale = "es-ES") {
  const page = await browser.newPage({
    locale,
    viewport: { width: 1280, height: 980 },
  });
  await page.addInitScript(
    ({ memoryGB }) => {
      window.__audioTest = {
        readiness: {
          available: true,
          neural: true,
          lyrics: false,
          qwen: false,
        },
        state: { stage: "idle", active: false },
        downloads: [],
        cancellations: 0,
      };
      window.chordleafDesktop = {
        system: async () => ({ platform: "darwin", arch: "arm64", memoryGB }),
        models: async () => window.__audioTest.state,
        install: async (model) => {
          window.__audioTest.downloads.push(model);
          return (window.__audioTest.state = {
            stage: "download",
            active: true,
            model,
          });
        },
        cancel: async () => {
          window.__audioTest.cancellations++;
          return (window.__audioTest.state = {
            stage: "cancelled",
            active: false,
          });
        },
        remove: async () => {
          window.__audioTest.readiness.lyrics = false;
          window.__audioTest.readiness.qwen = false;
          return (window.__audioTest.state = { stage: "idle", active: false });
        },
        cancelAnalysis: async () => true,
      };
    },
    { memoryGB },
  );
  await page.route("**/api/audio-import*", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: await page.evaluate(() => window.__audioTest.readiness),
      });
    const query = new URL(route.request().url()).searchParams;
    assert.equal(query.get("engine"), "neural");
    assert.equal(query.get("lyricsEngine"), "whisper");
    assert.equal(query.get("language"), "fr");
    return route.fulfill({
      json: {
        version: 1,
        duration: 5,
        chords: [{ start: 0, end: 5, label: "Cmaj7" }],
        words: [{ start: 1, end: 2, text: "Bonjour", line: 0 }],
      },
    });
  });
  await page.goto(url);
  await page.locator("#empty-new").click();
  await page.locator("#audio").click();
  await page.locator("#audio-model-dialog").waitFor({ state: "visible" });
  return page;
}
try {
  const page = await device(32);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  assert.equal(
    await page.locator('[name="audio-model"][value="whisper"]').isChecked(),
    true,
  );
  assert.match(
    await page.locator("#audio-chord-model-state").textContent(),
    /Incluido/,
  );
  assert.deepEqual(await page.evaluate(() => window.__audioTest.downloads), []);
  await page.screenshot({ path: "artifacts/audio-onboarding-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({ path: "artifacts/audio-onboarding-mobile.png" });
  await page.locator('[name="audio-model"][value="none"]').check();
  await page.locator("#audio-model-continue").click();
  await page.locator("#import-back").click();
  await page.locator("#audio").click();
  await page.waitForFunction(
    () => !document.querySelector("#audio-file").disabled,
  );
  assert.equal(await page.locator("#audio-model-dialog").isVisible(), false);
  await page.locator("#audio-model-settings").click();
  await page.locator('[name="audio-model"][value="whisper"]').check();
  await page.locator("#audio-model-continue").click();
  await page.locator("#audio-cancel-models").waitFor({ state: "visible" });
  assert.deepEqual(await page.evaluate(() => window.__audioTest.downloads), [
    "whisper",
  ]);
  await page.locator("#audio-cancel-models").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#audio-model-status")
      .textContent.includes("pausada"),
  );
  await page.locator("#audio-model-continue").click();
  await page.evaluate(() => {
    window.__audioTest.readiness.lyrics = true;
    window.__audioTest.readiness.qwen = true;
    window.__audioTest.state = {
      stage: "complete",
      active: false,
      model: "whisper",
    };
  });
  await page.locator("#audio-whisper-installed").waitFor({ state: "visible" });
  await page.locator("#audio-model-continue").click();
  await page.waitForFunction(
    () => !document.querySelector("#audio-model-dialog").open,
  );
  await page.locator("#audio-model-settings").click();
  await page.locator('[name="audio-model"][value="none"]').check();
  await page.locator("#audio-model-continue").click();
  await page.locator("#audio-model-dialog").waitFor({ state: "hidden" });
  assert.equal(await page.locator("#audio-lyrics").isChecked(), false);
  await page.locator("#audio-model-settings").click();
  await page.locator('[name="audio-model"][value="whisper"]').check();
  await page.locator("#audio-model-continue").click();
  await page.locator("#audio-model-dialog").waitFor({ state: "hidden" });
  assert.equal(await page.locator("#audio-lyrics").isChecked(), true);
  assert.match(
    await page.locator("#audio-model-name").textContent(),
    /Whisper/,
  );
  assert.equal(await page.locator("#audio-language option").count(), 11);
  assert.equal(await page.locator("#audio-engine").count(), 0);
  await page.locator("#audio-language").selectOption("fr");
  await page.locator("#audio-file").setInputFiles({
    name: "Chanson.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("mock audio"),
  });
  await page.locator("#audio-analyze").click();
  await page.locator("#new-dialog").waitFor({ state: "hidden" });
  assert.match(await page.locator("#source").inputValue(), /Bonjour/);
  await page.reload();
  await page.locator("#mobile-tab-plus").click();
  await page.locator("#audio").click();
  await page.waitForFunction(
    () => !document.querySelector("#audio-file").disabled,
  );
  assert.equal(await page.locator("#audio-model-dialog").isVisible(), false);
  // The saved Whisper preference wins even when Qwen becomes available later.
  await page.evaluate(() => {
    window.__audioTest.readiness.lyrics = true;
    window.__audioTest.readiness.qwen = true;
  });
  await page.locator("#import-back").click();
  await page.locator("#audio").click();
  await page.waitForFunction(() =>
    document.querySelector("#audio-model-name").textContent.includes("Whisper"),
  );
  assert.deepEqual(errors, []);
  const lighter = await device(8, "en-US");
  assert.equal(
    await lighter.locator('[name="audio-model"][value="whisper"]').isChecked(),
    true,
  );
  assert.equal(
    await lighter
      .locator('#audio-model-dialog [data-kind="recommended"]')
      .count(),
    0,
  );
  assert.equal(await lighter.locator("#audio-recommendation").count(), 0);
  assert.equal(
    await lighter.locator("#audio-model-heading").textContent(),
    "Prepare your device",
  );
  await lighter.keyboard.press("Escape");
  await lighter.locator("#import-back").click();
  await lighter.locator("#audio").click();
  await lighter.waitForFunction(
    () => !document.querySelector("#audio-file").disabled,
  );
  assert.equal(await lighter.locator("#audio-model-dialog").isVisible(), false);
  console.log(
    "Audio preparation: explicit downloads, no recommendations, cancellation, persistent preferences, languages, English and mobile passed.",
  );
} finally {
  await browser.close();
}
