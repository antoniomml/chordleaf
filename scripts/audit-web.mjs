// Reproducible laboratory measurements. No account, analytics or real songs.
// Usage: node scripts/audit-web.mjs https://chordleaf.com/es/
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.argv[2] || "http://localhost:5173/es/";
await mkdir("artifacts/audit", { recursive: true });
const browser = await chromium.launch();
const samples = [];
try {
  for (const mobile of [false, true]) {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1440, height: 900 },
        isMobile: mobile,
        hasTouch: mobile,
        locale: "es-ES",
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => {
        window.audit = { lcp: 0, cls: 0, longTasks: [] };
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            window.audit.lcp = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        let sessionStart = 0,
          lastShift = 0,
          sessionValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            if (
              entry.startTime - lastShift > 1000 ||
              entry.startTime - sessionStart > 5000
            ) {
              sessionStart = entry.startTime;
              sessionValue = 0;
            }
            lastShift = entry.startTime;
            sessionValue += entry.value;
            window.audit.cls = Math.max(window.audit.cls, sessionValue);
          }
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => {
          window.audit.longTasks.push(
            ...list.getEntries().map((entry) => entry.duration),
          );
        }).observe({ type: "longtask", buffered: true });
      });
      if (mobile) {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: 150,
          downloadThroughput: (1600 * 1024) / 8,
          uploadThroughput: (750 * 1024) / 8,
        });
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      }
      const response = await page.goto(url);
      await page.locator("#empty-new").waitFor();
      const readyMs = await page.evaluate(() => performance.now());
      await page.evaluate(() => document.fonts.ready);
      // Include image painting and settled layout before the first input.
      await page.waitForTimeout(1000);
      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        const resources = performance.getEntriesByType("resource");
        return {
          ttfbMs: nav.responseStart - nav.startTime,
          fcpMs: performance
            .getEntriesByType("paint")
            .find((entry) => entry.name === "first-contentful-paint")
            ?.startTime,
          lcpMs: window.audit.lcp,
          cls: window.audit.cls,
          initialBlockingMs: window.audit.longTasks.reduce(
            (sum, ms) => sum + Math.max(0, ms - 50),
            0,
          ),
          resourceCount: resources.length,
          transferBytes:
            nav.transferSize +
            resources.reduce((sum, r) => sum + r.transferSize, 0),
          decodedBytes:
            nav.decodedBodySize +
            resources.reduce((sum, r) => sum + r.decodedBodySize, 0),
          overflowing: document.documentElement.scrollWidth > innerWidth,
        };
      });
      await page.locator("#example-song").click();
      await page.locator(".page").waitFor();
      if (mobile) await page.locator('.rail [data-mobile-view="edit"]').click();
      else await page.locator('.rail [data-desktop-view="edit"]').click();
      const source = page.locator("#source");
      const base = "[C]Verso de prueba [G]para editar y revisar\n";
      const edits = [];
      for (const lines of [20, 200, 1000]) {
        const text = base.repeat(lines);
        const before = await page.evaluate(() => performance.now());
        const eventMs = await source.evaluate((element, text) => {
          element.value = text;
          const start = performance.now();
          element.dispatchEvent(new Event("input", { bubbles: true }));
          return performance.now() - start;
        }, text);
        await page.waitForFunction(
          (expected) =>
            JSON.parse(localStorage.getItem("chordleaf-v1"))?.songs?.[0]
              ?.text === expected,
          text,
        );
        edits.push({
          characters: text.length,
          eventMs,
          editAndSaveMs:
            (await page.evaluate(() => performance.now())) - before,
        });
      }
      if (mobile)
        await page.locator('.rail [data-mobile-view="preview"]').click();
      await page.screenshot({
        path: `artifacts/audit/${mobile ? "mobile" : "desktop"}-${run}.png`,
      });
      const exports = [];
      for (const type of ["txt", "cho", "pdf", "docx"]) {
        const button = page.locator(`[data-export="${type}"]`);
        if (!(await button.count())) continue;
        await page.locator("#export").click();
        const before = performance.now();
        const pending = page.waitForEvent("download", { timeout: 90000 });
        await button.click();
        const download = await pending;
        await download.saveAs(
          `artifacts/audit/${mobile ? "mobile" : "desktop"}-${run}-${download.suggestedFilename()}`,
        );
        exports.push({ type, downloadMs: performance.now() - before });
      }
      samples.push({
        mobile,
        run,
        status: response.status(),
        readyMs,
        ...metrics,
        edits,
        exports,
        errors,
      });
      console.log(JSON.stringify(samples.at(-1)));
      await context.close();
    }
  }
} finally {
  await writeFile(
    "artifacts/audit/web-measurements.json",
    JSON.stringify(
      {
        url,
        measuredAt: new Date().toISOString(),
        serviceWorkers: "blocked",
        mobileProfile: "150 ms RTT, 1.6 Mbps down, 750 Kbps up, CPU x4",
        samples,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
