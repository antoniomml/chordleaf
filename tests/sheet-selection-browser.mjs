import { chromium, firefox, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });

for (const engine of [chromium, firefox, webkit].filter(
  (engine) =>
    !process.env.CHORDLEAF_BROWSERS ||
    process.env.CHORDLEAF_BROWSERS.split(",").includes(engine.name()),
)) {
  const browser = await engine.launch();
  let page;
  try {
    page = await browser.newPage({
      locale: "es-ES",
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    });
    await page.addInitScript(() => {
      const describe = (node) => ({
        text: node?.textContent?.slice(0, 35),
        line: (node?.nodeType === 1 ? node : node?.parentElement)?.closest(
          ".song-line",
        )?.dataset.line,
      });
      const trace = (event) => {
        if (!window.__recordSheetSelection) return;
        window.__sheetSelectionEvents.push(event);
        if (window.__sheetSelectionEvents.length > 40)
          window.__sheetSelectionEvents.shift();
      };
      const original = Selection.prototype.setBaseAndExtent;
      Selection.prototype.setBaseAndExtent = function (a, ai, b, bi) {
        original.call(this, a, ai, b, bi);
        trace({
          type: "set",
          anchor: describe(a),
          ai,
          focus: describe(b),
          bi,
          actual: describe(this.focusNode),
          offset: this.focusOffset,
        });
      };
      for (const type of [
        "pointerdown",
        "pointermove",
        "pointerup",
        "selectionchange",
      ])
        document.addEventListener(
          type,
          (event) =>
            trace({
              type,
              x: event.clientX,
              y: event.clientY,
              hit: describe(
                document.elementFromPoint(
                  event.clientX ?? 0,
                  event.clientY ?? 0,
                ),
              ),
              focus: describe(getSelection().focusNode),
              offset: getSelection().focusOffset,
              active: document.activeElement?.className,
            }),
          true,
        );
    });
    await page.context().tracing.start({ screenshots: true, snapshots: true });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173/es/");
    await page.locator("#empty-new").click();
    await page.locator("#blank").click();
    await page.locator('.rail [data-desktop-view="edit"]').click();
    const source = page.locator("#source");
    const original =
      "[C]Primera línea\n[G]Segunda línea\n[Am]Tercera línea\n[F]Última línea";
    await source.fill(original);
    await page.locator("#align-chords").click();
    await page.evaluate(() => document.fonts.ready);
    const lyric = (index) =>
      page.locator(`.song-line[data-line="${index}"] .lyric`);
    // Expanded chord targets must never steal the lyric's upper half.
    assert.equal(
      await lyric(0).evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return (
          document
            .elementFromPoint(rect.left + 2, rect.top + rect.height * 0.25)
            ?.closest(".lyric") === el
        );
      }),
      true,
    );
    async function point(row, offset) {
      return row.evaluate((el, offset) => {
        const range = document.createRange();
        range.setStart(
          el.firstChild,
          Math.min(offset, el.textContent.length - 1),
        );
        range.setEnd(
          el.firstChild,
          Math.min(offset + 1, el.textContent.length),
        );
        const rect = range.getBoundingClientRect();
        return {
          x:
            rect.x +
            rect.width * (offset === el.textContent.length ? 0.95 : 0.25),
          y: rect.y + rect.height / 2,
        };
      }, offset);
    }
    async function select(a, ai, b, bi) {
      const start = await point(a, ai),
        end = await point(b, bi);
      await page.evaluate(() => {
        window.__sheetSelectionEvents = [];
        window.__recordSheetSelection = true;
      });
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 8 });
      await page.mouse.up();
      const selection = await page.evaluate(() => {
        const range = window.getSelection();
        const lyric = (node) =>
          node.parentElement.closest(".lyric")?.textContent;
        return {
          collapsed: range.isCollapsed,
          anchor: lyric(range.anchorNode),
          focus: lyric(range.focusNode),
        };
      });
      const events = await page.evaluate(() => {
        window.__recordSheetSelection = false;
        return window.__sheetSelectionEvents;
      });
      assert.deepEqual(
        selection,
        {
          collapsed: false,
          anchor: await a.textContent(),
          focus: await b.textContent(),
        },
        JSON.stringify({ start, end, selection, events }),
      );
    }
    // Whole verses, including their chords, disappear. Undo restores exact bytes.
    await select(lyric(0), 0, lyric(2), 0);
    await page.keyboard.press("Backspace");
    await expect(source).toHaveValue("[Am]Tercera línea\n[F]Última línea");
    await page.keyboard.press("ControlOrMeta+z");
    await expect(source).toHaveValue(original);

    // Extend from an active caret; keep unselected endpoint chords and lyrics.
    await lyric(0).click();
    await select(lyric(0), 8, lyric(2), 8);
    await page.keyboard.press("Delete");
    await expect(source).toHaveValue("[C]Primera línea\n[F]Última línea");
    await page.keyboard.press("ControlOrMeta+z");
    await expect(source).toHaveValue(original);
    // Reverse selection must have the same source boundaries.
    await select(lyric(2), 8, lyric(0), 8);
    await page.keyboard.press("Backspace");
    await expect(source).toHaveValue("[C]Primera línea\n[F]Última línea");
    await page.keyboard.press("ControlOrMeta+z");

    // Keyboard extension crosses separate verse fields and supports redo.
    const startOfVerse = await point(lyric(0), 0);
    await page.mouse.click(startOfVerse.x, startOfVerse.y);
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Delete");
    await expect(source).toHaveValue("[Am]Tercera línea\n[F]Última línea");
    await page.keyboard.press("ControlOrMeta+z");
    await expect(source).toHaveValue(original);
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect(source).toHaveValue("[Am]Tercera línea\n[F]Última línea");
    await page.keyboard.press("ControlOrMeta+z");

    // Typed replacement and persistence use the same selected range.
    await select(lyric(0), 0, lyric(2), 0);
    await page.keyboard.type("Nueva ");
    await page.keyboard.press("Enter");
    await expect(source).toHaveValue(
      "Nueva [Am]Tercera línea\n[F]Última línea",
    );
    await page.reload();
    await expect(source).toHaveValue(
      "Nueva [Am]Tercera línea\n[F]Última línea",
    );

    await page.locator('.rail [data-desktop-view="edit"]').click();
    // A visual wrap is part of the same source verse, never an extra newline.
    const long =
      "[C]" +
      Array.from(
        { length: 60 },
        (_, i) => `palabra${String(i).padStart(2, "0")}`,
      ).join(" ");
    await source.fill(long + "\n[G]Final");
    await page.locator("#align-chords").click();
    const rows = page.locator('.song-line[data-line="0"] .lyric');
    const continuation = await rows.nth(1).textContent();
    const word = continuation.trim().split(" ")[0];
    await select(rows.nth(0), 0, rows.nth(1), continuation.indexOf(word));
    await page.keyboard.press("Backspace");
    await expect(source).toHaveValue(
      long.slice(long.indexOf(word)) + "\n[G]Final",
    );
    // A draft insertion keeps the selection anchored to actual source offsets.
    await source.fill(original);
    const beginning = await point(lyric(0), 0);
    await page.mouse.click(beginning.x, beginning.y);
    await page.keyboard.insertText("Antes ");
    await select(lyric(0), 14, lyric(2), 8);
    await page.keyboard.press("Delete");
    await expect(source).toHaveValue("Antes [C]Primera línea\n[F]Última línea");

    // Native line breaks are committed before keyboard selection crosses rows.
    await source.fill("[C]Luz\n[G]Otra\n[Am]Final");
    const endOfVerse = await point(lyric(0), 3);
    await page.mouse.click(endOfVerse.x, endOfVerse.y);
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Delete");
    await expect(source).toHaveValue("[C]Luz\n[G]Otra\n[Am]Final");

    // Separate legacy chord rows are removed with their selected verse.
    await source.fill("[G]\nPrimer verso\n[C]Segundo verso\n[Am]Último");
    await select(lyric(0), 0, lyric(3), 0);
    await page.keyboard.press("Delete");
    await expect(source).toHaveValue("[Am]Último");
    await page.keyboard.press("ControlOrMeta+z");
    await expect(source).toHaveValue(
      "[G]\nPrimer verso\n[C]Segundo verso\n[Am]Último",
    );

    // Selection follows reading order across columns and pages.
    const paged = "[C]Inicio\n{column}\n[G]Medio\n{new_page}\n[Am]Final";
    await source.fill(paged);
    await page.locator('.rail [data-desktop-view="document"]').click();
    await page.locator('[data-columns="2"]').click();
    await page.locator('.song-line[data-line="0"] .lyric').click();
    await page.locator(".inline-lyric-editor").press("ControlOrMeta+ArrowLeft");
    const pageStart = await point(lyric(0), 0);
    await page.mouse.click(pageStart.x, pageStart.y);
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Backspace");
    await expect(source).toHaveValue("[Am]Final");
    await page.keyboard.press("ControlOrMeta+z");
    await expect(source).toHaveValue(paged);
    await page.keyboard.press("Shift+ArrowUp");
    await expect(page.locator(".inline-lyric-editor")).toBeFocused();

    assert.deepEqual(errors, []);
    console.log(
      `${engine.name()}: multi-verse selection, deletion, undo, replacement and wrapped source boundaries passed`,
    );
  } catch (error) {
    await page
      ?.context()
      .tracing.stop({ path: `artifacts/sheet-selection-${engine.name()}.zip` });
    throw error;
  } finally {
    await browser.close();
  }
}
