import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page
    .locator("#source")
    .fill("[C][D][E][F][G][A][B][Am][Dm][Em][G7][C7]");
  assert.equal(
    await page.locator(".rail-bottom, .quick, #browse-chords").count(),
    0,
  );
  assert.equal(
    await page.locator(".rail").evaluate((el) => el.clientWidth),
    67,
  );
  assert.equal(
    await page.locator(".topbar").evaluate((el) => el.clientHeight),
    61,
  );
  assert.ok((await page.locator("#source").boundingBox()).height > 350);
  await page.locator('[data-section="chords"]').click();
  await page
    .getByRole("button", { name: "Añadir todos los diagramas", exact: true })
    .click();
  const sticker = page.locator(".chord-sticker");
  await sticker.focus();
  await sticker.locator(".configure-sticker").click();
  const dialog = page.locator("#sticker-layout-dialog");
  await dialog.locator('[name="columns"]').fill("6");
  await dialog.locator('[name="width"]').fill("105");
  await dialog.locator('[name="height"]').fill("42");
  assert.ok(
    (await dialog.locator(".sticker-layout-summary").textContent()).includes(
      "6 columnas × 2 filas",
    ),
  );
  await dialog.screenshot({ path: "artifacts/frame-layout.png" });
  await dialog.getByRole("button", { name: "Aplicar", exact: true }).click();
  const frameSize = () =>
    sticker.evaluate((el) => ({
      width: parseFloat(el.style.width),
      height: parseFloat(el.style.height),
    }));
  let size = await frameSize();
  assert.ok(Math.abs(size.width - (105 * 72) / 25.4) < 0.01);
  assert.ok(Math.abs(size.height - (42 * 72) / 25.4) < 0.01);
  // Width and height respond independently to keyboard resizing.
  await sticker.locator(".resize-height").focus();
  await page.keyboard.press("ArrowUp");
  assert.equal((await frameSize()).width, size.width);
  assert.equal((await frameSize()).height, size.height - 5);
  size = await frameSize();
  await sticker.locator(".resize-width").focus();
  await page.keyboard.press("ArrowLeft");
  assert.equal((await frameSize()).height, size.height);
  assert.equal((await frameSize()).width, size.width - 5);
  // Repeated diagonal drags keep shrinking through old column thresholds,
  // even when zoomed, without changing columns or moving the frame origin.
  await page.locator("#zoom-in").click();
  await sticker.scrollIntoViewIfNeeded();
  await sticker.focus();
  const handle = await sticker.locator(".resize-corner").boundingBox();
  const origin = await sticker.evaluate((el) => [el.style.left, el.style.top]);
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  let previous = await frameSize();
  for (const delta of [25, 50, 80, 110, 150, 190, 240, 300]) {
    await page.mouse.move(
      handle.x + handle.width / 2 - delta,
      handle.y + handle.height / 2 - delta / 2,
    );
    const next = await frameSize();
    assert.ok(next.width <= previous.width);
    assert.ok(next.height <= previous.height);
    previous = next;
  }
  await page.mouse.up();
  assert.ok(previous.width < 65);
  assert.equal(previous.height, 28);
  assert.deepEqual(
    await sticker.evaluate((el) => [el.style.left, el.style.top]),
    origin,
  );
  await page.waitForTimeout(450);
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("chordleaf-v1")).songs[0]
        .chordStickers[0],
  );
  assert.equal(saved.columns, 6);
  // Keep the small frame on TXT import; PDF/Word use the same geometry.
  await page.locator("#export").click();
  const waiting = page.waitForEvent("download");
  await page.locator('[data-export="txt"]').click();
  await (await waiting).saveAs("artifacts/small-frame.txt");
  await page.locator("#new").click();
  await page.locator("#file").setInputFiles("artifacts/small-frame.txt");
  await page.waitForFunction(() => !document.querySelector("#new-dialog").open);
  assert.deepEqual(await frameSize(), previous);
  await page.locator('[data-mode="identify"]').click();
  const fretSize = await page.locator("#fretboard").boundingBox();
  await page.locator("#panel-splitter").focus();
  for (let i = 0; i < 16; i++) await page.keyboard.press("ArrowRight");
  const wideFret = await page.locator("#fretboard").boundingBox();
  assert.equal(wideFret.width, fretSize.width);
  assert.equal(wideFret.height, fretSize.height);
  const instrument = await page.locator(".identify-instrument").boundingBox();
  const results = await page.locator(".identify-readings").boundingBox();
  assert.ok(results.x > instrument.x + instrument.width);
  // Horizontal order and tablature string direction.
  const eHigh = await page
    .locator('[data-string="5"][data-fret="1"]')
    .boundingBox();
  const eLow = await page
    .locator('[data-string="0"][data-fret="1"]')
    .boundingBox();
  const nextFret = await page
    .locator('[data-string="5"][data-fret="2"]')
    .boundingBox();
  assert.ok(eHigh.y < eLow.y);
  assert.ok(nextFret.x > eHigh.x);
  for (const [string, fret] of [
    [1, 3],
    [2, 2],
    [3, 2],
    [4, 1],
    [5, 3],
  ])
    await page
      .locator(`[data-string="${string}"][data-fret="${fret}"]`)
      .click();
  await page.screenshot({ path: "artifacts/identifier-wide.png" });
  await page.locator("#frets-forward").click();
  assert.equal(await page.locator("#first-fret").textContent(), "Traste 2");
  assert.equal(
    await page
      .locator('[data-string="1"][data-fret="-1"] .string-state-symbol')
      .textContent(),
    "3",
  );
  await page.locator("#frets-back").click();
  assert.equal(
    await page
      .locator('[data-string="1"][data-fret="3"]')
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#panel-splitter").press("Home");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.locator('[data-section="chords"]').click();
  assert.equal((await page.locator("#fretboard").boundingBox()).width, 300);
  await page.screenshot({
    path: "artifacts/identifier-horizontal-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log("Compact workspace and two-axis frame resize checks passed");
} finally {
  await browser.close();
}
