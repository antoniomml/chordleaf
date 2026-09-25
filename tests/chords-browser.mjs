import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page.locator('.rail [data-desktop-view="edit"]').click();
  const source = page.locator("#source");
  const original = "[G]One [D]two\n[G]Three [Gmaj7]four";
  await source.fill(original);
  await source.focus();
  await source.press("Home");
  const selection = await source.evaluate((el) => [
    el.selectionStart,
    el.selectionEnd,
  ]);
  await page.locator('[data-section="key"]').click();
  assert.equal(await source.isVisible(), false);
  assert.equal(await page.locator(".quick").isVisible(), false);
  assert.equal(await page.locator(".dictionary-tray").isVisible(), false);
  assert.equal(await page.locator(".key-name").isVisible(), true);
  await page.locator('[data-section="chords"]').click();
  assert.equal(await page.locator("#settings").isVisible(), false);
  assert.equal(await page.locator(".dictionary-tray").isVisible(), true);
  assert.equal(await page.locator(".dictionary-item svg").count(), 3);
  const cards = await page
    .locator(".dictionary-item.chord-card")
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  assert.equal(new Set(cards).size, 1);
  await page.locator('[data-section="document"]').click();
  assert.equal(await source.inputValue(), original);
  assert.deepEqual(
    await source.evaluate((el) => [el.selectionStart, el.selectionEnd]),
    selection,
  );
  await page.locator('[data-section="chords"]').click();
  await page
    .getByRole("button", { name: "Añadir diagrama de G", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Añadir diagrama de G", exact: true })
    .click();
  await page.locator(".chord-sticker").nth(1).waitFor();
  const stickerPositions = await page
    .locator(".chord-sticker")
    .evaluateAll((els) => els.map((el) => [el.style.left, el.style.top]));
  assert.equal(stickerPositions.length, 2);
  assert.notDeepEqual(stickerPositions[0], stickerPositions[1]);
  assert.equal(
    await page
      .locator("#toast")
      .evaluate((el) => el.classList.contains("visible")),
    true,
  );
  assert.equal(
    await page.locator("#toast").textContent(),
    "Diagrama añadido a la hoja.",
  );
  await page.locator('[data-mode="search"]').click();
  await page.locator("#catalog-search").fill("Abm7b5");
  await page.locator("#catalog-grid .chord-card").first().click();
  assert.equal(await page.locator("#chosen-name").textContent(), "Abm7b5");
  await page.locator("#chosen-next").click();
  const chosenSvg = await page.locator("#chosen-diagram").innerHTML();
  await page.locator("#insert-chosen").click();
  assert.ok((await source.inputValue()).includes("[Abm7b5]"));
  await page.locator("#undo-chord").click();
  assert.equal(await source.inputValue(), original);
  await page.locator("#catalog-search").fill("Db");
  await page.locator("#catalog-grid .chord-card").first().click();
  assert.equal(await page.locator("#chosen-name").textContent(), "C#");
  await page.locator("#catalog-search").fill("not-a-chord");
  assert.equal(await page.locator("#catalog-grid .chord-card").count(), 0);
  await page.locator('[data-mode="identify"]').click();
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
  const result = (name) =>
    page.locator(".chord-match").filter({
      has: page.locator("strong", { hasText: new RegExp(`^${name}$`) }),
    });
  assert.equal(await result("C6").count(), 1);
  assert.equal(await result("Am7/C").count(), 1);
  assert.equal(
    await page.locator("#sounding-notes, .identify-preferences").count(),
    0,
  );
  assert.equal(await page.locator("#first-fret").textContent(), "Traste 1");
  assert.equal(await page.locator("#frets-back").isEnabled(), false);
  await page.screenshot({ path: "artifacts/chord-identifier.png" });
  await result("C6").click();
  assert.equal(await page.locator("#chosen-next").isEnabled(), true);
  await page.locator("#chosen-next").click();
  await page.locator("#chosen-prev").click();
  await page.locator("#replace-target").selectOption("G");
  await page.locator("#replace-occurrence").selectOption("1");
  await page.locator("#replace-chosen").click();
  assert.equal(
    await source.inputValue(),
    "[G]One [D]two\n[C6]Three [Gmaj7]four",
  );
  await page.locator("#undo-chord").click();
  assert.equal(await source.inputValue(), original);
  await page.locator("#replace-target").selectOption("G");
  await page.locator("#replace-chosen").click();
  assert.equal(
    await source.inputValue(),
    "[C6]One [D]two\n[C6]Three [Gmaj7]four",
  );
  assert.equal(
    await page.locator(".sticker-image text").first().textContent(),
    "C6",
  );
  await page.waitForTimeout(450);
  let stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("chordleaf-v1")),
  );
  assert.deepEqual(stored.songs[0].chordShapes.C6.frets, [-1, 3, 2, 2, 1, 3]);
  await page.locator('[data-section="document"]').click();
  await page.locator('.rail [data-desktop-view="edit"]').click();
  await source.fill((await source.inputValue()) + " edited");
  await page.locator('[data-mode="identify"]').click();
  assert.equal(await page.locator("#undo-chord").isVisible(), false);
  for (let i = 1; i < 20; i++) await page.locator("#frets-forward").click();
  assert.equal(await page.locator("#first-fret").textContent(), "Traste 20");
  assert.equal(await page.locator("#frets-forward").isEnabled(), false);
  await page.locator('[data-string="0"][data-fret="24"]').click();
  assert.equal(
    await page
      .locator('[data-string="0"][data-fret="24"]')
      .getAttribute("aria-pressed"),
    "true",
  );
  // Building another shape must not leave the previous selection actionable.
  assert.equal(await page.locator("#use-chord").isVisible(), false);
  await page.locator("#clear-frets").click();
  assert.equal(await page.locator(".chord-match").count(), 0);
  for (let i = 20; i > 1; i--) await page.locator("#frets-back").click();
  await page.locator('[data-string="0"][data-fret="-1"]').click();
  assert.equal(
    await page
      .locator('.open-string[data-string="0"] .string-state-label')
      .textContent(),
    "Al aire",
  );
  assert.equal(
    await page
      .locator('.open-string[data-string="0"]')
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.locator('[data-string="0"][data-fret="-1"]').click();
  assert.equal(await page.locator(".chord-match").count(), 0);
  assert.equal(
    await page
      .locator('.open-string[data-string="0"] .string-state-label')
      .textContent(),
    "Apagada",
  );
  assert.equal(
    await page
      .locator('.open-string[data-string="0"]')
      .getAttribute("aria-pressed"),
    "false",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "artifacts/chords-mobile.png",
    fullPage: true,
  });
  await page.locator('[data-harmony-view="search"]').click();
  await page.locator("#catalog-search").fill("Abm7b5");
  await page.locator("#catalog-grid .chord-card").first().click();
  await page.locator("#chosen-next").click();
  assert.equal(await page.locator("#chosen-diagram").innerHTML(), chosenSvg);
  await page.locator("#replace-target").selectOption("D");
  await page.locator("#replace-chosen").click();
  await page.locator('[data-harmony-view="song"]').click();
  assert.equal(
    await page
      .getByRole("button", { name: "Editar posición de Abm7b5", exact: true })
      .locator("svg")
      .count(),
    1,
  );
  await page.waitForTimeout(450);
  await page.reload();
  assert.ok((await source.inputValue()).includes("[Abm7b5]"));
  await page.locator('.rail [data-mobile-view="music"]').click();
  await page.locator('[data-music-section="chords"]').click();
  const savedSvg = await page
    .getByRole("button", { name: "Editar posición de Abm7b5", exact: true })
    .locator("svg")
    .evaluate((el) => el.outerHTML);
  assert.equal(savedSvg, chosenSvg);
  assert.deepEqual(errors, []);
  console.log("Chord workspace browser checks passed");
} finally {
  await browser.close();
}
