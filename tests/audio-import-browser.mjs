import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
          mode === "partial"
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
  await page.locator("#audio-setup").waitFor({ state: "visible" });
  assert.equal(await page.locator("#audio-analyze").isDisabled(), true);
  await page.locator("#import-back").click();
  available = true;
  await page.locator("#audio").click();
  await page.waitForFunction(() =>
    document.querySelector("#audio-status").textContent.includes("disponible"),
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
  assert.equal(await page.locator("#audio-result").isVisible(), false);
  mode = "slow";
  await page.locator("#audio-analyze").click();
  await page.locator("#audio-cancel").click();
  await page.waitForTimeout(650);
  assert.equal(await page.locator("#audio-result").isVisible(), false);
  assert.match(await page.locator("#audio-status").textContent(), /cancelado/);
  mode = "partial";
  await page.locator("#audio-analyze").click();
  await page.locator("#audio-warning").waitFor({ state: "visible" });
  assert.equal(await page.locator("#audio-timeline button").count(), 2);
  assert.match(await page.locator("#audio-draft").inputValue(), /Cmaj7/);
  mode = "ok";
  await page.locator("#import-back").click();
  qwen = true;
  await page.locator("#audio").click();
  await page.waitForFunction(
    () => document.querySelector("#audio-lyrics-engine").value === "qwen",
  );
  assert.equal(await page.locator("#audio-lyrics").isDisabled(), false);
  await upload();
  await page.locator("#audio-analyze").click();
  await page.locator("#audio-result").waitFor({ state: "visible" });
  await page.locator("#audio-timing-warning").waitFor({ state: "visible" });
  assert.equal(
    await page.locator("#audio-draft").inputValue(),
    "[Cmaj7]\nHola [G7/B]mundo",
  );
  assert.equal(await page.locator("#audio-timeline button").count(), 2);
  await page.waitForFunction(
    () => document.querySelector("#audio-player").readyState >= 1,
  );
  await page.locator("#audio-loop").check();
  await page.locator("#audio-timeline button").first().click();
  await page.waitForFunction(
    () => !document.querySelector("#audio-player").paused,
  );
  await page.locator("#audio-player").evaluate((el) => {
    el.currentTime = 2.1;
  });
  await page.waitForFunction(
    () => document.querySelector("#audio-player").currentTime < 2,
  );
  assert.equal(
    await page
      .locator("#audio-timeline button")
      .first()
      .getAttribute("aria-current"),
    "true",
  );
  await page.locator("#audio-loop").uncheck();
  await page.locator("#audio-player").evaluate((el) => {
    el.currentTime = 2.1;
  });
  await page.waitForFunction(
    () => document.querySelector("#audio-player").paused,
  );
  await page.locator("#audio-draft").fill("[Cmaj7]Revisión conservada");
  const download = page.waitForEvent("download");
  await page.locator("#audio-download").click();
  const exported = await download;
  assert.equal(exported.suggestedFilename(), "audio-analysis.json");
  const saved = JSON.parse(await readFile(await exported.path(), "utf8"));
  assert.equal(saved.draftText, "[Cmaj7]Revisión conservada");
  assert.deepEqual(saved.chords, fixture.chords);
  await page.screenshot({ path: "artifacts/audio-import-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({ path: "artifacts/audio-import-mobile.png" });
  await page.locator("#audio-draft").fill("[C]Letra corregida [G]a mano");
  await page.locator("#audio-create").click();
  await page.waitForFunction(() => !document.querySelector("#new-dialog").open);
  assert.match(
    await page.locator(".page").first().textContent(),
    /Letra corregida/,
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "Audio UI: unavailable, error, cancellation, preview, JSON, mobile and import passed.",
  );
} finally {
  await browser.close();
}
