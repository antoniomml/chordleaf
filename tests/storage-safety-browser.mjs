import { chromium, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createSong } from "../src/song-state.js";

const base = process.env.CHORDLEAF_URL || "http://localhost:5173";
const url = new URL("/es/", base).href;
const stored = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("chordleaf-v1")));
const plain = (text) => text.replace(/\[[^\]]+\]/g, "");

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({
      locale: "es-ES",
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    await page.locator("#empty-new").click();
    await page.locator("#blank").click();
    await page.locator("#title").fill("Título inicial");
    await page.locator("#artist").fill("Artista inicial");
    await page.locator('.rail [data-desktop-view="edit"]').click();
    await page.locator("#source").fill("[C]Texto original [G]del verso");
    await page.locator("#align-chords").click();
    await page.locator(".song-line .lyric").first().click();
    await page.locator(".inline-editor").fill("Texto cambiado del verso");
    await page.keyboard.press("Control+s");
    assert.equal(
      plain((await stored(page)).songs[0].text),
      "Texto cambiado del verso",
    );
    await expect(page.locator(".inline-editor")).toBeFocused();
    const projectReady = page.waitForEvent("download");
    await page.keyboard.press("Control+Shift+s");
    const project = JSON.parse(
      await readFile(await (await projectReady).path(), "utf8"),
    );
    assert.equal(plain(project.song.text), "Texto cambiado del verso");

    // Background autosave must not close a field; Escape reverses even saved drafts.
    await page.locator(".song-line .lyric").first().click();
    await page.locator(".inline-editor").fill("Borrador cancelado");
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("chordleaf-v1")).songs[0].text.replace(
          /\[[^\]]+\]/g,
          "",
        ) === "Borrador cancelado",
    );
    await expect(page.locator(".inline-editor")).toBeFocused();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+s");
    assert.equal(
      plain((await stored(page)).songs[0].text),
      "Texto cambiado del verso",
    );

    for (const [field, value] of [
      ["title", "Título pendiente"],
      ["artist", "Artista pendiente"],
    ]) {
      await page.locator(`[data-header="${field}"]`).fill(value);
      await page.keyboard.press("Control+s");
      assert.equal((await stored(page)).songs[0][field], value);
      await page.keyboard.press("Enter");
    }
    await page.locator(".sheet-chord[data-chord]").first().dblclick();
    await page.locator(".inline-chord-editor").fill("Dm7");
    await page.keyboard.press("Meta+s");
    assert.ok((await stored(page)).songs[0].text.includes("[Dm7]"));
    await page.keyboard.press("Enter");
    await page.locator('.sheet-chord[data-chord="Dm7"]').first().dblclick();
    await page.locator(".inline-chord-editor").fill("no es acorde");
    await page.keyboard.press("Control+s");
    await expect(page.locator("#save-state.error")).toContainText(
      "acorde válido",
    );
    await expect(page.locator(".inline-chord-editor")).toBeFocused();
    await page.keyboard.press("Escape");
    await page.reload();
    assert.ok((await page.locator("#source").inputValue()).includes("[Dm7]"));
    assert.equal(await page.locator("#title").inputValue(), "Título pendiente");
    assert.equal(
      await page.locator("#artist").inputValue(),
      "Artista pendiente",
    );

    // Reload and handoff capture pending lyrics even before the debounce fires.
    await page.locator("#pencil").click();
    await page.locator(".song-line .lyric").first().click();
    await page.locator(".inline-editor").fill("Edición antes de recargar");
    await page.reload();
    assert.equal(
      plain(await page.locator("#source").inputValue()),
      "Edición antes de recargar",
    );
    await page.locator("#pencil").click();
    await page.locator(".song-line .lyric").first().click();
    await page.locator(".inline-editor").fill("Edición antes de ceder");
    const other = await context.newPage();
    other.goto(url).catch(() => {});
    await other.locator(".workspace-locked button").click();
    await other.locator("#source").waitFor({ state: "attached" });
    assert.equal(
      plain(await other.locator("#source").inputValue()),
      "Edición antes de ceder",
    );
    for (const selector of [
      "#transpose-up",
      "#transpose-down",
      "#capo-up",
      "#capo-down",
      "#link",
      '[data-columns="2"]',
      '[data-notation="latin"]',
    ]) {
      await other.locator(selector).focus();
      await other.keyboard.press("Enter");
      await expect(other.locator(selector)).toBeFocused();
    }
    await context.close();
    console.log(
      `${engine.name()}: active drafts, cancellation, reload, handoff and keyboard focus passed`,
    );

    const library = await browser.newContext({
      locale: "es-ES",
      serviceWorkers: "block",
    });
    const closed = await library.newPage();
    await closed.goto(url);
    for (let index = 1; index <= 13; index++) {
      await closed.locator("#empty-new").click();
      await closed.locator("#blank").click();
      await closed.locator("#title").fill(`Canción ${index}`);
      await closed.locator(".tab-close").click();
    }
    assert.equal((await stored(closed)).recent.length, 13);
    await closed.reload();
    await closed.locator("#recent-all").click();
    await expect(closed.locator("#recent-list li")).toHaveCount(13);
    await closed.locator("#empty-new").click();
    await closed.locator("#dialog-recent-all").click();
    await expect(closed.locator("#dialog-recent-list li")).toHaveCount(13);
    await closed.locator("#new-dialog .dialog-close").click();
    await closed.locator("#export").click();
    const backupReady = closed.waitForEvent("download");
    await closed.locator("#workspace-backup").click();
    const backup = await readFile(await (await backupReady).path());
    const data = JSON.parse(backup.toString());
    assert.equal(data.songs.length, 0);
    assert.equal(data.recent.length, 13);
    await closed.locator("#empty-new").click();
    await closed.locator("#open-project").click();
    await closed.locator("#file").setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: backup,
    });
    await closed.locator("#new-dialog").waitFor({ state: "hidden" });
    await expect(closed.locator("#recent-list li")).toHaveCount(26);
    await closed
      .locator("#recent-list .recent-title")
      .filter({ hasText: /^Canción 1$/ })
      .first()
      .click();
    await expect(closed.locator("#title")).toHaveValue("Canción 1");

    // A quota failure must leave both the open song and its last saved copy intact.
    await closed.evaluate(() => {
      window.restoreSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "chordleaf-v1")
          throw new DOMException("Full", "QuotaExceededError");
        return window.restoreSetItem.call(this, key, value);
      };
    });
    await closed.locator(".tab-close").click();
    await expect(closed.locator("#title")).toHaveValue("Canción 1");
    assert.equal((await stored(closed)).songs.length, 1);
    await closed.locator("#new").click();
    const countBeforeRemoval = await closed
      .locator("#dialog-recent-list li")
      .count();
    await closed.locator("#dialog-recent-list .recent-remove").first().click();
    await expect(closed.locator("#dialog-recent-list li")).toHaveCount(
      countBeforeRemoval,
    );
    await closed.locator("#new-dialog .dialog-close").click();
    await closed.evaluate(
      () => (Storage.prototype.setItem = window.restoreSetItem),
    );
    await library.close();

    const migration = await browser.newContext({
      locale: "es-ES",
      serviceWorkers: "block",
    });
    const legacy = await migration.newPage();
    const legacyRecent = Array.from({ length: 15 }, (_, index) => ({
      song: createSong({ title: `Legacy ${index}`, text: "[C]Original" }),
      closedAt: index,
    }));
    await legacy.addInitScript((recent) => {
      if (!localStorage.getItem("chordleaf-v1"))
        localStorage.setItem("chordleaf-recent-v1", JSON.stringify(recent));
    }, legacyRecent);
    await legacy.goto(url);
    assert.equal((await stored(legacy)).recent.length, 15);
    assert.equal(
      await legacy.evaluate(() => localStorage.getItem("chordleaf-recent-v1")),
      null,
    );
    await legacy.reload();
    await legacy.locator("#recent-all").click();
    await expect(legacy.locator("#recent-list li")).toHaveCount(15);
    await migration.close();

    const limits = await browser.newContext({
      locale: "es-ES",
      serviceWorkers: "block",
    });
    const limitPage = await limits.newPage();
    const boundary = createSong({
      title: "Límite",
      text: "[C]" + "x".repeat(49997),
    });
    await limitPage.addInitScript((song) => {
      if (!localStorage.getItem("chordleaf-v1"))
        localStorage.setItem(
          "chordleaf-v1",
          JSON.stringify({ songs: [song], active: song.id }),
        );
    }, boundary);
    await limitPage.goto(url);
    await limitPage.locator("#pencil").click();
    await limitPage.locator(".song-line .lyric").first().click();
    await limitPage.locator(".inline-editor").fill("y".repeat(50001));
    await expect(limitPage.locator("#toast")).toContainText("50.000");
    await limitPage.keyboard.press("Escape");
    await limitPage.keyboard.press("Control+s");
    assert.equal((await stored(limitPage)).songs[0].text, boundary.text);
    await limitPage.locator("#transpose-up").focus();
    await limitPage.keyboard.press("Enter");
    assert.equal(
      await limitPage.locator("#source").inputValue(),
      boundary.text,
    );
    await expect(limitPage.locator("#transpose-up")).toBeFocused();
    await limits.close();
    assert.deepEqual(errors, []);
    console.log(
      `${engine.name()}: active drafts, reload/handoff, 13 closed songs, backup/merge, failed close and text limits passed`,
    );
  } finally {
    await browser.close();
  }
}
