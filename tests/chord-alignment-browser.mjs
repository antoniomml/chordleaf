import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import axe from "axe-core";
import { mkdir } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch();
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      locale: "es-ES",
      bypassCSP: true,
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
      isMobile: mobile,
      hasTouch: mobile,
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
    const original =
      "[G]Una ca[G]sa [D/F#]azul\n[C]La luz de la mañana\n[C]\nUna canción";
    await source.fill(original);
    await page.locator("#align-chords").click();
    await page.locator('#alignment-chords [data-start="9"]').click();
    await page.locator('#alignment-letters [data-at="9"]').click();
    assert.equal(
      await source.inputValue(),
      "[G]Una casa [D/F#][G]azul\n[C]La luz de la mañana\n[C]\nUna canción",
    );
    await page.locator("#alignment-undo").click();
    assert.equal(await source.inputValue(), original);
    await page.locator("#alignment-handle").press("ArrowRight");
    assert.ok((await source.inputValue()).startsWith("[G]Una cas[G]a"));
    await page.locator("#alignment-undo").click();

    // Pointer capture keeps the dragged label attached, and updates source only on release.
    const handle = await page.locator("#alignment-handle").boundingBox();
    const target = await page
      .locator('#alignment-letters [data-at="4"]')
      .boundingBox();
    const x = handle.x + 8,
      y = handle.y + handle.height / 2;
    if (mobile) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: target.x + 8, y }],
      });
      assert.equal(await source.inputValue(), original);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await cdp.detach();
    } else {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(target.x + 8, y, { steps: 5 });
      assert.equal(await source.inputValue(), original);
      await page.mouse.up();
    }
    assert.ok((await source.inputValue()).startsWith("[G]Una [G]casa"));
    await page.locator("#alignment-undo").click();
    assert.equal(await source.inputValue(), original);
    await page.locator("#alignment-verse").selectOption("2");
    await page.locator('#alignment-letters [data-at="5"]').click();
    assert.ok((await source.inputValue()).endsWith("\n\nUna [C]canción"));
    await page.locator("#alignment-undo").click();
    assert.equal(await source.inputValue(), original);
    await page.locator("#alignment-verse").selectOption("1");
    await page.locator("#alignment-handle").press("ArrowRight");
    await page.locator("#alignment-handle").press("ArrowRight");
    await page.addScriptTag({ content: axe.source });
    const violations = await page.evaluate(() =>
      axe.run(document.querySelector("#alignment-dialog")),
    );
    assert.deepEqual(
      violations.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
      [],
    );
    await page.screenshot({
      path: `artifacts/chord-alignment-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page.locator("#alignment-close").click();
    assert.equal(await page.locator("#alignment-dialog").isVisible(), false);
    if (!mobile) {
      await page.locator("#pencil").click();
      await page.locator('.sheet-chord[data-chord="D/F#"]').click();
      assert.equal(await page.locator("#alignment-handle").innerText(), "D/F#");
      await page.locator("#alignment-handle").press("Home");
      await page.locator("#alignment-close").click();
      await page
        .locator(".song-line")
        .first()
        .click({ position: { x: 100, y: 30 } });
      assert.ok(await page.locator(".inline-editor").isVisible());
      await page.locator(".inline-editor").press("Escape");
    }
    const savedSource = await source.inputValue();
    await page.reload();
    assert.equal(await source.inputValue(), savedSource);
    await page
      .locator(`.rail [data-${mobile ? "mobile" : "desktop"}-view="edit"]`)
      .click();
    const long = "[C]" + "Una canción muy larga con café 👩‍🎤 y luz. ".repeat(8);
    await source.fill(long);
    // The alignment dialog can also open over the expanded text editor.
    await page.locator("#expand-editor").evaluate((button) => button.click());
    await page.locator("#align-chords").click();
    const longHandle = await page.locator("#alignment-handle").boundingBox();
    const bounds = await page.locator("#alignment-scroll").boundingBox();
    if (mobile) {
      const cdp = await page.context().newCDPSession(page);
      const point = { x: longHandle.x + 8, y: longHandle.y + 22 };
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [point],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: bounds.x + bounds.width - 12, y: point.y }],
      });
      await page.waitForFunction(
        () => document.querySelector("#alignment-scroll").scrollLeft > 100,
      );
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchCancel",
        touchPoints: [],
      });
      assert.equal(await source.inputValue(), long);
      await cdp.detach();
    }
    await page.locator("#alignment-handle").press("End");
    assert.equal(await source.inputValue(), long.slice(3) + "[C]");
    await page.locator("#alignment-undo").click();
    assert.equal(await source.inputValue(), long);
    await page.locator("#alignment-close").click();
    assert.equal(await page.locator("#editor-dialog").isVisible(), true);
    await page.locator("#collapse-editor").click();
    assert.deepEqual(errors, []);
    await page.close();
  }
  const english = await browser.newPage({ locale: "en-US" });
  await english.goto(process.env.CHORDLEAF_URL || "http://localhost:5173/en/");
  await english.locator("#example-song").click();
  await english.locator('.rail [data-desktop-view="edit"]').click();
  await english.locator("#align-chords").click();
  assert.equal(
    await english.locator("#alignment-title").innerText(),
    "Align chords",
  );
  assert.equal(await english.locator("#alignment-close").innerText(), "Done");
  assert.equal(await english.locator("#alignment-undo").innerText(), "Undo");
  assert.ok(
    (await english.locator("#alignment-status").innerText()).startsWith(
      "Position ",
    ),
  );
  await english.close();
  console.log(
    "Chord alignment: desktop and touch drag, tap, keyboard, undo, repeated chords, exact source, standalone chord rows, persistence, bilingual UI and accessibility passed.",
  );
} finally {
  await browser.close();
}
