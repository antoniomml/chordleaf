// Real chord inference uses the small bundled public model; no private songs
// or external voice weights are needed for this regression suite.
import { chromium, webkit, devices, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import catalog from "../src/browser-audio/catalog.json" with { type: "json" };

const url = process.env.CHORDLEAF_URL || "http://localhost:5173";
await mkdir("artifacts", { recursive: true });
const rate = 22050,
  seconds = 12;
const buffer = Buffer.alloc(44 + rate * seconds * 2);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(buffer.length - 8, 4);
buffer.write("WAVEfmt ", 8);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(rate, 24);
buffer.writeUInt32LE(rate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(buffer.length - 44, 40);
const chords = [
  [261.63, 329.63, 392],
  [220, 261.63, 329.63],
  [174.61, 220, 261.63],
  [196, 246.94, 293.66],
];
for (let i = 0; i < rate * seconds; i++) {
  const tone = chords[Math.floor(i / rate / 3)].reduce(
    (sum, hz) => sum + Math.sin((2 * Math.PI * hz * i) / rate),
    0,
  );
  buffer.writeInt16LE(Math.round(tone * 6000), 44 + i * 2);
}
const file = { name: "private-recording.wav", mimeType: "audio/wav", buffer };
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({
      ...devices["iPhone 14 Pro"],
      locale: "es-ES",
      serviceWorkers: "block",
    });
    await context.addCookies([
      {
        name: "chordleaf-test-auth",
        value: "verified",
        url: new URL("/", url).href,
      },
    ]);
    const page = await context.newPage();
    const errors = [],
      remote = [],
      modelRequests = [];
    let phase = "import";
    page.on("pageerror", (error) => {
      console.log(
        `${engine.name()} page error (${phase}):`,
        error.message,
        error.stack,
      );
      errors.push(error.message);
    });
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/models/"))
        modelRequests.push(request.allHeaders());
      if (
        new URL(request.url()).origin !== new URL(url).origin &&
        !request.url().startsWith("blob:")
      )
        remote.push(request.url());
    });
    await page.addInitScript(() => {
      const OriginalWorker = window.Worker;
      window.audioResults = [];
      window.Worker = class extends OriginalWorker {
        constructor(url, options) {
          super(url, options);
          // Vite development workers can have a blob URL, whereas built
          // workers have a hashed asset URL. Observe the result shape in both.
          this.addEventListener("message", (event) => {
            if (event.data.result?.engines?.chords)
              window.audioResults.push(event.data.result);
          });
        }
      };
    });
    await page.goto(url);
    await page.evaluate(async (files) => {
      localStorage.setItem("chordleaf-browser-audio-mode", "whisper-turbo");
      const cache = await caches.open("chordleaf-audio-models-v1");
      for (const file of files)
        await cache.put(file.url, new Response("Legacy Turbo cache fixture"));
    }, catalog["whisper-turbo"]);
    await page.locator("#empty-new").click();
    await page.locator("#audio").click();
    await expect(page.locator("#audio-browser-model-dialog")).toBeVisible();
    await expect(page.locator("#browser-model-qwen")).toBeDisabled();
    await expect(page.locator("#browser-model-whisper-turbo")).toBeDisabled();
    await expect(page.locator("#browser-turbo-device")).toContainText(
      "Base o Small",
    );
    await expect(page.locator("#browser-model-whisper")).toBeChecked();
    await expect(page.locator("#browser-model-whisper-small")).toBeEnabled();
    await expect(page.locator("#browser-model-device")).toContainText("Safari");
    await page.locator("#browser-model-chords").check();
    await page.locator("#browser-model-next").click();
    await expect(page.locator("#audio-browser-model-dialog")).not.toBeVisible({
      timeout: 60000,
    });
    assert.ok(modelRequests.length > 0);
    for (const headers of await Promise.all(modelRequests))
      assert.match(
        headers.cookie || "",
        /chordleaf-test-auth=verified/,
        "Same-origin model downloads retain deployment authentication",
      );
    await page.locator("#audio-file").setInputFiles(file);
    await page.locator("#audio-analyze").click();
    await expect(page.locator("#new-dialog")).not.toBeVisible({
      timeout: 60000,
    });
    const result = await page.evaluate(() => window.audioResults.at(-1));
    assert.ok(Math.abs(result.duration - seconds) < 0.001);
    assert.deepEqual(result.words, []);
    assert.ok(result.chords.filter((chord) => chord.label !== "N").length >= 3);
    assert.equal(result.engines.chords, "lv-chordia-web-v1/nnAudio-tuned");
    assert.match(await page.locator("#source").inputValue(), /\[[A-G]/);
    assert.deepEqual(
      remote,
      [],
      "Chord download and inference are entirely local",
    );
    await page.locator("#mobile-tab-plus").click();
    await page.locator("#audio").click();
    await expect(page.locator("#audio-diagnostic-options")).toBeVisible();
    await page.locator("#audio-diagnostic-options summary").click();
    const downloading = page.waitForEvent("download");
    await page.locator("#audio-diagnostic-download").click();
    const download = await downloading;
    const diagnostic = JSON.parse(
      await readFile(await download.path(), "utf8"),
    );
    assert.equal(diagnostic.status, "completed");
    assert.equal(diagnostic.model, "chords");
    assert.ok(
      diagnostic.events.some(
        (event) =>
          event.stage === "decoded" &&
          Math.abs(event.duration - seconds) < 0.001,
      ),
    );
    assert.doesNotMatch(
      JSON.stringify(diagnostic),
      /private-recording|"chords"\s*:\s*\[|"words"|"session"/,
    );

    // Runtime failures, cancellation and a worker that never replies must all
    // leave the current song intact and a useful downloadable diagnostic.
    let workerMode = "error";
    phase = "runtime failure";
    await page.route(
      /\/(?:assets\/analyze\.worker-[^/]+\.js|src\/browser-audio\/analyze\.worker\.js\?worker_file.*)$/,
      (route) =>
        route.fulfill({
          contentType: "text/javascript",
          body:
            workerMode === "error"
              ? 'self.onmessage = () => self.postMessage({diagnostic: "WebAssembly compilation failed", stage: "chords-failed", error: "No se pudieron obtener los acordes."});'
              : "self.onmessage = () => {};",
        }),
    );
    await page.locator("#audio-file").setInputFiles(file);
    await page.locator("#audio-analyze").click();
    await expect(page.locator("#import-error")).toBeVisible();
    let report = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("chordleaf-audio-diagnostic-v1")),
    );
    assert.equal(report.status, "failed");
    assert.ok(
      report.events.some(
        (event) => event.stage === "chords-failed" && event.error === "runtime",
      ),
    );
    assert.equal(await page.locator(".tab").count(), 1);
    workerMode = "hang";
    phase = "cancellation";
    await page.locator("#audio-analyze").click();
    await expect(page.locator("#audio-progress-view")).toBeVisible();
    await page.locator("#audio-cancel").click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("chordleaf-audio-diagnostic-v1"))
              .status,
        ),
      )
      .toBe("cancelled");
    await page.clock.install();
    phase = "timeout";
    const workerStarted = page.waitForEvent("worker");
    await page.locator("#audio-analyze").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#audio-progress-stage")
        .textContent.includes("Preparando el audio"),
    );
    await workerStarted;
    // Wait for this attempt, rather than matching the cancelled one's events.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const report = JSON.parse(
            localStorage.getItem("chordleaf-audio-diagnostic-v1"),
          );
          return (
            report.status === "running" &&
            report.events.some((event) => event.stage === "worker-started")
          );
        }),
      )
      .toBe(true);
    await page.clock.fastForward(301000);
    await expect(page.locator("#import-error")).toContainText(
      "demasiado tiempo",
    );
    report = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("chordleaf-audio-diagnostic-v1")),
    );
    assert.equal(report.events.at(-1).error, "timeout");
    assert.equal(await page.locator(".tab").count(), 1);
    await page.clock.resume();
    await page.screenshot({
      path: `artifacts/audio-safari-${engine.name()}.png`,
    });
    phase = "reload recovery";
    await page.keyboard.press("Escape");
    await expect(page.locator("#new-dialog")).not.toBeVisible();
    await expect(page.locator("#audio-player")).not.toHaveAttribute("src");
    await page.evaluate(() => {
      const key = "chordleaf-audio-diagnostic-v1";
      const report = JSON.parse(localStorage.getItem(key));
      report.status = "running";
      report.session = "previous-page";
      localStorage.setItem(key, JSON.stringify(report));
    });
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("chordleaf-audio-diagnostic-v1"))
              .status,
        ),
      )
      .toBe("interrupted");
    await page.locator("#mobile-tab-plus").click();
    await page.locator("#audio").click();
    await expect(page.locator("#audio-diagnostic-options")).toBeVisible();
    // Same-origin authentication must not carry over to a weight host, even
    // when that host has its own eligible cookie. Stop before downloading
    // voice weights; only the browser's actual outgoing headers are tested.
    await context.addCookies([
      {
        name: "external-weight-auth",
        value: "private",
        domain: "huggingface.co",
        path: "/",
        sameSite: "None",
        secure: true,
      },
    ]);
    let voiceHeaders;
    await page.route("https://huggingface.co/**", async (route) => {
      voiceHeaders = await route.request().allHeaders();
      await route.fulfill({ status: 503, body: "Unavailable" });
    });
    // Readiness may automatically open this modal after a reload. Request
    // the same modal without racing a physical click under its backdrop.
    await page.locator("#audio-model-settings").evaluate((e) => e.click());
    await expect(page.locator("#audio-browser-model-dialog")).toBeVisible();
    await page.locator("#browser-model-whisper").check();
    await page.locator("#browser-model-next").click();
    await expect(page.locator("#browser-model-status")).toContainText(
      "conexión",
    );
    assert.ok(voiceHeaders);
    assert.equal(voiceHeaders.cookie, undefined);
    await page.keyboard.press("Escape");
    await expect(page.locator("#audio-browser-model-dialog")).not.toBeVisible();
    await page.addInitScript(() => {
      const open = CacheStorage.prototype.open;
      CacheStorage.prototype.open = function (name) {
        return name === "chordleaf-audio-models-v1"
          ? Promise.reject(new DOMException("Blocked storage", "SecurityError"))
          : open.call(this, name);
      };
    });
    phase = "blocked storage reload";
    await page.keyboard.press("Escape");
    await expect(page.locator("#new-dialog")).not.toBeVisible();
    await page.evaluate(() => localStorage.setItem("chordleaf-language", "en"));
    await page.reload();
    await page.locator("#mobile-tab-plus").click();
    await page.locator("#audio").click();
    await expect(page.locator("#audio-browser-model-dialog")).toBeVisible();
    await expect(page.locator("#audio-diagnostic-privacy")).toHaveText(
      "The report contains technical information only. It does not include audio, filenames or lyrics.",
    );
    await page.locator("#browser-model-chords").check();
    await page.locator("#browser-model-next").click();
    await expect(page.locator("#browser-model-status")).toContainText(
      "storage",
    );
    report = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("chordleaf-audio-diagnostic-v1")),
    );
    assert.equal(report.status, "failed");
    assert.equal(report.events.at(-1).error, "storage");
    assert.deepEqual(errors, []);
    console.log(
      `${engine.name()}: real CPU chord import, Safari choices, private diagnostics, runtime failures, cancellation, timeout, interrupted reload and blocked storage passed`,
    );
  } finally {
    await browser.close();
  }
}
