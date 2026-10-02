// Opt-in real CPU inference on local audio. No private fixtures enter Git.
// Run download-browser-research.py, build, start the static site, then:
// CHORDLEAF_URL=http://127.0.0.1:5191 node experiments/audio/verify-browser-whisper.mjs /absolute/audio.wav
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import catalog from "../../src/browser-audio/catalog.json" with { type: "json" };
if (!process.argv[2])
  throw new Error("Provide local audio paths for verification");
const model = process.env.CHORDLEAF_VOICE_MODEL || "whisper";
if (!["whisper", "whisper-small", "whisper-turbo"].includes(model))
  throw new Error("Unknown Whisper model");
// Stream large weights directly to Chromium. Playwright's route.fulfill
// serializes buffers as base64 and exceeds Node's string limit for Turbo.
const assets = createServer((request, response) => {
  const file = catalog[model].find((file) => "/" + file.name === request.url);
  if (!file) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/octet-stream",
  });
  createReadStream(
    new URL(
      "../../artifacts/browser-audio/models/" + model + "/" + file.name,
      import.meta.url,
    ),
  ).pipe(response);
});
await new Promise((resolve) => assets.listen(0, "127.0.0.1", resolve));
// A regular disk-backed profile mirrors the installed PWA. Incognito contexts
// impose a memory-only Blob limit below Turbo's 645 MB encoder file.
const profile = await mkdtemp(join(tmpdir(), "chordleaf-whisper-"));
const context = await chromium.launchPersistentContext(profile, {
  headless: true,
  locale: "es-ES",
  // The pinned public-weight requests are redirected to a temporary local
  // fixture server on another port. Production requests use the allowed HF
  // origins; only this local verifier needs that extra connection origin.
  bypassCSP: true,
  viewport: { width: 1280, height: 720 },
});
try {
  const page = await context.newPage();
  const errors = [],
    uploads = [],
    remote = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") console.log("Browser:", message.text());
  });
  page.on("requestfailed", (request) =>
    console.log("Failed request:", request.url(), request.failure()),
  );
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
    const file = catalog[model].find(
      (file) => file.url === route.request().url(),
    );
    assert.ok(file, "Only explicitly pinned Whisper assets may be downloaded");
    await route.fulfill({
      status: 302,
      headers: {
        Location: `http://127.0.0.1:${assets.address().port}/${file.name}`,
        "Access-Control-Allow-Origin": "*",
      },
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
  await page.locator("#browser-model-" + model).check();
  assert.equal(await page.locator("#browser-model-qwen").isDisabled(), true);
  await page.locator("#browser-model-next").click();
  try {
    await page.waitForFunction(
      () =>
        !document.querySelector("#audio-browser-model-dialog").open ||
        !document.querySelector("#browser-model-next").disabled,
      null,
      { timeout: 120000 },
    );
    assert.equal(
      await page.locator("#audio-browser-model-dialog").isVisible(),
      false,
    );
  } catch (error) {
    console.log(
      "Download state:",
      await page.locator("#browser-model-status").textContent(),
    );
    throw error;
  }
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  console.log(`${model}: verified weights saved; starting offline inference`);
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
    assert.match(result.engines.lyrics, /Whisper/);
    assert.ok(
      result.engines.lyrics
        .toLowerCase()
        .includes(model === "whisper" ? "base" : model.split("-").at(-1)),
    );
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
      `../../artifacts/browser-audio/${model}-cpu-${process.env.CHORDLEAF_VOICE_LANGUAGE || "auto"}-results.json`,
      import.meta.url,
    ),
    JSON.stringify(results, null, 2),
  );
  console.log(
    `Real Whisper CPU: ${results.length} offline imports, word timestamps, compact dialog and local editor creation passed.`,
  );
} finally {
  await context.close();
  assets.closeAllConnections();
  await new Promise((resolve) => assets.close(resolve));
  await rm(profile, { recursive: true, force: true });
}
