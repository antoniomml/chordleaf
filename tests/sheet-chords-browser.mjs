import { chromium, webkit, firefox, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import axe from "axe-core";

await mkdir("artifacts", { recursive: true });
for (const [engine, mobile] of [
  [chromium, false],
  [webkit, false],
  [firefox, false],
  [chromium, true],
  [webkit, true],
].filter(
  ([engine]) =>
    !process.env.CHORDLEAF_BROWSERS ||
    process.env.CHORDLEAF_BROWSERS.split(",").includes(engine.name()),
)) {
  const browser = await engine.launch();
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 },
    isMobile: mobile && engine !== firefox,
    hasTouch: mobile,
    bypassCSP: true,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text) => {
            window.__chordClipboard = text;
          },
          readText: async () => window.__chordClipboard ?? "",
        },
      });
    });
    await page.goto(process.env.CHORDLEAF_URL || "http://127.0.0.1:5173/es/");
    await page.locator("#empty-new").click();
    await page.locator("#blank").click();
    await page
      .locator(`.rail [data-${mobile ? "mobile" : "desktop"}-view="edit"]`)
      .click();
    const source = page.locator("#source");
    const original =
      "[G]Vuelvo a mirar [D]el mar\n[Em]queda [C]luz\n\nHoy te vi llegar aquí\nOtra letra\nSin acordes";
    await source.fill(original);
    await page.locator("#align-chords").click();
    const row = (index) =>
      page.locator(`.song-line[data-line="${index}"]`).first();
    await row(0).locator(".sheet-chord-handle").click();
    await row(1)
      .locator(".sheet-chord-handle")
      .click({ modifiers: ["Shift"] });
    await expect(page.locator(".chord-row-selected")).toHaveCount(2);
    if (!mobile) {
      const first = await row(0).locator(".sheet-chord-lane").boundingBox();
      const last = await row(1).locator(".sheet-chord-lane").boundingBox();
      await page.mouse.move(first.x + 60, first.y + 5);
      await page.mouse.down();
      await page.mouse.move(last.x + 60, last.y + 5, { steps: 8 });
      await page.mouse.up();
      await expect(page.locator(".chord-row-selected")).toHaveCount(2);
    }
    await page.locator('[data-chord-action="copy"]').click();
    const packet = await page.evaluate(() => {
      const data = new DataTransfer(),
        event = new Event("copy", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: data });
      document.querySelector("#pages-scroll").dispatchEvent(event);
      return {
        json: data.getData("application/x-chordleaf-chords+json"),
        text: data.getData("text/plain"),
      };
    });
    assert.equal(JSON.parse(packet.json).rows.length, 2);
    assert.ok(!packet.text.includes("Vuelvo"));
    await row(3).locator(".sheet-chord-handle").click();
    await row(3)
      .locator(".sheet-chord-lane")
      .click({ position: { x: 1, y: 5 } });
    await expect(page.locator(".sheet-new-chord-editor")).toBeVisible();
    await page.locator(".sheet-new-chord-editor").evaluate((el, packet) => {
      const data = new DataTransfer();
      data.setData("application/x-chordleaf-chords+json", packet.json);
      data.setData("text/plain", packet.text);
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: data });
      el.dispatchEvent(event);
    }, packet);
    const pasted =
      "[G]Vuelvo a mirar [D]el mar\n[Em]queda [C]luz\n\n[G]Hoy te vi llega[D]r aquí\n[Em]Otra l[C]etra\nSin acordes";
    await expect(source).toHaveValue(pasted);
    await row(3).locator(".sheet-chord-handle").click();
    await row(4)
      .locator(".sheet-chord-handle")
      .click({ modifiers: ["Shift"] });
    await page.locator('[data-chord-action="delete"]').click();
    await expect(source).toHaveValue(original);
    await page.locator("#pages-scroll").press("ControlOrMeta+z");
    await expect(source).toHaveValue(pasted);
    await page.locator("#pages-scroll").press("ControlOrMeta+z");
    await expect(source).toHaveValue(original);
    await page.locator("#pages-scroll").press("ControlOrMeta+Shift+z");
    await expect(source).toHaveValue(pasted);

    await row(5).locator(".sheet-chord-handle").click();
    const lane = row(5).locator(".sheet-chord-lane");
    const bounds = await lane.boundingBox();
    const cw = await row(5).evaluate(
      (el) =>
        (parseFloat(getComputedStyle(el).fontSize) *
          0.6 *
          el.getBoundingClientRect().width) /
        parseFloat(el.style.width),
    );
    await lane.click({ position: { x: cw * 4.4, y: bounds.height / 2 } });
    const field = page.locator(".sheet-new-chord-editor");
    await field.fill("Am7");
    await field.press("Enter");
    const added = pasted.replace("Sin acordes", "Sin [Am7]acordes");
    await expect(source).toHaveValue(added);
    await page.keyboard.press("ControlOrMeta+z");
    await expect(source).toHaveValue(pasted);
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect(source).toHaveValue(added);
    await row(5).locator('[data-chord="Am7"]').click();
    await row(5).locator('[data-chord="Am7"]').press("ArrowRight");
    await expect(source).toHaveValue(
      added.replace("Sin [Am7]acordes", "Sin a[Am7]cordes"),
    );
    await page.locator("#sheet-alignment-undo").click();
    await expect(source).toHaveValue(added);

    await row(4)
      .locator(".sheet-chord-lane")
      .click({ position: { x: cw * 4.4, y: 5 } });
    await field.fill("no es acorde");
    await field.press("Enter");
    await expect(field).toBeVisible();
    await field.press("Escape");
    await expect(source).toHaveValue(added);
    await page.addScriptTag({ content: axe.source });
    const audit = await page.evaluate(() =>
      axe.run(document.querySelector("#pages")),
    );
    assert.deepEqual(
      audit.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map(({ target }) => target),
      })),
      [],
    );
    await page.screenshot({
      path: `artifacts/sheet-chords-${engine.name()}-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page.waitForFunction(
      (value) =>
        JSON.parse(localStorage.getItem("chordleaf-v1")).songs.some(
          (song) => song.text === value,
        ),
      added,
    );
    await page.reload();
    await expect(source).toHaveValue(added);
    if (!mobile) {
      const lyric = "Una letra larga para copiar los acordes. ".repeat(16);
      await page.locator('.rail [data-desktop-view="edit"]').click();
      await source.fill(`[Cmaj7]${lyric}[G]Final\nDestino`);
      await page.locator("#align-chords").click();
      assert.ok((await page.locator('.song-line[data-line="0"]').count()) > 1);
      await row(0).locator(".sheet-chord-handle").click();
      await page.locator('[data-chord-action="copy"]').click();
      await row(1).locator(".sheet-chord-handle").click();
      await row(1)
        .locator(".sheet-chord-lane")
        .click({ position: { x: 1, y: 5 } });
      await page.locator('[data-chord-action="paste"]').click();
      await expect(source).toHaveValue(
        `[Cmaj7]${lyric}[G]Final\n[Cmaj7]Destino${" ".repeat(lyric.length - 7)}[G]`,
      );
      await page.emulateMedia({ media: "print" });
      assert.ok(await page.locator(".sheet-chord-handle").first().isHidden());
    }
    assert.deepEqual(errors, []);
    console.log(
      `${engine.name()} ${mobile ? "mobile" : "desktop"}: chord rows copy/paste, inline insertion, shared undo/redo, validation, accessibility and persistence passed`,
    );
  } catch (error) {
    await page.screenshot({
      path: `artifacts/sheet-chords-failed-${engine.name()}-${mobile}.png`,
    });
    throw error;
  } finally {
    await browser.close();
  }
}
