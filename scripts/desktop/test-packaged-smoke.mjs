import { launchPackaged } from "./launch-packaged.mjs";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const profile = resolve(`artifacts/desktop/packaged-smoke-${Date.now()}`);
await mkdir(profile, { recursive: true });
const app = await launchPackaged(profile);
try {
  const page = await app.firstWindow();
  await page.waitForURL("chordleaf://app/");
  await page.locator("#empty-new").waitFor();
  const ready = await page.evaluate(async () =>
    (await fetch("/api/audio-import")).json(),
  );
  assert.equal(ready.available, true);
  assert.equal(ready.neural, true);
  assert.equal(ready.qwen, false);
  assert.equal(await page.evaluate(() => typeof window.require), "undefined");
  await page.locator("#empty-new").click();
  await page.locator("#audio").click();
  await page.locator("#audio-model-dialog").waitFor({ state: "visible" });
  assert.equal(await page.locator("#audio-model-continue").isEnabled(), true);
  console.log(
    "Packaged app starts with a clean profile, bundled runtime, chord models and model installation controls.",
  );
} finally {
  await app.close();
}
