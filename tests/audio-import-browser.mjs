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
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let available = false,
    mode = "ok";
  await page.route("**/api/audio-import*", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { available } });
    assert.equal(
      new URL(route.request().url()).searchParams.get("engine"),
      "neural",
    );
    if (mode === "slow") {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (mode === "error")
      return route.fulfill({ status: 422, json: { error: "analysis" } });
    return route.fulfill({ json: fixture }).catch(() => {});
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
  const buffer = Buffer.alloc(44 + 16000 * 2);
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
  mode = "ok";
  await page.locator("#audio-analyze").click();
  await page.locator("#audio-result").waitFor({ state: "visible" });
  assert.equal(
    await page.locator("#audio-draft").inputValue(),
    "[Cmaj7]\nHola [G7/B]mundo",
  );
  assert.equal(await page.locator("#audio-timeline button").count(), 2);
  const download = page.waitForEvent("download");
  await page.locator("#audio-download").click();
  assert.equal((await download).suggestedFilename(), "audio-analysis.json");
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
