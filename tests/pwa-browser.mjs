// PWA checks for a production build: manifest, icon sizes, service worker
// registration, offline shell and the /api exclusion. Runs on Chromium,
// Firefox and WebKit; narrow engines with CHORDLEAF_BROWSERS=chromium,firefox.
import { chromium, firefox, webkit } from "@playwright/test";
import assert from "node:assert/strict";

const baseUrl = (process.env.CHORDLEAF_URL || "http://localhost:5173").replace(
  /\/+$/,
  "",
);
const engines = { chromium, firefox, webkit };
const names = (process.env.CHORDLEAF_BROWSERS || "chromium,firefox,webkit")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

function dimensions(buffer) {
  assert.equal(
    buffer.subarray(1, 4).toString("ascii"),
    "PNG",
    "icon is not a PNG file",
  );
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

for (const name of names) {
  const engine = engines[name];
  assert.ok(engine, `Unknown engine in CHORDLEAF_BROWSERS: ${name}`);
  let browser;
  try {
    browser = await engine.launch({ headless: true });
  } catch (error) {
    // Local runs may lack the system libraries WebKit needs. CI installs them
    // with `playwright install --with-deps`, so any other failure is real.
    if (
      name === "webkit" &&
      /missing dependencies/i.test(String(error.message))
    ) {
      console.warn("webkit: skipped (missing system dependencies)");
      continue;
    }
    throw error;
  }
  try {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    const errors = [];
    const consoleErrors = [];
    let offline = false;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !offline)
        consoleErrors.push(message.text());
    });

    // The manifest is public, valid and its icons exist with the right sizes.
    const manifestResponse = await context.request.get(
      `${baseUrl}/manifest.webmanifest`,
    );
    assert.equal(manifestResponse.status(), 200);
    assert.match(
      manifestResponse.headers()["content-type"] || "",
      /^application\/manifest\+json/,
      "manifest content type",
    );
    const manifest = await manifestResponse.json();
    assert.ok(manifest.name.includes("Chordleaf"));
    assert.equal(manifest.short_name, "Chordleaf");
    assert.equal(manifest.start_url, "/");
    assert.equal(manifest.scope, "/");
    assert.equal(manifest.display, "standalone");
    assert.equal(manifest.theme_color, "#171a19");
    assert.match(manifest.background_color, /^#[0-9a-f]{6}$/);
    for (const [size, purpose] of [
      [192, "any"],
      [512, "any"],
      [192, "maskable"],
      [512, "maskable"],
    ]) {
      const entry = manifest.icons.find(
        (icon) =>
          icon.sizes === `${size}x${size}` &&
          icon.purpose.split(" ").includes(purpose),
      );
      assert.ok(entry, `missing ${size}px ${purpose} icon in the manifest`);
      const response = await context.request.get(`${baseUrl}${entry.src}`);
      assert.equal(response.status(), 200, `${entry.src} is served`);
      assert.equal(response.headers()["content-type"], "image/png");
      assert.deepEqual(dimensions(await response.body()), [size, size]);
    }
    const touch = await context.request.get(
      `${baseUrl}/icons/apple-touch-icon.png`,
    );
    assert.equal(touch.status(), 200);
    assert.deepEqual(dimensions(await touch.body()), [180, 180]);

    // The worker script is served fresh from the root scope.
    const worker = await context.request.get(`${baseUrl}/sw.js`);
    assert.equal(worker.status(), 200);
    assert.match(worker.headers()["content-type"] || "", /javascript/);
    assert.equal(worker.headers()["cache-control"], "no-cache");

    // Production builds register and activate the worker. Firefox can report
    // the active worker while it is still activating, so wait for that object.
    await page.goto(baseUrl, { waitUntil: "load" });
    const registration = await page.evaluate(async () => {
      const ready = await navigator.serviceWorker.ready;
      const worker = ready.active;
      if (worker && worker.state !== "activated")
        await new Promise((resolve) => {
          const changed = () => {
            if (worker.state === "activated") resolve();
          };
          worker.addEventListener("statechange", changed);
          changed();
        });
      return {
        scope: new URL(ready.scope).pathname,
        state: worker?.state,
        script: worker && new URL(worker.scriptURL).pathname,
      };
    });
    assert.equal(registration.scope, "/");
    assert.equal(registration.state, "activated");
    assert.equal(registration.script, "/sw.js");
    if (
      !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    )
      await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );

    // A controlled reload fills the runtime cache with the shell.
    await page.reload({ waitUntil: "load" });
    await page.locator("#empty-new").waitFor();
    const cachedPaths = await page.evaluate(async () => {
      const paths = [];
      for (const key of await caches.keys()) {
        const cache = await caches.open(key);
        for (const request of await cache.keys())
          paths.push(new URL(request.url).pathname);
      }
      return paths;
    });
    assert.ok(cachedPaths.includes("/"), "the start URL should be cached");
    assert.ok(
      cachedPaths.includes("/es/"),
      "the Spanish shell should be cached",
    );
    assert.ok(
      cachedPaths.some((path) => path.startsWith("/assets/")),
      "build assets should be cached",
    );

    // Offline, the reload is served from the cache and the editor still works.
    assert.deepEqual(consoleErrors, [], "no console errors while online");
    offline = true;
    await context.setOffline(true);
    const reload = await page.reload({ waitUntil: "load" });
    assert.ok(
      reload?.ok(),
      "the cached shell should answer the offline reload",
    );
    await page.locator("#empty-new").click();
    await page.locator("#blank").click();
    await page.locator('.rail [data-desktop-view="edit"]').click();
    await page.locator("#source").fill("[C]Offline editing works");
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("chordleaf-v1"))?.songs?.[0]?.text ===
        "[C]Offline editing works",
    );

    // API responses must never be stored, not even when the request fails.
    const apiCached = await page.evaluate(async () => {
      try {
        await fetch("/api/import-web");
      } catch {
        // Offline: failing is the expected outcome.
      }
      for (const key of await caches.keys()) {
        const cache = await caches.open(key);
        for (const request of await cache.keys())
          if (new URL(request.url).pathname.startsWith("/api/")) return true;
      }
      return false;
    });
    assert.equal(apiCached, false, "/api/* must not be cached");
    await context.setOffline(false);

    assert.deepEqual(errors, []);
    console.log(
      `${name}: manifest, service worker, offline shell and API exclusion passed`,
    );
  } finally {
    await browser.close();
  }
}
