import { chromium, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";

async function caret(editor, offset = 0) {
  await editor.evaluate((el, offset) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (offset <= node.length) {
        range.setStart(node, offset);
        range.collapse(true);
        break;
      }
      offset -= node.length;
    }
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, offset);
}

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      locale: "es-ES",
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173/es/");
    await page.locator("#empty-new").click();
    await page.locator("#blank").click();
    await page.locator('.rail [data-desktop-view="edit"]').click();
    const source = page.locator("#source"),
      editor = page.locator(".inline-lyric-editor"),
      row = (index) => page.locator(`.song-line[data-line="${index}"]`).first();
    const original = "[C]Una casa\n[Am]Otro verso\nFinal";
    await source.fill(original);
    await page.locator("#align-chords").click();

    // Enter followed by Backspace removes the new empty verse and keeps typing
    // at the previous verse's end. The structural change supports undo/redo.
    await row(0).locator(".lyric").click();
    await caret(editor, 8);
    await editor.press("Enter");
    const withBlank = "[C]Una casa\n\n[Am]Otro verso\nFinal";
    await expect(source).toHaveValue(withBlank);
    await expect(row(1).locator(".inline-lyric-editor")).toBeFocused();
    await editor.press("Backspace");
    await expect(source).toHaveValue(original);
    await expect(row(0).locator(".inline-lyric-editor")).toBeFocused();
    await editor.press("ControlOrMeta+z");
    await expect(source).toHaveValue(withBlank);
    await editor.press("ControlOrMeta+Shift+z");
    await expect(source).toHaveValue(original);
    await editor.pressSequentially("!");
    await editor.press("ControlOrMeta+Enter");
    await expect(source).toHaveValue(original.replace("casa", "casa!"));

    // Joining populated verses preserves both sets of chord tokens. Typing at
    // the join moves the second verse's chords with its lyrics.
    await source.fill(original);
    await row(1).locator(".lyric").click();
    await caret(editor);
    await editor.press("Backspace");
    await expect(source).toHaveValue("[C]Una casa[Am]Otro verso\nFinal");
    await expect(row(0).locator(".inline-lyric-editor")).toBeFocused();
    await editor.press("Space");
    await editor.press("ControlOrMeta+Enter");
    await expect(source).toHaveValue("[C]Una casa [Am]Otro verso\nFinal");

    // A cleared verse retaining one chord must not absorb the following plain
    // verse as a legacy chord/lyric pair before the second Backspace.
    await source.fill(original);
    await row(1).locator(".lyric").click();
    await editor.press("ControlOrMeta+a");
    await editor.press("Backspace");
    await editor.press("Backspace");
    await expect(source).toHaveValue("[C]Una casa[Am]\nFinal");
    await expect(row(0).locator(".inline-lyric-editor")).toBeFocused();
    await editor.press("ControlOrMeta+Enter");

    await source.fill("[D]\nAntes\n[G]\nDespués\n[C]\nFinal");
    await row(2).locator(".lyric").click();
    await caret(editor);
    await editor.press("Backspace");
    await expect(source).toHaveValue("[D]Antes[G]Después\n[C]\nFinal");
    await editor.press("ControlOrMeta+Enter");

    // At the first visual cell of a wrapped verse, delete a source character
    // rather than merging an unrelated verse or swallowing a chord.
    const lyric = Array.from({ length: 40 }, (_, n) => `palabra${n}`).join(" ");
    await source.fill("[C]" + lyric);
    const continuation = page.locator('.song-line[data-line="0"]').nth(1);
    const firstWord = (await continuation.locator(".lyric").innerText())
      .trim()
      .split(" ")[0];
    const at = lyric.indexOf(firstWord);
    assert.ok(at > 0);
    await continuation.locator(".lyric").click();
    await caret(editor);
    await editor.press("Backspace");
    const joined = lyric.slice(0, at - 1) + lyric.slice(at);
    await expect(source).toHaveValue("[C]" + joined);
    await editor.pressSequentially("|");
    await editor.press("ControlOrMeta+Enter");
    await expect(source).toHaveValue(
      "[C]" + lyric.slice(0, at - 1) + "|" + lyric.slice(at),
    );

    // The document's initial boundary is a no-op; ordinary native deletion
    // inside a verse continues to work.
    await source.fill(original);
    await row(0).locator(".lyric").click();
    await caret(editor);
    await editor.press("Backspace");
    await expect(editor).toBeFocused();
    await caret(editor, 8);
    await editor.press("Backspace");
    await editor.press("ControlOrMeta+Enter");
    await expect(source).toHaveValue(original.replace("casa", "cas"));
    assert.deepEqual(errors, []);
    console.log(
      `${engine.name()}: Backspace removes empty verses, joins lyrics with chords, preserves legacy pairs, handles wrapping and supports undo/redo`,
    );
  } finally {
    await browser.close();
  }
}
