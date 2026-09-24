import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  locale: "es-ES",
  viewport: { width: 1440, height: 1000 },
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#new").click();
  assert.deepEqual(
    await page.locator("#new-dialog .choice strong").allTextContents(),
    [
      "Importar texto o archivo",
      "Abrir proyecto editable",
      "Importar desde una web",
      "Empezar de cero",
    ],
  );
  await page.locator("#import").click();
  await page
    .locator("#import-text")
    .fill("{title: Prueba}\n" + "G      D\nVuelve la mañana\n".repeat(30));
  await page.locator("#paste-import").click();
  await page.locator(".page").waitFor();
  assert.equal(await page.locator(".page").count(), 1);
  assert.equal(
    await page.locator(".sheet-brand").textContent(),
    "chordleaf.com",
  );
  await page.screenshot({ path: "artifacts/import-fit.png" });
  async function parseThroughUI(html, url, contentType = "text/html") {
    await page.route("**/api/import-web?**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ html, url, contentType }),
      }),
    );
    await page.locator("#new").click();
    await page.locator("#web").click();
    await page.locator("#web-url").fill(url);
    await page.locator("#web-submit").click();
    await page.waitForFunction(
      () =>
        !document.querySelector("#new-dialog").open ||
        !document.querySelector("#import-error").hidden,
    );
    const invalid = await page.locator("#import-error").isVisible();
    const result = invalid
      ? null
      : await page.evaluate(() => {
          const workspace = JSON.parse(localStorage.getItem("chordleaf-v1"));
          return workspace.songs.find((s) => s.id === workspace.active);
        });
    if (invalid) await page.locator(".dialog-close").click();
    await page.unroute("**/api/import-web?**");
    return result;
  }
  const cifra = await parseThroughUI(
    "<title>Prueba - Artista - Cifra Club</title><h1>Prueba</h1><a><h2>Artista</h2></a><pre data-chord-content><div>[Intro] <b>C</b>  <b>G</b>\n\n<b>C</b>     <b>G</b>\nLuz del día</div></pre>",
    "https://www.cifraclub.com/artista/prueba/",
  );
  const cuerda = await parseThroughUI(
    '<title>PRUEBA, Artista: Acordes</title><div id="tH1"><h1><a>Prueba</a></h1><h2><a>Artista</a></h2></div><pre id="tCode"></pre><div id="t_body"><pre>INTRO: <a>C</a> - <a>G</a>\n\n<a>C</a>     <a>G</a>\nLuz del día</pre></div>',
    "https://acordes.lacuerda.net/artista/prueba",
  );
  const cuerdaTxt = await parseThroughUI(
    "=====================================================================\n| ARTISTA: Artista                                                   |\n| CANCION: PRUEBA                                                    |\n=====================================================================\n\nC     G\nLuz del día",
    "https://acordes.lacuerda.net/TXT/artista/prueba.txt",
    "text/plain",
  );
  const cuerdaAligned = await parseThroughUI(
    '<title>PRUEBA, Artista: Acordes</title><div id="tH1"><h1><a>Prueba</a></h1><h2><a>Artista</a></h2></div><div id="t_body"><pre>INTRO:  <a>Bm9</a> <a>Em7</a> <a>F#4/7</a>\n\n          <a>Bm9</a>                 <a>A4</a>\n          Suena la luz de mi canción</pre></div>',
    "https://acordes.lacuerda.net/artista/prueba",
  );
  assert.equal(
    cuerdaAligned.text.split("\n")[0],
    "INTRO:  [Bm9] [Em7] [F#7sus4]",
  );
  assert.match(cuerdaAligned.text, /^\[Bm9\]Suena la luz/m);
  assert.ok(!cuerdaAligned.text.split("\n").some((line) => /^ +\S/.test(line)));
  assert.deepEqual(
    await page
      .locator('.song-line[data-line="0"] .sheet-chord')
      .evaluateAll((marks) => marks.map((mark) => mark.style.top)),
    ["0px", "0px", "0px"],
  );
  const cuerdaAlignedTxt = await parseThroughUI(
    "=====================================================================\n| ARTISTA: Artista                                                   |\n| CANCION: PRUEBA                                                    |\n=====================================================================\n\nINTRO:  Bm9 Em7 F#4/7\n\n          Bm9            A4\n          Suena la luz de mi canción",
    "https://acordes.lacuerda.net/TXT/artista/prueba.txt",
    "text/plain",
  );
  assert.equal(
    cuerdaAlignedTxt.text.split("\n")[0],
    "INTRO:  [Bm9] [Em7] [F#7sus4]",
  );
  assert.match(cuerdaAlignedTxt.text, /^\[Bm9\]Suena la luz/m);
  const cuerdaSpanish = await parseThroughUI(
    '<title>PAYASO, El Kanka: Acordes</title><div id="tH1"><h1><a>Payaso</a></h1><h2><a>El Kanka</a></h2></div><div id="t_body"><pre>- Capo en segundo traste -\n\n<a>MIm</a>         <a>SI7</a>       <a>MIm</a>\nMe dicen que soy un payaso,\n<a>MI7</a>.                   <a>LAm</a>\nporque no les tomo en serio,\n<a>DO</a> .          <a>SI7</a>\nque siempre seré un payaso,</pre></div>',
    "https://acordes.lacuerda.net/kanka/payaso.shtml",
  );
  assert.equal(cuerdaSpanish.title, "Payaso");
  assert.equal(cuerdaSpanish.artist, "El Kanka");
  assert.equal(cuerdaSpanish.capo, 2);
  assert.match(
    cuerdaSpanish.text,
    /\[Em\]Me dicen qu\[B7\]e soy un \[Em\]payaso/,
  );
  assert.match(cuerdaSpanish.text, /\[E7\]porque no les tomo en\[Am\] serio/);
  assert.match(cuerdaSpanish.text, /\[C\]que siempre \[B7\]seré un payaso/);
  assert.doesNotMatch(cuerdaSpanish.text, /Capo en segundo traste/);
  assert.doesNotMatch(cuerdaSpanish.text, /MIm|SI7|MI7|LAm|DO|\[E7\.\]/);
  const unresolved = await parseThroughUI(
    '<title>PRUEBA, Artista: Acordes</title><div id="tH1"><h1><a>Prueba</a></h1><h2><a>Artista</a></h2></div><div id="t_body"><pre><a>C</a>     <a>H7</a>\nLuz del día</pre></div>',
    "https://acordes.lacuerda.net/artista/prueba",
  );
  assert.match(unresolved.text, /\[C\]Luz de\[\?H7\]l día/);
  assert.equal(await page.locator(".unresolved-chord").count(), 1);
  assert.match(await page.locator("#issue-count").textContent(), /1/);
  await page.locator(".unresolved-chord").click();
  await page.screenshot({ path: "artifacts/import-issue.png" });
  await page.locator("#issue-value").fill("incorrecto");
  await page.locator('#issue-editor button[type="submit"]').click();
  assert.match(
    await page.locator("#issue-message").textContent(),
    /no reconocido/,
  );
  await page.locator("#issue-value").fill("B7");
  await page.locator('#issue-editor button[type="submit"]').click();
  assert.equal(await page.locator(".unresolved-chord").count(), 0);
  assert.equal(await page.locator("#issue-count").isVisible(), false);
  assert.match(await page.locator("#source").inputValue(), /\[B7\]/);
  const lyricsOnly = await parseThroughUI(
    '<title>PRUEBA, Artista: Acordes</title><div id="tH1"><h1><a>Prueba</a></h1><h2><a>Artista</a></h2></div><div id="t_body"><pre>Una canción sin acordes\nOtra línea de letra</pre></div>',
    "https://acordes.lacuerda.net/artista/prueba",
  );
  assert.match(lyricsOnly.text, /Una canción sin acordes/);
  assert.match(await page.locator("#issue-count").textContent(), /Sin acordes/);
  const misspelledTxt = await parseThroughUI(
    "=====================================================================\n| ARTISTA: Artista |\n| CANCION: PRUEBA |\n=====================================================================\n\nH7\nLuz del día",
    "https://acordes.lacuerda.net/TXT/artista/prueba.txt",
    "text/plain",
  );
  assert.match(misspelledTxt.text, /\[\?H7\]Luz del día/);
  const misspelledCifra = await parseThroughUI(
    "<title>Prueba - Artista - Cifra Club</title><h1>Prueba</h1><a><h2>Artista</h2></a><pre data-chord-content><b>H7</b>\nLuz del día</pre>",
    "https://www.cifraclub.com/artista/prueba/",
  );
  assert.match(misspelledCifra.text, /\[\?H7\]Luz del día/);
  const grid =
    "C     G\n" +
    [1, 2, 3, 4, 5, 6].map((string) => `${string}-0   ${string}-X`).join("\n");
  const cuerdaGrid = await parseThroughUI(
    `<title>PRUEBA, Artista: Acordes</title><div id="tH1"><h1><a>Prueba</a></h1><h2><a>Artista</a></h2></div><div id="t_body"><pre><a>C</a>\nLuz del día\n\nCORO:\n\n${grid}</pre></div>`,
    "https://acordes.lacuerda.net/artista/prueba",
  );
  const cuerdaGridTxt = await parseThroughUI(
    `=====================================================================\n| ARTISTA: Artista |\n| CANCION: PRUEBA |\n=====================================================================\n\nC\nLuz del día\n\nCORO:\n\n${grid}\n\n=========================== lacuerda.net ============================\nPie de la web`,
    "https://acordes.lacuerda.net/TXT/artista/prueba.txt",
    "text/plain",
  );
  for (const imported of [cuerdaGrid, cuerdaGridTxt]) {
    assert.match(imported.text, /Luz del día/);
    assert.doesNotMatch(imported.text, /1-0|6-X|CORO:|Pie de la web/);
  }
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
  const ug = await parseThroughUI(
    `<div class="js-store" data-content="${JSON.stringify(data).replace(/"/g, "&quot;")}"></div>`,
    "https://tabs.ultimate-guitar.com/tab/artista/prueba-chords-1",
  );
  const ugEs = await parseThroughUI(
    `<div class="js-store" data-content="${JSON.stringify(data).replace(/"/g, "&quot;")}"></div>`,
    "https://es.ultimate-guitar.com/tab/artista/prueba-chords-1",
  );
  const invalid = !(await parseThroughUI(
    "<h1>Access denied</h1>",
    "https://www.cifraclub.com/a/b/",
  ));
  const parsed = { cifra, cuerda, cuerdaTxt, ug, ugEs, invalid };
  for (const s of [
    parsed.cifra,
    parsed.cuerda,
    parsed.cuerdaTxt,
    parsed.ug,
    parsed.ugEs,
  ]) {
    assert.equal(s.title, "Prueba");
    assert.equal(s.artist, "Artista");
    assert.ok(s.text.includes("[C]Luz de[G]l día"), s.text);
  }
  assert.equal(parsed.ug.capo, 2);
  assert.equal(parsed.ugEs.capo, 2);
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
  if (process.env.CHORDLEAF_LIVE_IMPORTS) {
    for (const [name, url] of [
      ["cifra", "https://www.cifraclub.com/chris-klafford/imagine/"],
      [
        "cuerda-html",
        "https://acordes.lacuerda.net/alejandro_sanz/amiga_mia.shtml",
      ],
      ["cuerda-spanish", "https://acordes.lacuerda.net/kanka/payaso.shtml"],
      [
        "cuerda-txt",
        "https://acordes.lacuerda.net/TXT/alejandro_sanz/amiga_mia.txt",
      ],
      [
        "ug",
        "https://tabs.ultimate-guitar.com/tab/coldplay/fix-you-chords-202594",
      ],
      [
        "ug-es",
        "https://es.ultimate-guitar.com/tab/viva-suecia/hablar-de-nada-chords-5067583",
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
        {
          cifra: /Imagine/i,
          "cuerda-html": /Amiga M[ií]a/i,
          "cuerda-spanish": /Payaso/i,
          "cuerda-txt": /Amiga M[ií]a/i,
          ug: /Fix You/i,
          "ug-es": /Hablar De Nada/i,
        }[name],
      );
      if (name.startsWith("cuerda")) {
        const source = await page.locator("#source").inputValue();
        assert.doesNotMatch(source, /(?:^|\n)\s*1-(?:\d|X)/);
        assert.doesNotMatch(source, /lacuerda\.net/i);
      }
      console.log(
        name,
        await page.locator("#title").inputValue(),
        `${await page.locator(".page").count()} page(s)`,
      );
      await page.screenshot({ path: `artifacts/import-${name}.png` });
      await page.locator("#new").click();
    }
  }
  const mobile = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 390, height: 844 },
  });
  await mobile.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await mobile.route("**/api/import-web?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        html: '<title>PRUEBA, Artista: Acordes</title><div id="tH1"><h1><a>Prueba</a></h1><h2><a>Artista</a></h2></div><div id="t_body"><pre><a>C</a>     <a>H7</a>\nLuz del día</pre></div>',
        url: "https://acordes.lacuerda.net/artista/prueba",
        contentType: "text/html",
      }),
    }),
  );
  await mobile.locator("#empty-new").click();
  await mobile.locator("#web").click();
  await mobile
    .locator("#web-url")
    .fill("https://acordes.lacuerda.net/artista/prueba");
  await mobile.locator("#web-submit").click();
  await mobile.locator(".unresolved-chord").waitFor();
  assert.equal(
    await mobile.locator("main").getAttribute("data-mobile-view"),
    "preview",
  );
  assert.equal(await mobile.locator("#preview-panel").isVisible(), true);
  await mobile.locator(".unresolved-chord").click();
  assert.equal(await mobile.locator("#issue-editor").isVisible(), true);
  await mobile.screenshot({ path: "artifacts/import-issue-mobile.png" });
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log("Import browser checks passed");
} finally {
  await browser.close();
}
