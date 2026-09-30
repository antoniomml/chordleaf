import { _electron as electron } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const profile = resolve(`artifacts/desktop/test-profile-${Date.now()}`);
await mkdir(profile, { recursive: true });
const launch = () =>
  electron.launch({
    args: ["desktop", "--lang=es"],
    env: { ...process.env, CHORDLEAF_DESKTOP_TEST_DATA: profile },
    timeout: 30000,
  });
let app;
try {
  app = await launch();
  const page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
  page.on("pageerror", (error) => console.error("Renderer:", error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error(msg.text());
  });
  await page.waitForURL("chordleaf://app/");
  assert.equal(await page.evaluate(() => typeof window.require), "undefined");
  assert.equal(
    await page.evaluate(() => typeof window.chordleafDesktop.install),
    "function",
  );
  const ready = await page.evaluate(async () =>
    (await fetch("/api/audio-import")).json(),
  );
  console.log("readiness", ready);
  assert.equal(ready.available, true);
  assert.equal(ready.neural, true);
  assert.equal(
    await page.evaluate(async () => {
      try {
        await window.chordleafDesktop.install("arbitrary");
        return false;
      } catch {
        return true;
      }
    }),
    true,
  );
  const backendPort = await app.evaluate(() => process.env.PORT);
  assert.equal((await fetch(`http://127.0.0.1:${backendPort}/`)).status, 403);
  assert.equal(
    (await fetch(`http://127.0.0.1:${backendPort}/api/audio-import`)).status,
    403,
  );
  await page.evaluate(() =>
    localStorage.setItem("desktop-persistence-probe", "survives-restart"),
  );
  if (await page.locator("#empty-new").isVisible())
    await page.locator("#empty-new").click();
  else await page.locator("#new").click();
  await page.locator("#audio").click();
  await page.locator("#audio-model-dialog").waitFor({ state: "visible" });
  await page.locator('[name="audio-model"][value="none"]').check();
  await page.locator("#audio-model-continue").click();
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
  await page
    .locator("#audio-file")
    .setInputFiles({ name: "Desktop test.wav", mimeType: "audio/wav", buffer });
  if (await page.locator("#audio-lyrics").isEnabled())
    await page.locator("#audio-lyrics").uncheck();
  console.log("starting analysis");
  page.on("response", async (response) => {
    if (response.url().includes("api/audio-import"))
      console.log(
        "api",
        response.status(),
        (await response.text().catch(() => "")).slice(0, 250),
      );
  });
  await page.locator("#audio-analyze").click();
  console.log("analysis clicked");
  // Silence has no sung words; the UI reports an empty result if the detector
  // correctly outputs N, or opens its detected instrumental chords directly.
  await page.waitForFunction(
    () =>
      !document.querySelector("#new-dialog").open ||
      !document.querySelector("#import-error").hidden,
    null,
    { timeout: 90000 },
  );
  if (await page.locator("#new-dialog").isVisible()) {
    assert.match(
      await page.locator("#import-error").textContent(),
      /No se han detectado/,
    );
    await page.locator("#import-back").click();
    await page.locator("#blank").click();
    await page.locator('.rail [data-desktop-view="edit"]').click();
  }
  await page.locator("#source").fill("[C]Desktop persistence [G]verified");
  await page.waitForFunction(() =>
    JSON.parse(localStorage.getItem("chordleaf-v1")).songs.some((s) =>
      s.text.includes("Desktop persistence"),
    ),
  );
  await page.screenshot({ path: "artifacts/desktop/editor.png" });
  console.log("closing first window");
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBoxSync = () => 1;
  });
  await app.close();
  console.log("reopening");
  app = await launch();
  const reopened = await app.firstWindow();
  reopened.on("dialog", (dialog) => dialog.accept().catch(() => {}));
  await reopened.locator(".page").first().waitFor();
  assert.equal(
    await reopened.evaluate(() =>
      localStorage.getItem("desktop-persistence-probe"),
    ),
    "survives-restart",
  );
  assert.match(
    await reopened.locator(".page").first().textContent(),
    /Desktop persistence/,
  );
  console.log(
    "Desktop: bundled Python, neural chords, isolated renderer, rejected invalid model and persistent songs passed.",
  );
} finally {
  if (app) {
    await app
      .evaluate(({ dialog }) => {
        dialog.showMessageBoxSync = () => 1;
      })
      .catch(() => {});
    await app.close();
  }
}
