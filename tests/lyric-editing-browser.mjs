import { chromium, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import axe from "axe-core";

await mkdir("artifacts", { recursive: true });
for (const [engine, mobile] of [
  [chromium, false],
  [chromium, true],
  [webkit, true],
]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      locale: "es-ES",
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
      isMobile: mobile,
      hasTouch: mobile,
      bypassCSP: true,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173/es/");
    await page.locator("#empty-new").click();
    await page.locator("#blank").click();
    await page
      .locator(`.rail [data-${mobile ? "mobile" : "desktop"}-view="edit"]`)
      .click();
    const source = page.locator("#source");
    await source.fill("[Cmaj7]Una [Em7]casa\n[G]\nUna canción\n[C] – [G]");
    await page.locator("#align-chords").click();
    const first = page.locator('.song-line[data-line="0"]');
    await first.locator(".lyric").first().click();
    const lyrics = page.locator(".inline-editor");
    await expect(lyrics).toHaveValue("Una casa");
    await lyrics.press("Home");
    await lyrics.pressSequentially("En ");
    if (mobile) await page.locator("#sheet-edit-done").click();
    else await lyrics.press("Enter");
    await expect(source).toHaveValue(
      "En [Cmaj7]Una [Em7]casa\n[G]\nUna canción\n[C] – [G]",
    );
    await first.locator(".lyric").first().click();
    await lyrics.press("Home");
    await lyrics.press("Delete");
    await lyrics.press("Delete");
    await lyrics.press("Delete");
    if (mobile) await page.locator("#sheet-edit-done").click();
    else await lyrics.press("Enter");
    await expect(source).toHaveValue(
      "[Cmaj7]Una [Em7]casa\n[G]\nUna canción\n[C] – [G]",
    );

    // Renaming one chord does not change its anchor, the lyrics or other tokens.
    await first.locator('[data-chord="Em7"]').click();
    await page.locator("#sheet-alignment-selection").click();
    const chord = page.locator(".inline-chord-editor");
    await expect(chord).toHaveValue("Em7");
    await chord.press("ArrowLeft");
    await expect(chord).toBeFocused();
    await chord.fill("Am7");
    await chord.press("Enter");
    await expect(source).toHaveValue(
      "[Cmaj7]Una [Am7]casa\n[G]\nUna canción\n[C] – [G]",
    );
    await first.locator('[data-chord="Am7"]').dblclick();
    await chord.fill("no es acorde");
    await chord.press("Enter");
    await expect(chord).toBeVisible();
    await chord.press("Escape");
    await expect(source).toHaveValue(
      "[Cmaj7]Una [Am7]casa\n[G]\nUna canción\n[C] – [G]",
    );

    // Legacy separate chord rows remain byte-for-byte separate when editing lyrics.
    await page.locator('.song-line[data-line="1"] .lyric').click();
    await expect(lyrics).toHaveValue("Una canción");
    await lyrics.fill("Otra canción");
    if (mobile) await page.locator("#sheet-edit-done").click();
    else await lyrics.press("Enter");
    await expect(source).toHaveValue(
      "[Cmaj7]Una [Am7]casa\n[G]\nOtra canción\n[C] – [G]",
    );
    await page.locator('.song-line[data-line="3"] [data-chord="C"]').click();
    await expect(chord).toHaveValue("C");
    await chord.fill("D");
    await chord.press("Enter");
    await expect(source).toHaveValue(
      "[Cmaj7]Una [Am7]casa\n[G]\nOtra canción\n[D] – [G]",
    );
    await page.screenshot({
      path: `artifacts/lyric-editing-${engine.name()}-${mobile ? "mobile" : "desktop"}.png`,
    });
    if (mobile) {
      await page.locator('.rail [data-mobile-view="edit"]').click();
      const long = `[C]${"Una letra inventada y larga para comprobar el ajuste. ".repeat(18)}[G]Final\n[Am]Otra línea`;
      await source.fill(long);
      await page.locator("#align-chords").click();
      await first.locator(".lyric").first().click();
      await expect(page.locator("#sheet-edit-dialog")).toBeVisible();
      const rect = await lyrics.boundingBox();
      assert.ok(rect.x >= 12 && rect.x + rect.width <= 378);
      assert.equal(
        await lyrics.evaluate((el) => getComputedStyle(el).fontSize),
        "16px",
      );
      await page.addScriptTag({ content: axe.source });
      const audit = await page.evaluate(() =>
        axe.run(document.querySelector("#sheet-edit-dialog")),
      );
      assert.deepEqual(
        audit.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map(({ target }) => target),
        })),
        [],
      );
      await page.screenshot({
        path: `artifacts/sheet-edit-dialog-${engine.name()}.png`,
      });
      await lyrics.press("End");
      await lyrics.press("Enter");
      await lyrics.pressSequentially("Otra estrofa");
      assert.match(await lyrics.inputValue(), /\nOtra estrofa/);
      await page.locator("#sheet-edit-cancel").click();
      await expect(source).toHaveValue(long);
      await expect(page.locator("#sheet-edit-dialog")).not.toBeVisible();
      await first.locator(".lyric").first().click();
      await lyrics.press("Home");
      await lyrics.pressSequentially("Inicio ");
      await page.locator("#sheet-edit-done").click();
      const saved = await source.inputValue();
      assert.equal((saved.match(/\[C\]/g) || []).length, 1);
      assert.equal((saved.match(/\[G\]/g) || []).length, 1);
      assert.equal((saved.match(/\[Am\]/g) || []).length, 1);
      await page.reload();
      await expect(source).toHaveValue(saved);
    }
    if (!mobile) {
      await page.locator("#pencil").click();
      await first.locator('[data-chord="Cmaj7"]').hover();
      await expect(page.locator("#chord-tooltip")).toBeVisible();
      await expect(page.locator("#chord-tooltip circle")).toHaveCount(2);
      await source.fill("[Em7]Una canción");
      await first.locator('[data-chord="Em7"]').hover();
      await expect(page.locator("#chord-tooltip circle")).toHaveCount(4);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}
console.log(
  "Lyrics-only editing preserves chord anchors; chord renaming, legacy rows and familiar hover diagrams work on desktop and mobile, including WebKit.",
);
