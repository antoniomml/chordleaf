import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";

const output = await mkdtemp(resolve("artifacts/feature-flags-"));
const browser = await chromium.launch();
let server;
try {
  for (const [audio, web] of [
    [false, false],
    [false, true],
    [true, false],
  ]) {
    const code = await new Promise((done, reject) => {
      const build = spawn(
        process.execPath,
        ["node_modules/vite/bin/vite.js", "build", "--outDir", output],
        {
          env: {
            ...process.env,
            VITE_FEATURE_AUDIO_IMPORT: String(audio),
            VITE_FEATURE_WEB_IMPORT: String(web),
          },
          stdio: ["ignore", "ignore", "pipe"],
        },
      );
      build.stderr.on("data", (data) => process.stderr.write(data));
      build.on("error", reject);
      build.on("close", done);
    });
    assert.equal(code, 0);
    process.env.CHORDLEAF_DIST = output;
    process.env.PORT = "0";
    process.env.HOST = "127.0.0.1";
    const serving = await import(`../server/start.js?flags=${audio}-${web}`);
    server = serving.server;
    const address = await serving.ready;
    const context = await browser.newContext({ locale: "es-ES" });
    const page = await context.newPage();
    const errors = [],
      requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(`http://127.0.0.1:${address.port}`);
    await page.locator("#empty-new").click();
    assert.equal(await page.locator("#audio").isVisible(), audio);
    assert.equal(await page.locator("#web").isVisible(), web);
    assert.equal(
      await page
        .locator("#new-menu .choice:not([hidden])")
        .first()
        .evaluate((el) => el === document.activeElement),
      true,
    );
    for (const id of [!audio && "audio", !web && "web"].filter(Boolean)) {
      await page.locator(`#${id}`).dispatchEvent("click");
      assert.equal(await page.locator(`#${id}-import`).isVisible(), false);
      assert.equal(await page.locator("#new-menu").isVisible(), true);
    }
    assert.ok(
      !requests.some((url) =>
        /huggingface|api\/audio-import|api\/import-web/.test(url),
      ),
    );
    await page.locator("#blank").click();
    await page.locator('.rail [data-desktop-view="edit"]').click();
    await page.locator("#source").fill("[C]La edición sigue [G]disponible");
    await page.waitForFunction(() =>
      document.querySelector(".lyric")?.textContent.includes("La edición"),
    );
    assert.deepEqual(errors, []);
    await context.close();
    await new Promise((done) => server.close(done));
    server = null;
  }
  console.log(
    "Production builds: independent audio/web flags hide and disable flows; editing and menu focus work.",
  );
} finally {
  if (server) await new Promise((done) => server.close(done));
  await browser.close();
  await rm(output, { recursive: true, force: true });
}
