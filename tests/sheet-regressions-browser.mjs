import { chromium, firefox, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });
async function cell(row, offset) {
  return row.locator(".lyric").evaluate((el, offset) => {
    const range = document.createRange();
    range.setStart(el.firstChild, offset);
    range.setEnd(el.firstChild, offset + 1);
    const rect = range.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, offset);
}
async function clickEnd(page, row) {
  const text = await row.locator(".lyric").innerText();
  const last = await cell(row, text.length - 1);
  await page.mouse.click(last.x + last.width * 0.9, last.y + last.height / 2);
}
for (const engine of [chromium, firefox, webkit].filter(
  (engine) =>
    !process.env.CHORDLEAF_BROWSERS ||
    process.env.CHORDLEAF_BROWSERS.split(",").includes(engine.name()),
)) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      locale: "es-ES",
      viewport: { width: 1440, height: 900 },
      serviceWorkers: "block",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173/es/");
    await page.locator("#empty-new").click();
    await page.locator("#blank").click();
    await page.locator('.rail [data-desktop-view="edit"]').click();
    const source = page.locator("#source"),
      editor = page.locator(".inline-lyric-editor");
    const original = "[Cmaj7]Una casa [G]azul\n[Am]Otra línea";
    await source.fill(original);
    await page.locator("#align-chords").click();
    const first = page.locator('.song-line[data-line="0"]');
    await page.evaluate(() => document.fonts.ready);
    const printed = await first.locator(".lyric").innerText();
    const offset = printed.indexOf("casa"),
      point = await cell(first, offset);
    const before = await first.locator(".lyric").boundingBox();
    await page.mouse.click(
      point.x + point.width * 0.15,
      point.y + point.height / 2,
    );
    await expect(editor).toBeFocused();
    assert.equal(
      await editor.evaluate(() => window.getSelection().anchorOffset),
      offset,
    );
    assert.deepEqual(await editor.boundingBox(), before);
    await expect(first.locator(".sheet-chord")).toHaveCount(2);
    await expect(page.locator("textarea.inline-editor")).toHaveCount(0);
    const style = await editor.evaluate((el) => {
      const css = getComputedStyle(el);
      return [css.backgroundColor, css.borderWidth, css.boxShadow];
    });
    assert.deepEqual(style, ["rgba(0, 0, 0, 0)", "0px", "none"]);
    await page.screenshot({
      path: `artifacts/native-lyric-editor-${engine.name()}.png`,
    });
    await page.keyboard.insertText("bonita ");
    await editor.press("Enter");
    await expect(source).toHaveValue(
      "[Cmaj7]Una bonita casa [G]azul\n[Am]Otra línea",
    );
    await clickEnd(page, first);
    await page.keyboard.insertText(" hoy");
    // Clicking another row must finish the first edit and place the next caret.
    await clickEnd(page, page.locator('.song-line[data-line="1"]'));
    await expect(editor).toBeFocused();
    await page.keyboard.insertText(" más");
    await editor.press("Enter");
    await expect(source).toHaveValue(
      "[Cmaj7]Una bonita casa [G]azul hoy\n[Am]Otra línea más",
    );

    const long =
      "[C]" +
      Array.from(
        { length: 50 },
        (_, i) => `palabra${String(i).padStart(2, "0")}`,
      ).join(" ");
    await source.fill(long);
    const wrapped = page.locator('.song-line[data-line="0"]').nth(1);
    const continuation = await wrapped.locator(".lyric").innerText();
    const word = continuation.trim().split(" ")[0];
    const spot = await cell(wrapped, continuation.indexOf(word));
    await page.mouse.click(spot.x + spot.width * 0.1, spot.y + spot.height / 2);
    await page.keyboard.insertText("nuevo ");
    await editor.press("Enter");
    await expect(source).toHaveValue(long.replace(word, "nuevo " + word));

    await source.fill(original);
    await first.locator(".lyric").click();
    await editor.press("ControlOrMeta+a");
    await editor.press("Backspace");
    await editor.press("Enter");
    await expect(source).toHaveValue("[Cmaj7][G]\n[Am]Otra línea");

    for (const breaks of [1, 2]) {
      await source.fill("[C]Luz\n[G]Otra línea");
      await clickEnd(page, first);
      for (let i = 0; i < breaks; i++) await editor.press("Shift+Enter");
      await editor.press("Enter");
      await expect(source).toHaveValue(
        "[C]Luz" + "\n".repeat(breaks) + "\n[G]Otra línea",
      );
    }
    await source.fill("[C]Luz\n[G]Otra línea");
    await first.locator(".lyric").click();
    await editor.fill("Nueva letra\n\n");
    await editor.press("Enter");
    await expect(source).toHaveValue("[C]Nueva letra\n\n\n[G]Otra línea");

    // A long chord label adds printed tail padding; that padding must still
    // expose distinct blank columns for a subsequent move.
    await source.fill("Luz[Cmaj7]");
    const tail = first.locator('[data-chord="Cmaj7"]');
    const tailLabel = await tail.boundingBox(),
      tailCell = await cell(first, 0);
    const tailRow = await first.boundingBox();
    await page.mouse.move(
      tailLabel.x + tailLabel.width / 2,
      tailLabel.y + tailLabel.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      tailRow.x + 5.5 * tailCell.width,
      tailLabel.y + tailLabel.height / 2,
      { steps: 3 },
    );
    await page.mouse.up();
    await expect(source).toHaveValue("Luz  [Cmaj7]");

    // A drop far down a zoomed document must retain both scroll coordinates.
    const verses = Array.from(
      { length: 85 },
      (_, i) => `[C]Verso inventado ${i}`,
    ).join("\n");
    await source.fill(verses);
    for (let i = 0; i < 6; i++) await page.locator("#zoom-in").click();
    const row = page.locator('.song-line[data-line="60"]');
    await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const scroll = page.locator("#pages-scroll");
    await scroll.evaluate((el) => {
      el.scrollLeft = 30;
    });
    const position = await scroll.evaluate((el) => [
      el.scrollTop,
      el.scrollLeft,
    ]);
    assert.ok(position[0] > 2000);
    const chord = row.locator('[data-chord="C"]');
    const label = await chord.boundingBox(),
      letter = await cell(row, 0);
    const rect = await row.boundingBox();
    const column = 27;
    await page.mouse.move(
      label.x + label.width / 2,
      label.y + label.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      rect.x + (column + 0.5) * letter.width,
      label.y + label.height / 2,
      { steps: 4 },
    );
    await page.mouse.up();
    const expected = verses.split("\n");
    expected[60] = "Verso inventado 60".padEnd(column) + "[C]";
    await expect(source).toHaveValue(expected.join("\n"));
    assert.deepEqual(
      await scroll.evaluate((el) => [el.scrollTop, el.scrollLeft]),
      position,
    );
    await chord.press("ArrowRight");
    expected[60] = "Verso inventado 60".padEnd(column + 1) + "[C]";
    await expect(source).toHaveValue(expected.join("\n"));
    assert.deepEqual(
      await scroll.evaluate((el) => [el.scrollTop, el.scrollLeft]),
      position,
    );
    await page.locator("#sheet-alignment-undo").click();
    await page.locator("#sheet-alignment-undo").click();
    await expect(source).toHaveValue(verses);
    assert.deepEqual(
      await scroll.evaluate((el) => [el.scrollTop, el.scrollLeft]),
      position,
    );
    await page.screenshot({
      path: `artifacts/sheet-regressions-${engine.name()}.png`,
    });
    assert.deepEqual(errors, []);
    console.log(
      `${engine.name()}: native caret, switching rows, wrapped lyrics, blank chord anchors and zoomed scroll passed`,
    );
  } finally {
    await browser.close();
  }
}
