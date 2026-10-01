import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ locale: "es-ES" });
  const owner = await context.newPage();
  const url = process.env.CHORDLEAF_URL || "http://localhost:5173/es/";
  await owner.goto(url);
  await owner.locator("#empty-new").click();
  await owner.locator("#blank").click();
  await owner.locator('.rail [data-desktop-view="edit"]').click();
  await owner.locator("#source").fill("[C]Guardado antes del fallo");
  await owner.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("chordleaf-v1"))?.songs[0]?.text ===
      "[C]Guardado antes del fallo",
  );
  await owner.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "chordleaf-v1")
        throw new DOMException("Storage full", "QuotaExceededError");
      return window.originalSetItem.call(this, key, value);
    };
  });
  await owner.locator("#source").fill("[D]Cambios que sólo existen en memoria");
  await owner.locator("#save-state.error").waitFor();
  const other = await context.newPage();
  other.goto(url).catch(() => {});
  await other.locator(".workspace-locked button").click();
  await other.locator('.workspace-locked [role="alert"]').waitFor();
  assert.equal(await other.locator("#source").count(), 0);
  assert.equal(
    await owner.locator("#source").inputValue(),
    "[D]Cambios que sólo existen en memoria",
  );
  // A silent messaging channel must time out without stealing the live lease.
  await other.evaluate(() => {
    window.originalBroadcast = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = function () {};
  });
  await other.locator(".workspace-locked button").click();
  await other.waitForFunction(
    () => !document.querySelector(".workspace-locked button").disabled,
  );
  assert.equal(await other.locator("#source").count(), 0);
  assert.equal(
    await owner.locator("#source").inputValue(),
    "[D]Cambios que sólo existen en memoria",
  );
  await other.evaluate(() => {
    BroadcastChannel.prototype.postMessage = window.originalBroadcast;
  });
  await owner.evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
  });
  await owner
    .locator("#source")
    .fill("[G]Guardado después de recuperar espacio");
  await owner.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("chordleaf-v1"))?.songs[0]?.text ===
      "[G]Guardado después de recuperar espacio",
  );
  await other.locator(".workspace-locked button").click();
  // Normal successful transfer must include the latest complete workspace.
  await other.locator("#source").waitFor({ state: "attached" });
  assert.equal(
    await other.locator("#source").inputValue(),
    "[G]Guardado después de recuperar espacio",
  );
  console.log(
    "Failed-save handoff retains unsaved work; retry transfers the saved workspace.",
  );
} finally {
  await browser.close();
}
