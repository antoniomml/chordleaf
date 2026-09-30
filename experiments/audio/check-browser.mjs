// Explicit local integration test; not part of CI's fixture-only browser suites.
// node experiments/audio/check-browser.mjs /absolute/path/to/audio.m4a
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
const input = process.argv[2];
if (!input) throw new Error("Pass a local audio file for the real-model test.");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.CHORDLEAF_URL || "http://127.0.0.1:5187");
  await page.locator("#empty-new").click();
  await page.locator("#audio").click();
  await page.waitForFunction(() =>
    document.querySelector("#audio-status").textContent.includes("disponible"),
  );
  await page.locator("#audio-file").setInputFiles(resolve(input));
  await page
    .locator("#audio-language")
    .selectOption(process.env.CHORDLEAF_TEST_LANGUAGE || "en");
  if (process.env.CHORDLEAF_TEST_LYRICS_ENGINE)
    await page
      .locator("#audio-lyrics-engine")
      .selectOption(process.env.CHORDLEAF_TEST_LYRICS_ENGINE);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/audio-import?") &&
      response.request().method() === "POST",
    { timeout: 180000 },
  );
  await page.locator("#audio-analyze").click();
  const response = await responsePromise;
  assert.equal(response.status(), 200);
  await page.locator("#audio-result").waitFor({ state: "visible" });
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#audio-download").click();
  const download = await downloadPromise;
  const data = JSON.parse(await readFile(await download.path(), "utf8"));
  if (process.env.CHORDLEAF_TEST_OUTPUT)
    await writeFile(
      process.env.CHORDLEAF_TEST_OUTPUT,
      JSON.stringify(data, null, 2),
    );
  assert.equal(data.engines.chords, "lv-chordia/1.1.0-submission");
  assert.ok(data.words.length, "Expected actual lyrics");
  if (process.env.CHORDLEAF_TEST_LYRICS_ENGINE === "qwen") {
    assert.match(data.engines.lyrics, /^qwen3-asr/);
    assert.ok(data.transcript);
    for (const word of data.words) assert.ok(word.end > word.start);
  }
  const labels = data.chords.filter((c) => c.label !== "N").map((c) => c.label);
  assert.ok(labels.length);
  for (const label of new Set(labels))
    assert.ok(
      (await page.locator("#audio-draft").inputValue()).includes(`[${label}]`),
    );
  await page.waitForFunction(
    () => document.querySelector("#audio-player").readyState >= 1,
  );
  await page.locator("#audio-timeline button").nth(1).click();
  await page.waitForFunction(
    () => !document.querySelector("#audio-player").paused,
  );
  assert.ok(
    (await page.locator("#audio-player").evaluate((el) => el.currentTime)) >=
      data.chords[1].start,
  );
  await page.locator("#audio-result").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "artifacts/audio-benchmark/neural-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: "artifacts/audio-benchmark/neural-mobile.png",
  });
  await page.locator("#audio-create").click();
  await page.waitForFunction(() => !document.querySelector("#new-dialog").open);
  assert.ok(await page.locator(".page").count());
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      words: data.words.length,
      labels: [...new Set(labels)],
      engines: data.engines,
      result: "real model → timed playback → editable song passed",
    }),
  );
} finally {
  await browser.close();
}
