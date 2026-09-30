// Opt-in real CPU inference on local audio. No private fixtures enter Git.
// Run download-browser-research.py, build, start the static site, then:
// CHORDLEAF_URL=http://127.0.0.1:5191 node experiments/audio/verify-browser-whisper.mjs /absolute/audio.wav
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import catalog from "../../src/browser-audio/catalog.json" with { type: "json" };
if (!process.argv[2])
  throw new Error("Provide local audio paths for verification");
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    locale: "es-ES",
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  const errors = [],
    uploads = [],
    remote = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      request.method() === "POST" ||
      request.url().includes("/api/audio-import")
    )
      uploads.push(request.url());
    if (
      new URL(request.url()).origin !==
      new URL(process.env.CHORDLEAF_URL).origin
    )
      remote.push(request.url());
  });
  await page.route("https://huggingface.co/**", async (route) => {
    const file = catalog.whisper.find(
      (file) => file.url === route.request().url(),
    );
    assert.ok(file, "Only explicitly pinned Whisper assets may be downloaded");
    await route.fulfill({
      body: await readFile(
        new URL(
          "../../artifacts/browser-audio/models/whisper/" + file.name,
          import.meta.url,
        ),
      ),
    });
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "gpu", { value: undefined });
    const Original = window.Worker;
    window.voiceResults = [];
    window.voiceProgress = [];
    window.Worker = class extends Original {
      constructor(url, options) {
        super(url, options);
        if (/analyze\.worker/.test(String(url)))
          this.addEventListener("message", (event) => {
            if (event.data.result) window.voiceResults.push(event.data.result);
            if (event.data.status) window.voiceProgress.push(event.data.status);
          });
      }
    };
  });
  await page.goto(process.env.CHORDLEAF_URL);
  await page.locator("#empty-new").click();
  await page.locator("#audio").click();
  await page
    .locator("#audio-browser-model-dialog")
    .waitFor({ state: "visible" });
  assert.equal(await page.locator("#browser-model-whisper").isChecked(), true);
  assert.equal(await page.locator("#browser-model-qwen").isDisabled(), true);
  await page.locator("#browser-model-next").click();
  await page
    .locator("#audio-browser-model-dialog")
    .waitFor({ state: "hidden", timeout: 120000 });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const downloaded = remote.length;
  await context.setOffline(true);
  const results = [];
  for (let i = 2; i < process.argv.length; i++) {
    if (i > 2) {
      await page.locator("#new").click();
      await page.locator("#audio").click();
    }
    await page.waitForFunction(
      () => !document.querySelector("#audio-file").disabled,
    );
    await page.locator("#audio-file").setInputFiles(process.argv[i]);
    if (process.env.CHORDLEAF_VOICE_LANGUAGE)
      await page
        .locator("#audio-language")
        .selectOption(process.env.CHORDLEAF_VOICE_LANGUAGE);
    assert.equal(
      await page.evaluate(() => {
        const dialog = document.querySelector("#new-dialog");
        return (
          dialog.scrollHeight <= dialog.clientHeight &&
          dialog.getBoundingClientRect().bottom <= innerHeight
        );
      }),
      true,
      "Selected audio dialog fits a 720px laptop viewport",
    );
    await page.locator("#audio-analyze").click();
    await page.locator("#audio-progress-view").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#audio-upload-controls").isVisible(),
      false,
    );
    await page
      .locator("#new-dialog")
      .waitFor({ state: "hidden", timeout: 180000 });
    const result = await page.evaluate(() => window.voiceResults.at(-1));
    assert.match(result.engines.lyrics, /Whisper-Base/);
    assert.ok(result.words.length > 0);
    assert.ok(result.chords.length > 0);
    assert.ok(!result.warnings.includes("lyrics-failed"));
    assert.ok(
      result.words.every(
        (word) => Number.isFinite(word.start) && word.end > word.start,
      ),
    );
    const progress = await page.evaluate(() => window.voiceProgress);
    assert.ok(progress.length > 5);
    assert.ok(
      progress.every(
        (step, index) =>
          Number.isFinite(step.percent) &&
          step.percent >= 0 &&
          step.percent <= 97 &&
          (!index || step.percent >= progress[index - 1].percent),
      ),
    );
    results.push(result);
    console.log(
      `CPU song ${i - 1}: ${result.duration.toFixed(2)}s audio, ${result.metrics.seconds.toFixed(2)}s analysis, ${result.words.length} lyric intervals`,
    );
    await page.evaluate(() => {
      window.voiceProgress = [];
    });
  }
  assert.equal(
    remote.length,
    downloaded,
    "No model requests during offline inference",
  );
  assert.deepEqual(uploads, []);
  assert.deepEqual(errors, []);
  await writeFile(
    new URL(
      `../../artifacts/browser-audio/whisper-cpu-${process.env.CHORDLEAF_VOICE_LANGUAGE || "auto"}-results.json`,
      import.meta.url,
    ),
    JSON.stringify(results, null, 2),
  );
  console.log(
    "Real Whisper CPU: word timestamps, compact dialog, local editor creation and repeated offline inference passed.",
  );
} finally {
  await browser.close();
}
