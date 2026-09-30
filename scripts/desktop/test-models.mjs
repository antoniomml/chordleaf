// Explicit integration test: downloads models into an isolated desktop profile.
import { launchPackaged } from "./launch-packaged.mjs";
import { _electron as electron } from "@playwright/test";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const input = process.argv[2];
if (!input) throw new Error("Pass a local recording for the actual Qwen test");
const profile = resolve(
  process.env.CHORDLEAF_DESKTOP_MODEL_TEST_PROFILE ||
    "artifacts/desktop/model-test-profile",
);
await mkdir(profile, { recursive: true });
const packaged = process.env.CHORDLEAF_TEST_PACKAGED === "1";
const app = packaged
  ? await launchPackaged(profile)
  : await electron.launch({
      args: ["desktop", "--lang=es"],
      env: { ...process.env, CHORDLEAF_DESKTOP_TEST_DATA: profile },
      timeout: 60000,
    });
try {
  const page = await app.firstWindow();
  console.log("Desktop window opened", { packaged });
  page.setDefaultTimeout(20000);
  page.on("dialog", (d) => d.accept().catch(() => {}));
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForURL("chordleaf://app/");
  if (await page.locator("#empty-new").isVisible())
    await page.locator("#empty-new").click();
  else await page.locator("#new").click();
  await page.locator("#audio").click();
  if (!(await page.locator("#audio-model-dialog").isVisible()))
    await page.locator("#audio-model-settings").click();
  await page.locator('[name="audio-model"][value="qwen"]').check();
  console.log("Checking installed models");
  let ready = await page.evaluate(async () =>
    (await fetch("/api/audio-import")).json(),
  );
  async function waitModels(predicate, timeout = 30000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const state = await page.evaluate(() => window.chordleafDesktop.models());
      if (state.stage === "error")
        throw new Error("Model installation failed: " + state.error);
      if (predicate(state)) return state;
      await page.waitForTimeout(500);
    }
    throw new Error("Model status timed out");
  }
  if (!ready.qwen) {
    await page.locator("#audio-model-continue").click();
    await waitModels((state) => state.active);
    await page.locator("#audio-cancel-models").click();
    await waitModels((state) => !state.active);
    await page.locator("#audio-model-continue").click();
    await waitModels(
      (state) => !state.active && state.stage === "complete",
      900000,
    );
    console.log("Model installation cancelled, resumed and completed.");
  }
  await page.locator("#audio-model-continue").click();
  await page.waitForFunction(
    () => document.querySelector("#audio-model-name").dataset.model === "qwen",
    null,
    { timeout: 60000 },
  );
  ready = await page.evaluate(async () =>
    (await fetch("/api/audio-import")).json(),
  );
  assert.equal(ready.qwen, true);
  await page.locator("#audio-file").setInputFiles(resolve(input));
  await page.locator("#audio-language").selectOption("es");
  await page.locator("#audio-lyrics").check();
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/api/audio-import?") && r.request().method() === "POST",
    { timeout: 900000 },
  );
  await page.locator("#audio-analyze").click();
  const received = await response;
  assert.equal(received.status(), 200);
  const data = await received.json();
  assert.ok(data.words.length > 0);
  assert.match(data.engines.lyrics, /qwen3-asr/);
  await page.locator("#audio-result").waitFor({ state: "visible" });
  await page.locator("#audio-timeline button").nth(1).click();
  await page.waitForFunction(
    () => !document.querySelector("#audio-player").paused,
  );
  await writeFile(
    "artifacts/desktop/packaged-analysis.json",
    JSON.stringify(data, null, 2),
  );
  await page.screenshot({ path: "artifacts/desktop/models.png" });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      packaged,
      words: data.words.length,
      engines: data.engines,
      result: "Qwen installation and real audio playback passed",
    }),
  );
} finally {
  await app
    .evaluate(({ dialog }) => {
      dialog.showMessageBoxSync = () => 1;
    })
    .catch(() => {});
  await app.close();
}
