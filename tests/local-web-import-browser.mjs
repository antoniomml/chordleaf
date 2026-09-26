import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import axe from "axe-core";

const browser = await chromium.launch({ headless: true });
try {
  // Bypass CSP here to prove that local markup stays inert by construction.
  const context = await browser.newContext({
    locale: "es-ES",
    bypassCSP: true,
  });
  const page = await context.newPage();
  const errors = [];
  const outbound = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const base = process.env.CHORDLEAF_URL || "http://localhost:5173";
  await page.route("https://untrusted.invalid/**", (route) => {
    outbound.push(route.request().url());
    return route.abort();
  });
  await page.goto(`${base.replace(/\/$/, "")}/es/`);
  await page.locator("#empty-new").waitFor();
  let apiCalls = 0;
  let rateLimited = false;
  await page.route("**/api/import-web?**", (route) => {
    apiCalls++;
    if (rateLimited)
      return route.fulfill({
        status: 429,
        contentType: "text/html",
        body: "<h1>Too many requests</h1>",
      });
    return route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        error:
          "La web bloquea las descargas desde servidores (HTTP 403). Copia la letra y pégala en el editor.",
      }),
    });
  });
  const source = "https://www.cifraclub.com/artista/prueba/";
  const html = `<html><head><link rel="canonical" href="${source}"><title>Prueba local - Artista - Cifra Club</title></head><body><h1>Prueba local</h1><script>window.localImportExecuted=true</script><img src="https://untrusted.invalid/image.png"><iframe src="https://untrusted.invalid/frame"></iframe><pre data-chord-content><b>C</b>     <b>G</b>\nLuz del día\n<b>Am</b>\nVuelve a sonar</pre></body></html>`;
  async function openImport() {
    await page.locator("#new").click();
    await page.locator("#web").click();
  }
  const currentSong = () =>
    page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("chordleaf-v1"));
      return data.songs.find((song) => song.id === data.active);
    });
  await openImport();
  await page.locator("#web-url").fill(source);
  assert.equal(await page.locator("#web-open").getAttribute("href"), source);
  assert.equal(
    await page.locator("#web-open").getAttribute("rel"),
    "noopener noreferrer",
  );
  await page.locator("#web-submit").click();
  await page.locator("#import-error").waitFor();
  assert.equal(
    await page.locator("#web-local-options").getAttribute("open"),
    "",
  );
  assert.match(await page.locator("#import-error").textContent(), /403/);
  await page.locator("#web-paste").evaluate((element, markup) => {
    const clipboard = new DataTransfer();
    clipboard.setData("text/html", markup);
    clipboard.setData("text/plain", "C     G\nLuz del día\nAm\nVuelve a sonar");
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: clipboard,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, html);
  assert.match(
    await page.locator("#web-paste").inputValue(),
    /\[C\]Luz de\[G\]l día/,
  );
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () =>
    (await axe.run()).violations.map((v) => v.id),
  );
  assert.deepEqual(violations, []);
  await page.locator("#web-paste-submit").click();
  await page.locator("#new-dialog").waitFor({ state: "hidden" });
  const pasted = await currentSong();
  assert.equal(pasted.title, "Prueba Local");
  assert.equal(pasted.artist, "Artista");
  assert.match(pasted.text, /\[Am\]Vuelve a sonar/);
  assert.equal(apiCalls, 1, "paste must not call the server");
  assert.equal(
    await page.evaluate(() => window.localImportExecuted),
    undefined,
  );
  assert.deepEqual(
    outbound,
    [],
    "saved or pasted HTML must not load resources",
  );

  // HTML files work without a server request and can recover the source URL
  // from their canonical metadata, without trusting arbitrary hostnames.
  await openImport();
  await page.locator("#web-local-options summary").click();
  await page.locator("#web-local-file").setInputFiles({
    name: "song.html",
    mimeType: "text/html",
    buffer: Buffer.from(html),
  });
  await page.locator("#new-dialog").waitFor({ state: "hidden" });
  assert.equal((await currentSong()).text, pasted.text);
  assert.equal(apiCalls, 1);
  assert.deepEqual(outbound, []);

  await openImport();
  await page.locator("#web-local-options summary").click();
  await page.locator("#web-local-file").setInputFiles({
    name: "song.html",
    mimeType: "text/html",
    buffer: Buffer.from(html.replaceAll(source, "https://untrusted.invalid/")),
  });
  await page.locator("#import-error").waitFor();
  assert.match(
    await page.locator("#import-error").textContent(),
    /enlace original/,
  );
  await page.locator("#web-local-file").setInputFiles({
    name: "large.html",
    mimeType: "text/html",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  assert.match(await page.locator("#import-error").textContent(), /10 MiB/);
  await page.locator("#web-url").fill("javascript:alert(1)");
  assert.equal(await page.locator("#web-open").isVisible(), false);
  await page.locator(".dialog-close").click();

  // A plain paste stays available on phones without clipboard permissions.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#mobile-tab-plus").click();
  await page.locator("#web").click();
  await page.locator("#web-local-options summary").click();
  await page.locator("#web-paste").fill("{title: Otra}\nD\nMañana clara");
  await page.screenshot({ path: "artifacts/local-web-import-mobile.png" });
  await page.locator("#web-paste-submit").click();
  await page.locator("#new-dialog").waitFor({ state: "hidden" });
  assert.match((await currentSong()).text, /\[D\]Mañana clara/);
  assert.equal(apiCalls, 1);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base.replace(/\/$/, "")}/en/`);
  await page.locator("#new").waitFor();
  await openImport();
  rateLimited = true;
  await page.locator("#web-url").fill(source);
  await page.locator("#web-submit").click();
  await page.locator("#import-error").waitFor();
  assert.match(await page.locator("#import-error").textContent(), /minute/);
  assert.match(
    await page.locator("#web-local-options summary").textContent(),
    /Use my connection/,
  );
  // A copied Ultimate Guitar selection lacks the full page's .js-store data.
  await page
    .locator("#web-url")
    .fill("https://tabs.ultimate-guitar.com/tab/example/song-chords-1234");
  await page.locator("#web-paste").evaluate((element) => {
    const clipboard = new DataTransfer();
    clipboard.setData("text/html", "<pre>C\nMorning light</pre>");
    clipboard.setData("text/plain", "C\nMorning light");
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: clipboard,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  assert.match(
    await page.locator("#web-paste").inputValue(),
    /\[C\]Morning light/,
  );
  await page.screenshot({ path: "artifacts/local-web-import-desktop.png" });
  assert.deepEqual(errors, []);
  console.log(
    "Local HTML and clipboard imports, blocked-link fallback, inert markup and mobile flow passed",
  );
} finally {
  await browser.close();
}
