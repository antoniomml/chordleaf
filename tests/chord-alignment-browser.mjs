import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import axe from "axe-core";
import { mkdir, readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch();
async function letterBox(row, offset) {
  return row.locator(".lyric").evaluate((lyric, offset) => {
    const range = document.createRange();
    range.setStart(lyric.firstChild, offset);
    range.setEnd(lyric.firstChild, offset + 1);
    const r = range.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, offset);
}
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
      "[E]antes [Em]antes [Em7]antes\n[G]Una ca[G]sa [D/F#]azul\n[C]\nUna canción";
    await source.fill(original);
    await page.locator("#align-chords").click();
    assert.equal(await page.locator("dialog[open]").count(), 0);
    assert.equal(
      await page.locator("#sheet-alignment-tools").isVisible(),
      false,
    );
    const row = page.locator('.song-line[data-line="0"]');
    const lyric = await row.locator(".lyric").innerText();
    for (const [chord, nth, offset] of [
      ["E", 0, 0],
      ["Em", 1, 0],
      ["Em7", 2, 1],
    ]) {
      const aIndex = [...lyric.matchAll(/antes/g)][nth].index;
      const a = await letterBox(row, aIndex);
      const label = await row.locator(`[data-chord="${chord}"]`).boundingBox();
      const cw = label.width / chord.length;
      assert.ok(
        Math.abs(label.x + (offset + 0.5) * cw - (a.x + a.width / 2)) < 1.2,
        `${chord} anchors its reference letter on A`,
      );
    }
    if (!mobile) {
      await page.locator("#export").click();
      let downloaded = page.waitForEvent("download");
      await page.locator('[data-export="pdf"]').click();
      const pdfPath = "artifacts/inline-centred.pdf";
      await (await downloaded).saveAs(pdfPath);
      const loading = getDocument({
        data: new Uint8Array(await readFile(pdfPath)),
        useSystemFonts: true,
      });
      const doc = await loading.promise;
      const items = (await (await doc.getPage(1)).getTextContent()).items;
      const lyricItem = items.find((item) => item.str === "antes antes antes");
      assert.ok(lyricItem);
      const lyricCell = lyricItem.width / lyricItem.str.length;
      const tokens = items
        .filter(
          (item) =>
            item.transform[5] > lyricItem.transform[5] &&
            item.str
              .trim()
              .split(/\s+/)
              .every((token) => ["E", "Em", "Em7"].includes(token)),
        )
        .flatMap((item) =>
          [...item.str.matchAll(/\S+/g)].map((match) => ({
            label: match[0],
            x: item.transform[4] + (match.index * item.width) / item.str.length,
            cw: item.width / item.str.length,
          })),
        );
      assert.equal(tokens.length, 3);
      for (const [i, token] of tokens.entries()) {
        const reference =
          token.x + (Math.floor((token.label.length - 1) / 2) + 0.5) * token.cw;
        const a = lyricItem.transform[4] + (i * 6 + 0.5) * lyricCell;
        assert.ok(
          Math.abs(reference - a) < 0.2,
          "PDF uses the same reference letter as the sheet",
        );
      }
      await loading.destroy();
      await page.locator("#export").click();
      downloaded = page.waitForEvent("download");
      await page.locator('[data-export="docx"]').click();
      const wordPath = "artifacts/inline-centred.docx";
      await (await downloaded).saveAs(wordPath);
      const word = (
        await mammoth.extractRawText({ path: wordPath })
      ).value.split("\n");
      const chords = word.find((line) => /^E +Em +Em7$/.test(line));
      assert.ok(chords);
      assert.equal(chords.indexOf("E"), 0);
      assert.equal(chords.indexOf("Em"), 6);
      assert.equal(chords.indexOf("Em7") + 1, 12);
    }
    const label = row.locator('[data-chord="Em7"]');
    const beforeSelection = await row.boundingBox();
    await label.click();
    assert.equal(await page.locator("#sheet-alignment-tools p").count(), 0);
    const controls = await page.locator("#sheet-alignment-tools").boundingBox();
    assert.ok(controls.height <= 56, "context controls fit on one row");
    assert.ok(controls.width <= (mobile ? 390 : 1440) - 24);
    assert.deepEqual(await row.boundingBox(), beforeSelection);
    assert.equal(
      await label.evaluate((el) => getComputedStyle(el).outlineStyle),
      "none",
      "pointer selection does not frame the chord",
    );
    const bounds = await label.boundingBox();
    const nIndex = lyric.lastIndexOf("antes") + 1;
    const n = await letterBox(row, nIndex);
    const start = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
    const end = { x: n.x + n.width / 2, y: n.y + n.height / 2 };
    const cdp = mobile ? await page.context().newCDPSession(page) : null;
    if (mobile) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [start],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [end],
      });
    } else {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 5 });
    }
    assert.equal(await source.inputValue(), original);
    await page.locator(".sheet-alignment-target").waitFor();
    assert.equal(
      await page.locator("#sheet-alignment-selection").innerText(),
      "Em7",
    );
    if (mobile)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    else await page.mouse.up();
    assert.ok(
      (await source.inputValue()).startsWith("[E]antes [Em]antes a[Em7]ntes"),
    );
    await page.locator("#sheet-alignment-undo").click();
    assert.equal(await source.inputValue(), original);

    await label.click();
    const t = await letterBox(row, nIndex + 1);
    await page.evaluate(() => {
      document.addEventListener(
        "click",
        (event) => {
          window.alignmentTap = {
            target: event.target.outerHTML,
            x: event.clientX,
            y: event.clientY,
          };
        },
        { once: true, capture: true },
      );
    });
    if (mobile)
      await page.touchscreen.tap(t.x + t.width / 2, t.y + t.height / 2);
    else await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2);
    const afterTap = await source.inputValue();
    if (!afterTap.startsWith("[E]antes [Em]antes an[Em7]tes")) {
      await page.screenshot({
        path: `artifacts/alignment-tap-${mobile ? "mobile" : "desktop"}.png`,
      });
      console.log("Alignment tap diagnostic", {
        mobile,
        t,
        afterTap,
        event: await page.evaluate(() => window.alignmentTap),
      });
    }
    assert.equal(
      afterTap.split("\n")[0],
      "[E]antes [Em]antes an[Em7]tes",
      `tap placement (${mobile ? "mobile" : "desktop"})`,
    );
    await page.locator("#sheet-alignment-undo").click();
    await label.press("ArrowRight");
    assert.ok(
      (await source.inputValue()).startsWith("[E]antes [Em]antes a[Em7]ntes"),
    );
    await label.press("Escape");
    assert.equal(
      await page.locator("#sheet-alignment-left").isVisible(),
      false,
    );
    assert.equal(await page.locator("#sheet-alignment-undo").isVisible(), true);
    await page.locator("#sheet-alignment-undo").click();
    assert.equal(await source.inputValue(), original);

    // A cancelled touch drag preserves source; a second occurrence stays distinct.
    if (mobile) {
      const b = await label.boundingBox();
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [end],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchCancel",
        touchPoints: [],
      });
      assert.equal(await source.inputValue(), original);
      await cdp.detach();
    }
    await page
      .locator('.song-line[data-line="1"] [data-chord="G"]')
      .nth(1)
      .click();
    await page.locator("#sheet-alignment-right").click();
    assert.ok((await source.inputValue()).includes("[G]Una cas[G]a"));
    await page.locator("#sheet-alignment-undo").click();
    assert.equal(await source.inputValue(), original);
    await page.locator('.song-line[data-line="2"] [data-chord="C"]').click();
    await page.locator("#sheet-alignment-right").click();
    assert.ok((await source.inputValue()).endsWith("\n\n[C]Una canción"));
    assert.equal(
      await page.locator("#sheet-alignment-selection").innerText(),
      "C",
    );
    await page.locator("#sheet-alignment-undo").click();
    assert.equal(await source.inputValue(), original);

    await label.click();
    await page.addScriptTag({ content: axe.source });
    const violations = await page.evaluate(() =>
      axe.run(document.querySelector("#preview-panel")),
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
    await page.locator("#sheet-alignment-edit").click();
    assert.equal(
      await page.locator(".inline-editor").inputValue(),
      original.split("\n")[0],
    );
    assert.equal(
      await page
        .locator(".inline-editor")
        .evaluate((el) => getComputedStyle(el).outlineStyle),
      "none",
      "editing a verse does not add a green focus frame",
    );
    await page.locator(".inline-editor").press("Escape");
    assert.equal(
      await page.locator("#sheet-alignment-tools").isVisible(),
      false,
    );
    await page.locator("#pencil").click();
    assert.equal(
      await page.locator("#sheet-alignment-tools").isVisible(),
      false,
    );
    await page
      .locator(`.rail [data-${mobile ? "mobile" : "desktop"}-view="edit"]`)
      .click();
    const plain = Array.from(
      { length: 35 },
      (_, i) => `palabra${String(i).padStart(2, "0")}`,
    ).join(" ");
    const long = "[Em7]" + plain;
    await source.fill(long);
    const beforeZoom = (await page.locator(".page-shell").first().boundingBox())
      ?.width;
    await page.locator("#align-chords").click();
    const wraps = page.locator('.song-line[data-line="0"]');
    assert.ok((await wraps.count()) > 1);
    const nextRow = wraps.nth(1);
    const nextLyric = await nextRow.locator(".lyric").innerText();
    const word = nextLyric.trim().split(/\s+/)[0];
    const destination = await letterBox(nextRow, nextLyric.indexOf(word));
    const first = await wraps
      .first()
      .locator('[data-chord="Em7"]')
      .boundingBox();
    const from = {
      x: first.x + first.width / 2,
      y: first.y + first.height / 2,
    };
    const to = {
      x: destination.x + destination.width / 2,
      y: destination.y + destination.height / 2,
    };
    if (mobile) {
      assert.ok(
        destination.width >= 8,
        "phone alignment zoom keeps characters readable",
      );
      const touch = await page.context().newCDPSession(page);
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [from],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [to],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await touch.detach();
    } else {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 5 });
      await page.mouse.up();
    }
    const at = plain.indexOf(word);
    assert.equal(
      await source.inputValue(),
      plain.slice(0, at) + "[Em7]" + plain.slice(at),
    );
    await page.locator("#sheet-alignment-undo").click();
    assert.equal(await source.inputValue(), long);
    await page.locator("#sheet-alignment-done").click();
    if (mobile && beforeZoom)
      assert.ok(
        Math.abs(
          (await page.locator(".page-shell").first().boundingBox()).width -
            beforeZoom,
        ) < 1,
      );
    const saved = await source.inputValue();
    await page.reload();
    assert.equal(await source.inputValue(), saved);
    assert.deepEqual(errors, []);
    await page.close();
  }
  const english = await browser.newPage({ locale: "en-US" });
  await english.goto(process.env.CHORDLEAF_URL || "http://localhost:5173/en/");
  await english.locator("#example-song").click();
  await english.locator("#pencil").click();
  const title = english.locator('[data-header="title"]');
  const artist = english.locator('[data-header="artist"]');
  for (const field of [title, artist]) {
    await field.click();
    assert.equal(
      await field.evaluate((el) => getComputedStyle(el).outlineStyle),
      "none",
      "sheet header focus uses an underline instead of a frame",
    );
  }
  await title.fill("Edited on the sheet");
  await artist.click();
  assert.equal(
    await english.locator("#title").inputValue(),
    "Edited on the sheet",
  );
  const keyboardLyric = english.locator(".lyric[tabindex]").first();
  await keyboardLyric.focus();
  await english.keyboard.press("Shift+Tab");
  await english.keyboard.press("Tab");
  assert.equal(
    await keyboardLyric.evaluate((el) => el === document.activeElement),
    true,
  );
  assert.notEqual(
    await keyboardLyric.evaluate((el) => getComputedStyle(el).boxShadow),
    "none",
    "keyboard focus remains visible on lyrics",
  );
  await keyboardLyric.press("Enter");
  await english.locator(".inline-editor").press("Escape");
  assert.equal(
    await english.locator("#sheet-alignment-tools").isVisible(),
    false,
  );
  await english.locator(".alignable-chord").first().click();
  assert.equal(
    await english.locator("#sheet-alignment-done").getAttribute("aria-label"),
    "Done",
  );
  assert.equal(
    await english
      .locator(".sheet-alignment-controls")
      .getAttribute("aria-label"),
    "Chord controls",
  );
  await english.close();
  console.log(
    "Inline alignment: E/Em/Em7 reference letters, mouse/touch drag, tap, keyboard, cancel, undo, repeated chords, chord-only row migration, persistence and accessible bilingual sheet controls passed.",
  );
} finally {
  await browser.close();
}
