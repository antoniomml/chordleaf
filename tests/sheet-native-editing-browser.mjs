import { chromium, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });
for (const [engine, mobile] of [
  [chromium, false],
  [webkit, false],
  [chromium, true],
  [webkit, true],
]) {
  const browser = await engine.launch();
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173/es/");
    await page.locator("#empty-new").click();
    await page.locator("#blank").click();
    await page
      .locator(`.rail [data-${mobile ? "mobile" : "desktop"}-view="edit"]`)
      .click();
    const source = page.locator("#source");
    await source.fill("[C]Una [G]casa\n[Am]Otro verso\nLetra sin acordes");
    await page.locator("#align-chords").click();
    const row = (index) =>
      page.locator(`.song-line[data-line="${index}"]`).first();
    assert.ok(
      (await page.locator(".sheet-chord-handle").allTextContents()).every(
        (text) => !text,
      ),
    );

    if (!mobile) {
      await row(0).locator(".lyric").click();
      const editor = page.locator(".inline-lyric-editor");
      await editor.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
      await editor.evaluate((el) => {
        window.__nativeLyric = el;
      });
      const originalX = (await row(0).locator('[data-chord="G"]').boundingBox())
        .x;
      const cw = (await row(0).locator('[data-chord="G"]').boundingBox()).width;
      for (let n = 1; n <= 2; n++) {
        await editor.press("Space");
        const moved = (await row(0).locator('[data-chord="G"]').boundingBox())
          .x;
        assert.ok(
          Math.abs(moved - originalX - n * cw) < 1,
          "Each space moves the chord before the editor closes",
        );
        assert.ok(
          await editor.evaluate(
            (el) =>
              el === window.__nativeLyric && document.activeElement === el,
          ),
        );
      }
      await editor.evaluate((el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node,
          remaining = 6;
        while ((node = walker.nextNode())) {
          if (remaining <= node.length) {
            const range = document.createRange();
            range.setStart(node, remaining);
            range.collapse(true);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            break;
          }
          remaining -= node.length;
        }
      });
      await editor.press("Enter");
      await expect(source).toHaveValue(
        "  [C]Una \n[G]casa\n[Am]Otro verso\nLetra sin acordes",
      );
      await expect(row(1).locator(".inline-lyric-editor")).toBeFocused();
      const nextX = (await row(1).locator('[data-chord="G"]').boundingBox()).x;
      await editor.pressSequentially("n");
      assert.ok(
        Math.abs(
          (await row(1).locator('[data-chord="G"]').boundingBox()).x -
            nextX -
            cw,
        ) < 1,
      );
      await editor.pressSequentially("ueva ");
      await editor.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
      await editor.press("Enter");
      await expect(row(2).locator(".inline-lyric-editor")).toBeFocused();
      await editor.pressSequentially("Línea nueva");
      await editor.press("ControlOrMeta+Enter");
      await expect(source).toHaveValue(
        "  [C]Una \nnueva [G]casa\nLínea nueva\n[Am]Otro verso\nLetra sin acordes",
      );
    }

    const g = page.locator('.sheet-chord[data-chord="G"]').first();
    await g.dblclick();
    const chord = page.locator(".inline-chord-editor");
    assert.equal(await chord.evaluate((el) => el.tagName), "SPAN");
    await expect(
      page.locator(
        "input.inline-chord-editor, textarea.inline-chord-editor, dialog[open]",
      ),
    ).toHaveCount(0);
    const style = await chord.evaluate((el) => {
      const css = getComputedStyle(el);
      return [css.borderWidth, css.backgroundColor, css.boxShadow];
    });
    assert.deepEqual(style, ["0px", "rgba(0, 0, 0, 0)", "none"]);
    await chord.fill("Dm7");
    await expect(chord).toHaveText("Dm7");
    await chord.press("Enter");
    assert.ok((await source.inputValue()).includes("[Dm7]"));

    const index = mobile ? 2 : 4;
    await row(index).locator(".sheet-chord-handle").click();
    await row(index)
      .locator(".sheet-chord-lane")
      .click({ position: { x: 1, y: 5 } });
    const added = page.locator(".sheet-new-chord-editor");
    await expect(added).toBeFocused();
    assert.equal(await added.evaluate((el) => el.tagName), "SPAN");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await added.fill("Em7");
    await added.press("Enter");
    assert.ok((await source.inputValue()).includes("[Em7]Letra sin acordes"));
    await page.screenshot({
      path: `artifacts/sheet-native-${engine.name()}-${mobile ? "mobile" : "desktop"}.png`,
    });
    assert.deepEqual(errors, []);
    console.log(
      `${engine.name()} ${mobile ? "mobile" : "desktop"}: native chord text, clean margins${mobile ? "" : ", live chord positions and Enter continuing in a new verse"} passed`,
    );
  } catch (error) {
    await page.screenshot({
      path: `artifacts/sheet-native-failed-${engine.name()}-${mobile}.png`,
    });
    throw error;
  } finally {
    await browser.close();
  }
}
