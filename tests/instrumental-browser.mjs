import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(process.env.CHORDI_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page.locator("#title").fill("Pasaje instrumental");
  await page.locator("#artist").fill("Prueba de maquetación");
  await page
    .locator("#source")
    .fill(
      "[Intro] [C][G][Am][F]\n\n[Solo] [F#7M] [F#6] [A#m] [A#7(11)]\n[A#m7(5-)] [D#7(9-)] [G#m] [G#m7(5-)]\n\n|: [C] | [G] :| x2\n\n[C]Vuelve la [G]voz",
    );
  const rows = await page.locator(".song-line").evaluateAll((els) =>
    els
      .filter((el) => el.querySelector(".sheet-chord"))
      .map((el) => ({
        lyric: el.querySelector(".lyric").textContent,
        lyricTop: el.querySelector(".lyric").style.top,
        chords: [...el.querySelectorAll(".sheet-chord")].map((c) => ({
          text: c.textContent,
          top: c.style.top,
          left: c.getBoundingClientRect().left,
          right: c.getBoundingClientRect().right,
        })),
      })),
  );
  for (const row of rows.slice(0, -1)) {
    assert.equal(row.lyricTop, "0px");
    assert.ok(row.chords.every((c) => c.top === "0px"));
    for (let i = 1; i < row.chords.length; i++)
      assert.ok(row.chords[i].left > row.chords[i - 1].right);
  }
  assert.match(rows[0].lyric, /Intro/);
  assert.match(rows[0].lyric, /–/);
  assert.notEqual(rows.at(-1).lyricTop, "0px");
  // Real pointer hit testing catches whitespace overlays that synthetic events miss.
  for (const chord of await page.locator(".sheet-chord").all()) {
    await chord.hover();
    assert.equal(await page.locator("#chord-tooltip").isVisible(), true);
    assert.equal(
      await page.locator("#chord-tooltip strong").textContent(),
      await chord.textContent(),
    );
    assert.equal(await page.locator("#chord-tooltip svg").count(), 1);
    await page.mouse.move(10, 10);
    assert.equal(await page.locator("#chord-tooltip").isVisible(), false);
  }
  await page.screenshot({ path: "artifacts/instrumental-preview.png" });
  for (const type of ["pdf", "docx"]) {
    await page.locator("#export").click();
    const downloading = page.waitForEvent("download");
    await page.locator(`[data-export="${type}"]`).click();
    await (await downloading).saveAs(`artifacts/instrumental.${type}`);
  }
  console.log("Instrumental preview and export checks passed");
} finally {
  await browser.close();
}
