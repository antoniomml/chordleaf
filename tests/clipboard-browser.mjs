import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ locale: "es-ES" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.clipboardFixture = {
      permission: "prompt",
      text: "",
      reads: 0,
      hold: false,
    };
    const query = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (descriptor) =>
      descriptor.name === "clipboard-read"
        ? Promise.resolve({ state: window.clipboardFixture.permission })
        : query(descriptor);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText() {
          const fixture = window.clipboardFixture;
          fixture.reads++;
          if (fixture.permission === "denied")
            return Promise.reject(
              new DOMException("Denied", "NotAllowedError"),
            );
          fixture.permission = "granted";
          if (fixture.hold)
            return new Promise((resolve) => {
              window.releaseClipboard = () => resolve(fixture.text);
            });
          return Promise.resolve(fixture.text);
        },
      },
    });
  });
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.waitForFunction(
    () => !document.getElementById("clipboard-import").disabled,
  );
  assert.equal(await page.locator("#clipboard-enable").count(), 0);
  assert.equal(await page.locator("#clipboard-import").isDisabled(), false);
  assert.equal(await page.evaluate(() => window.clipboardFixture.reads), 0);
  await page.locator("#clipboard-import").click();
  await page.waitForFunction(() =>
    document.getElementById("clipboard-hint").textContent.includes("vacío"),
  );
  assert.equal(await page.locator("#clipboard-import").isDisabled(), true);
  assert.equal(await page.locator("#clipboard-access").count(), 0);
  await page.evaluate(() => {
    window.clipboardFixture.text =
      "{title: Del portapapeles}\n[C]Luz [G]del día";
    window.dispatchEvent(new Event("focus"));
  });
  await page.locator("#clipboard-import").waitFor({ state: "visible" });
  await page.waitForFunction(
    () => !document.getElementById("clipboard-import").disabled,
  );
  await page.locator("#clipboard-import").click();
  await page.locator("#new-dialog").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".tab").count(), 1);
  assert.equal(await page.locator("#import-text").count(), 0);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("chordleaf-v1")),
  );
  assert.match(saved.songs[0].text, /\[C\]Luz \[G\]del día/);

  // Read fresh on click: an empty clipboard cannot create a blank song.
  await page.locator("#new").click();
  await page.waitForFunction(
    () => !document.getElementById("clipboard-import").disabled,
  );
  await page.evaluate(() => {
    window.clipboardFixture.text = "";
  });
  await page.locator("#clipboard-import").click();
  await page.waitForFunction(() =>
    document.getElementById("clipboard-hint").textContent.includes("vacío"),
  );
  assert.equal(await page.locator(".tab").count(), 1);

  // A pending clipboard read cannot import into a screen opened later.
  await page.evaluate(() => {
    window.clipboardFixture.text = "[Am]No debe aparecer";
    window.dispatchEvent(new Event("focus"));
  });
  await page.waitForFunction(
    () => !document.getElementById("clipboard-import").disabled,
  );
  await page.evaluate(() => {
    window.clipboardFixture.hold = true;
  });
  await page.locator("#clipboard-import").click();
  await page.waitForFunction(() => Boolean(window.releaseClipboard));
  await page.locator("#web").click();
  await page.evaluate(() => {
    window.releaseClipboard();
    window.clipboardFixture.hold = false;
  });
  await page.waitForTimeout(50);
  assert.equal(await page.locator("#web-import").isVisible(), true);
  assert.equal(await page.locator(".tab").count(), 1);
  await page.locator("#import-back").click();
  await page.waitForFunction(
    () => !document.getElementById("clipboard-import").disabled,
  );
  await page.evaluate(() => {
    window.clipboardFixture.text = "x".repeat(50001);
  });
  await page.locator("#clipboard-import").click();
  await page.locator("#import-error").waitFor({ state: "visible" });
  assert.match(await page.locator("#import-error").textContent(), /50.000/);
  assert.equal(await page.locator(".tab").count(), 1);

  await page.evaluate(() => {
    window.clipboardFixture.permission = "denied";
    window.dispatchEvent(new Event("focus"));
  });
  await page.waitForFunction(() =>
    document.getElementById("clipboard-hint").textContent.includes("bloqueado"),
  );
  assert.equal(await page.locator("#clipboard-import").isDisabled(), true);
  assert.equal(await page.locator("#clipboard-access").count(), 0);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
    window.dispatchEvent(new Event("focus"));
  });
  assert.equal(await page.locator("#clipboard-import").isDisabled(), true);
  assert.match(
    await page.locator("#clipboard-hint").textContent(),
    /no disponible/,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Clipboard: explicit access, empty/blocked states, direct import, fresh reads, size limits and navigation cancellation passed.",
  );
} finally {
  await browser.close();
}
