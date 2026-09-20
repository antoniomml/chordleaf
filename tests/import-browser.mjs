import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.CHORDI_URL || "http://localhost:5173");
  await page.locator("#new").click();
  assert.deepEqual(
    await page.locator("#new-dialog .choice strong").allTextContents(),
    ["Importar texto o archivo", "Importar desde una web", "Empezar de cero"],
  );
  await page.locator("#import").click();
  await page
    .locator("#import-text")
    .fill("{title: Prueba}\n" + "G      D\nVuelve la mañana\n".repeat(30));
  await page.locator("#paste-import").click();
  assert.equal(await page.locator(".page").count(), 1);
  assert.equal(await page.locator(".sheet-brand").textContent(), "Chordi");
  await page.screenshot({ path: "artifacts/import-fit.png" });
  const parsed = await page.evaluate(async () => {
    const { parseWebSong } = await import("/src/web-import.js");
    const cifra = parseWebSong(
      "<title>Prueba - Artista - Cifra Club</title><h1>Prueba</h1><a><h2>Artista</h2></a><pre data-chord-content><div>[Intro] <b>C</b>  <b>G</b>\n\n<b>C</b>     <b>G</b>\nLuz del día</div></pre>",
      "https://www.cifraclub.com/artista/prueba/",
    );
    const cuerda = parseWebSong(
      '<title>PRUEBA: Acordes y Letra (Artista)</title><div class="rtBody"><pre>INTRO: <a>C</a> - <a>G</a>\n\n<a>C</a>     <a>G</a>\nLuz del día</pre></div>',
      "https://acordes.lacuerda.net/artista/prueba",
    );
    const data = {
      store: {
        page: {
          data: {
            tab: { song_name: "Prueba", artist_name: "Artista" },
            tab_view: {
              meta: { capo: 2 },
              wiki_tab: {
                content: "[tab][ch]C[/ch]     [ch]G[/ch]\nLuz del día[/tab]",
              },
            },
          },
        },
      },
    };
    const ug = parseWebSong(
      `<div class="js-store" data-content="${JSON.stringify(data).replace(/"/g, "&quot;")}"></div>`,
      "https://tabs.ultimate-guitar.com/tab/artista/prueba-chords-1",
    );
    let invalid = false;
    try {
      parseWebSong("<h1>Access denied</h1>", "https://www.cifraclub.com/a/b/");
    } catch {
      invalid = true;
    }
    return { cifra, cuerda, ug, invalid };
  });
  for (const s of [parsed.cifra, parsed.cuerda, parsed.ug]) {
    assert.equal(s.title, "Prueba");
    assert.equal(s.artist, "Artista");
    assert.ok(s.text.includes("[C]Luz de[G]l día"), s.text);
  }
  assert.equal(parsed.ug.capo, 2);
  assert.ok(parsed.cuerda.text.includes("INTRO: [C] - [G]"));
  assert.ok(parsed.invalid);
  await page.route("**/api/import-web?**", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "Prueba de error de descarga" }),
    }),
  );
  await page.locator("#new").click();
  await page.locator("#web").click();
  await page.locator("#web-url").fill("https://www.cifraclub.com/a/b/");
  await page.locator("#web-submit").click();
  await page.locator("#import-error").waitFor({ state: "visible" });
  assert.match(
    await page.locator("#import-error").textContent(),
    /error de descarga/,
  );
  await page.unroute("**/api/import-web?**");
  await page.screenshot({ path: "artifacts/import-dialog.png" });
  if (process.env.CHORDI_LIVE_IMPORTS) {
    for (const [name, url] of [
      ["cifra", "https://www.cifraclub.com/chris-klafford/imagine/"],
      ["cuerda", "https://acordes.lacuerda.net/no_te_va_gustar/la_cuerda"],
      [
        "ug",
        "https://tabs.ultimate-guitar.com/tab/coldplay/fix-you-chords-202594",
      ],
    ]) {
      if (!(await page.locator("#web-url").isVisible()))
        await page.locator("#web").click();
      await page.locator("#web-url").fill(url);
      await page.locator("#web-submit").click();
      await page.waitForFunction(
        () =>
          !document.querySelector("#new-dialog").open ||
          !document.querySelector("#web-submit").disabled,
      );
      assert.equal(
        await page.locator("#new-dialog").evaluate((el) => el.open),
        false,
        await page.locator("#import-error").textContent(),
      );
      assert.match(
        await page.locator("#title").inputValue(),
        { cifra: /Imagine/i, cuerda: /La Cuerda/i, ug: /Fix You/i }[name],
      );
      console.log(
        name,
        await page.locator("#title").inputValue(),
        `${await page.locator(".page").count()} page(s)`,
      );
      await page.screenshot({ path: `artifacts/import-${name}.png` });
      await page.locator("#new").click();
    }
  }
  assert.deepEqual(errors, []);
  console.log("Import browser checks passed");
} finally {
  await browser.close();
}
