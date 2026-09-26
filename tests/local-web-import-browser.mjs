import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import axe from "axe-core";

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    locale: "es-ES",
    bypassCSP: true,
  });
  const page = await context.newPage();
  const errors = [];
  const outbound = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://untrusted.invalid/**", (route) => {
    outbound.push(route.request().url());
    return route.abort();
  });
  const base = (process.env.CHORDLEAF_URL || "http://localhost:5173").replace(
    /\/$/,
    "",
  );
  const source = "https://www.cifraclub.com/artista/prueba/";
  const html = `<html><head><link rel="canonical" href="${source}"><title>Prueba local - Artista - Cifra Club</title></head><body><h1>Prueba local</h1><script>window.localImportExecuted=true</script><img src="https://untrusted.invalid/image.png"><iframe src="https://untrusted.invalid/frame"></iframe><pre data-chord-content><b>C</b>     <b>G</b>\nLuz del día\n<b>Am</b>\nVuelve a sonar</pre></body></html>`;
  let response = {
    status: 422,
    contentType: "application/json",
    body: JSON.stringify({
      error: "La web bloquea la descarga (HTTP 403).",
      code: "SOURCE_FORBIDDEN",
    }),
  };
  let apiCalls = 0;
  await page.route("**/api/import-web?**", (route) => {
    apiCalls++;
    return route.fulfill(response);
  });
  await page.goto(`${base}/es/`);
  await page.locator("#new").click();
  await page.locator("#web").click();
  const options = page.locator("#web-local-options");
  assert.equal(await options.isVisible(), false);
  assert.equal(await page.locator("#web-paste, #web-open").count(), 0);
  await page.locator("#web-url").fill(source);
  assert.equal(await options.isVisible(), false);
  await page.locator("#web-submit").click();
  await page.locator("#import-error").waitFor();
  assert.match(
    await page.locator("#import-error").textContent(),
    /403.*extensión/,
  );
  assert.equal(await options.isVisible(), true);
  assert.equal(await options.getAttribute("open"), null);
  await options.locator("summary").click();
  await page.addScriptTag({ content: axe.source });
  assert.deepEqual(
    await page.evaluate(async () =>
      (await axe.run()).violations.map((v) => v.id),
    ),
    [],
  );
  await page.locator("#web-local-file").setInputFiles({
    name: "large.html",
    mimeType: "text/html",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await page.waitForFunction(() =>
    document.querySelector("#import-error").textContent.includes("10 MiB"),
  );
  await page.locator("#web-local-file").setInputFiles({
    name: "song.html",
    mimeType: "text/html",
    buffer: Buffer.from(html),
  });
  await page.locator("#new-dialog").waitFor({ state: "hidden" });
  const song = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("chordleaf-v1"));
    return data.songs.find((song) => song.id === data.active);
  });
  assert.equal(song.title, "Prueba Local");
  assert.equal(song.artist, "Artista");
  assert.match(song.text, /\[Am\]Vuelve a sonar/);
  assert.equal(apiCalls, 1, "HTML import must not contact the server");
  assert.equal(
    await page.evaluate(() => window.localImportExecuted),
    undefined,
  );
  assert.deepEqual(outbound, []);

  await page.locator("#new").click();
  await page.locator("#web").click();
  assert.equal(await options.isVisible(), false);
  await page.locator("#web-url").fill(source);
  await page.locator("#web-submit").click();
  await options.waitFor();
  await page.locator("#web-url").fill(`${source}?new=1`);
  assert.equal(await options.isVisible(), false);
  assert.equal(await page.locator("#import-error").isVisible(), false);
  // Other failures must never advertise the extension or reveal HTML import.
  for (const failure of [
    { status: 429, contentType: "text/html", body: "Too many requests" },
    {
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "La web bloquea la descarga (HTTP 429)." }),
    },
    {
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "La web ha tardado demasiado." }),
    },
    {
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Abre Chordleaf para importar una canción.",
      }),
    },
  ]) {
    response = failure;
    await page.locator("#web-submit").click();
    await page.locator("#import-error").waitFor();
    assert.equal(await options.isVisible(), false);
    assert.doesNotMatch(
      await page.locator("#import-error").textContent(),
      /extensión/,
    );
  }
  response = {
    status: 422,
    contentType: "application/json",
    body: JSON.stringify({ error: "Blocked", code: "SOURCE_FORBIDDEN" }),
  };
  await page.locator("#web-submit").click();
  await options.waitFor();
  await page.screenshot({ path: "artifacts/local-web-import-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/local-web-import-mobile.png" });
  // A successful retry closes the dialog and leaves the normal import path intact.
  response = {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ url: source, html, contentType: "text/html" }),
  };
  await page.locator("#web-submit").click();
  await page.locator("#new-dialog").waitFor({ state: "hidden" });
  assert.equal(await options.isVisible(), false);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/en/`);
  await page.locator("#new").click();
  await page.locator("#web").click();
  await page.locator("#web-url").fill(source);
  response = {
    status: 422,
    contentType: "application/json",
    body: JSON.stringify({ error: "Blocked", code: "SOURCE_FORBIDDEN" }),
  };
  await page.locator("#web-submit").click();
  await options.waitFor();
  assert.match(
    await page.locator("#import-error").textContent(),
    /Coming soon.*extension/,
  );
  assert.match(await options.locator("summary").textContent(), /saved copy/);
  assert.deepEqual(outbound, []);
  assert.deepEqual(errors, []);
  console.log(
    "Web import stays simple; only provider 403 reveals collapsed HTML fallback; local security, retries, mobile and English passed",
  );
} finally {
  await browser.close();
}
