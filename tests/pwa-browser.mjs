// PWA checks for a production build: manifest, icon sizes, service worker
// registration, offline shell and the /api exclusion. Runs on Chromium,
// Firefox and WebKit; narrow engines with CHORDLEAF_BROWSERS=chromium,firefox.
import { chromium, firefox, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { waitForPwaActivation } from "./helpers/pwa-ready.mjs";

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
  let page;
  const errors = [];
  try {
    const context = await browser.newContext({ locale: "en-US" });
    page = await context.newPage();
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

    // Firefox can miss Playwright's load completion while the document is
    // already usable. Commit the navigation, then check the real document and
    // app state. This still requires load to finish (readyState === complete),
    // without relying on the driver's load-event bookkeeping.
    const firstVisit = await page.goto(baseUrl, { waitUntil: "commit" });
    assert.ok(firstVisit?.ok(), "the first visit should answer successfully");
    await page.waitForFunction(
      () =>
        document.readyState === "complete" &&
        Boolean(document.querySelector("#empty-new")),
    );
    // Firefox can report the active worker while it is still activating, so
    // wait for activation explicitly rather than treating page load as ready.
    const registration = await page.evaluate(waitForPwaActivation);
    assert.equal(registration.scope, "/");
    assert.equal(registration.state, "activated");
    assert.equal(registration.script, "/sw.js");
    await page.locator('#empty-state [data-offline-state="ready"]').waitFor();
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
    // Do not reload online: the first installation must cache the whole app.
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
    const entryResources = await page.evaluate(() =>
      [...document.querySelectorAll('script[src], link[rel="stylesheet"]')].map(
        (element) => new URL(element.src || element.href).pathname,
      ),
    );
    for (const resource of entryResources)
      assert.ok(
        cachedPaths.includes(resource),
        `${resource} cached on first visit`,
      );
    for (const resource of [
      "/en/",
      "/fonts/GoogleSansCode-Regular.ttf",
      "/fonts/GoogleSansCode-Bold.ttf",
    ])
      assert.ok(
        cachedPaths.includes(resource),
        `${resource} available offline`,
      );
    assert.ok(cachedPaths.some((path) => path.includes("docx-worker")));
    assert.ok(cachedPaths.some((path) => path.includes("pdf.worker")));
    if (name === "chromium") {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.clearBrowserCache");
      await cdp.detach();
    }

    assert.deepEqual(consoleErrors, [], "no console errors while online");
    if (name === "webkit") {
      // Playwright cannot emulate offline for a service-worker-controlled page
      // in WebKit (microsoft/playwright#42775): setOffline(true) makes the next
      // navigation fail with an internal error. The controller and the cached
      // shell are already asserted above, so check the cached response is
      // complete and usable instead.
      const cachedShell = await page.evaluate(async () => {
        const response = await caches.match("/");
        if (!response?.ok) return null;
        const html = await response.text();
        return html.includes("<!doctype html>") && html.includes("/assets/");
      });
      assert.equal(cachedShell, true, "the cached shell is complete");
    } else {
      // Offline, the reload is served from the cache and the editor still works.
      offline = true;
      await context.setOffline(true);
      const reload = await page.reload({ waitUntil: "commit" });
      assert.ok(
        reload?.ok(),
        "the cached shell should answer the offline reload",
      );
      await page.waitForFunction(
        () =>
          document.readyState === "complete" &&
          Boolean(document.querySelector("#empty-new")),
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
      // These dynamic libraries have never been used online in this context.
      for (const format of ["pdf", "docx"]) {
        await page.locator("#export").click();
        const download = page.waitForEvent("download");
        await page.locator(`[data-export="${format}"]`).click();
        const file = await download;
        assert.ok(file.suggestedFilename().endsWith(`.${format}`));
        assert.equal(await file.failure(), null);
      }
      // A failing API request must not be stored either.
      await page.evaluate(async () => {
        try {
          await fetch("/api/import-web");
        } catch {
          /* Offline: failing is the expected outcome. */
        }
      });
      await context.setOffline(false);
    }

    // API responses must never be stored, not even when the request fails.
    const apiCached = await page.evaluate(async () => {
      for (const key of await caches.keys()) {
        const cache = await caches.open(key);
        for (const request of await cache.keys())
          if (new URL(request.url).pathname.startsWith("/api/")) return true;
      }
      return false;
    });
    assert.equal(apiCached, false, "/api/* must not be cached");

    assert.deepEqual(errors, []);
    console.log(
      `${name}: manifest, service worker, offline shell and API exclusion passed`,
    );
  } catch (error) {
    // Capture a stalled browser's actual state so CI can distinguish a driver
    // navigation failure from missing shell assets or a failed worker install.
    if (page) {
      await mkdir("artifacts", { recursive: true });
      const state = await page
        .evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return {
            url: location.href,
            readyState: document.readyState,
            appReady: Boolean(document.querySelector("#empty-new, #source")),
            worker: registration?.active?.state,
            installing: registration?.installing?.state,
            controlled: Boolean(navigator.serviceWorker.controller),
            caches: await caches.keys(),
            pendingResources: performance
              .getEntriesByType("resource")
              .filter((resource) => !resource.responseEnd)
              .map((resource) => resource.name),
          };
        })
        .catch(() => null);
      await writeFile(
        `artifacts/pwa-${name}-failure.json`,
        JSON.stringify({ error: String(error), errors, state }, null, 2),
      );
      await page
        .screenshot({ path: `artifacts/pwa-${name}-failure.png` })
        .catch(() => {});
    }
    throw error;
  } finally {
    await browser.close();
  }
}
