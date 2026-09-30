import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const url = process.env.CHORDLEAF_URL || "http://localhost:5173";
const fixture = {
  version: 1,
  duration: 6,
  engines: { chords: "lv-chordia/1.1.0-submission" },
  words: [
    { start: 1, end: 2, text: "Hola", line: 0 },
    { start: 2, end: 3, text: "mundo", line: 0 },
  ],
  chords: [
    { start: 0, end: 2, label: "Cmaj7" },
    { start: 2, end: 6, label: "G7/B" },
  ],
};
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1280, height: 1000 },
  });
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    window.holdFit = false;
    window.Worker = class extends OriginalWorker {
      constructor(url, options) {
        super(url, options);
        if (/fit-worker/.test(String(url)))
          this.addEventListener("message", (event) => {
            if (!window.holdFit) return;
            event.stopImmediatePropagation();
            window.fitWaiting = true;
            window.releaseFit = () => {
              window.holdFit = false;
              this.dispatchEvent(
                new MessageEvent("message", { data: event.data }),
              );
            };
          });
      }
    };
    window.chordleafDesktop = {
      system: async () => ({ platform: "darwin", arch: "arm64", memoryGB: 16 }),
      models: async () => ({ stage: "idle", active: false }),
      cancelAnalysis: async () => true,
    };
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let available = false,
    mode = "ok",
    qwen = false;
  await page.route("**/api/audio-import*", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { available, qwen, lyrics: !qwen } });
    assert.equal(
      new URL(route.request().url()).searchParams.get("engine"),
      "neural",
    );
    assert.equal(
      new URL(route.request().url()).searchParams.get("lyricsEngine"),
      qwen ? "qwen" : "whisper",
    );
    if (mode === "slow") {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (mode === "error")
      return route.fulfill({ status: 422, json: { error: "analysis" } });
    return route
      .fulfill({
        json:
          mode === "empty"
            ? {
                ...fixture,
                words: [],
                chords: [{ start: 0, end: 6, label: "N" }],
              }
            : mode === "partial"
              ? { ...fixture, words: [], warnings: ["lyrics-failed"] }
              : qwen
                ? { ...fixture, warnings: ["alignment-approximate"] }
                : fixture,
      })
      .catch(() => {});
  });
  await page.goto(url);
  await page.locator("#empty-new").click();
  await page.locator("#audio").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#audio-status")
      .textContent.includes("no está activado"),
  );
  assert.equal(await page.locator("#audio-analyze").isDisabled(), true);
  await page.locator("#import-back").click();
  available = true;
  await page.locator("#audio").click();
  await page.waitForFunction(
    () => !document.querySelector("#audio-file").disabled,
  );
  // Valid PCM silence: UI lifecycle tests do not call a model.
  const buffer = Buffer.alloc(44 + 16000 * 2 * 6);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24);
  buffer.writeUInt32LE(32000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(buffer.length - 44, 40);
  const upload = () =>
    page
      .locator("#audio-file")
      .setInputFiles({ name: "Mi prueba.wav", mimeType: "audio/wav", buffer });
  await upload();
  mode = "error";
  await page.locator("#audio-analyze").click();
  await page.locator("#import-error").waitFor({ state: "visible" });
  assert.equal(await page.locator("#audio-result").count(), 0);
  assert.equal(await page.locator(".tab").count(), 0);
  mode = "slow";
  await page.locator("#audio-analyze").click();
  await page.locator("#audio-cancel").click();
  await page.waitForTimeout(650);
  assert.equal(await page.locator("#audio-result").count(), 0);
  assert.equal(await page.locator(".tab").count(), 0);
  assert.match(await page.locator("#audio-status").textContent(), /cancelado/);
  mode = "ok";
  await page.evaluate(() => {
    window.holdFit = true;
  });
  await page.locator("#audio-analyze").click();
  await page.waitForFunction(() => window.fitWaiting);
  assert.match(
    await page.locator("#audio-progress-stage").textContent(),
    /Abriendo/,
  );
  await page.locator("#audio-cancel").click();
  await page.evaluate(() => window.releaseFit());
  await page.waitForTimeout(50);
  assert.equal(await page.locator(".tab").count(), 0);
  assert.match(await page.locator("#audio-status").textContent(), /cancelado/);
  mode = "empty";
  await page.locator("#audio-analyze").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#import-error")
      .textContent.includes("No se han detectado"),
  );
  assert.equal(await page.locator(".tab").count(), 0);
  mode = "partial";
  await page.locator("#audio-analyze").click();
  await page.locator("#new-dialog").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".tab").count(), 1);
  assert.match(await page.locator("#source").inputValue(), /Cmaj7.*G7\/B/);
  assert.match(
    await page.locator("#toast").textContent(),
    /añadirla en el editor/,
  );
  assert.equal(await page.locator("#source").isVisible(), true);
  assert.equal(await page.locator("#audio-player").getAttribute("src"), null);

  mode = "ok";
  qwen = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#mobile-tab-plus").click();
  await page.locator("#audio").click();
  await page.waitForFunction(
    () => document.querySelector("#audio-model-name").dataset.model === "qwen",
  );
  assert.equal(await page.locator("#audio-lyrics").isDisabled(), false);
  await upload();
  await page.locator("#audio-analyze").click();
  await page.locator("#new-dialog").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".tab").count(), 2);
  assert.equal(await page.locator("#source").isVisible(), true);
  assert.equal(
    await page.locator("#source").inputValue(),
    "[Intro] [Cmaj7]\nHola [G7/B]mundo",
  );
  assert.match(await page.locator("#toast").textContent(), /aproximados/);
  assert.equal(await page.locator("#audio-create").count(), 0);
  assert.equal(await page.locator("#audio-player").getAttribute("src"), null);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator("#source").fill("[C]Letra corregida [G]a mano");
  await page.waitForFunction(() =>
    JSON.parse(localStorage.getItem("chordleaf-v1")).songs.some((song) =>
      song.text.includes("Letra corregida"),
    ),
  );
  await page.screenshot({ path: "artifacts/audio-import-mobile.png" });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.screenshot({ path: "artifacts/audio-import-desktop.png" });
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "Audio UI: unavailable, errors, cancellation, empty results, direct editor import, partial lyrics and mobile editing passed.",
  );
} finally {
  await browser.close();
}
