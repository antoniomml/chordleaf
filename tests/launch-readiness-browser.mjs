import { chromium, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import mammoth from "mammoth";

const base = (process.env.CHORDLEAF_URL || "http://localhost:5173").replace(
  /\/+$/,
  "",
);
await mkdir("artifacts/launch-readiness", { recursive: true });
const engines = { chromium, webkit };
for (const name of (process.env.CHORDLEAF_BROWSERS || "chromium,webkit").split(
  ",",
)) {
  if (!engines[name]) continue;
  const browser = await engines[name].launch({ headless: true });
  try {
    for (const locale of ["es", "en"]) {
      const context = await browser.newContext({
        locale: locale === "es" ? "es-ES" : "en-US",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${base}/${locale}/`);
      await page.locator("#example-song").click();
      for (const [width, height] of [
        [320, 568],
        [844, 390],
        [768, 1024],
        [820, 1180],
      ]) {
        await page.setViewportSize({ width, height });
        await page.locator('.rail [data-mobile-view="preview"]').click();
        const sheet = await page.locator(".page-shell").first().boundingBox();
        assert.ok(
          sheet.width > Math.min(width - 60, 600),
          `full-width preview at ${width}`,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
          ),
          false,
        );
        await page.locator("#toast").evaluate((element) => {
          element.textContent = "Aviso de prueba";
          element.classList.add("visible");
        });
        await page.locator("#export").click();
        await expect(page.locator("#toast")).toHaveCSS(
          "pointer-events",
          "none",
        );
        await page.keyboard.press("End");
        await expect(page.locator("#workspace-backup")).toBeFocused();
        const bounds = await page.locator("#export-menu").boundingBox();
        assert.ok(
          bounds.y >= 0 && bounds.y + bounds.height <= height,
          "menu fits viewport",
        );
        const backup = page.waitForEvent("download");
        await page.locator("#workspace-backup").click();
        const saved = JSON.parse(
          await readFile(await (await backup).path(), "utf8"),
        );
        assert.equal(saved.songs.length, 1);
        assert.ok(saved.songs[0].text.includes("["));
        if (locale === "es" && [844, 768].includes(width))
          await page.screenshot({
            path: `artifacts/launch-readiness/${name}-${width}.png`,
          });
      }
      await page.locator(".tab-close").click();
      const before = await page.evaluate(() =>
        localStorage.getItem("chordleaf-v1"),
      );
      const remove = page.locator("#recent-list .recent-remove").first();
      await remove.click();
      await expect(page.locator("#delete-recent-cancel")).toBeFocused();
      await expect(page.locator("#delete-recent-heading")).toHaveText(
        locale === "es"
          ? "¿Eliminar la canción guardada?"
          : "Delete the saved song?",
      );
      await page.keyboard.press("Escape");
      await expect(remove).toBeFocused();
      assert.equal(
        await page.evaluate(() => localStorage.getItem("chordleaf-v1")),
        before,
      );
      await remove.click();
      await page.locator("#delete-recent-cancel").click();
      assert.equal(
        await page.evaluate(() => localStorage.getItem("chordleaf-v1")),
        before,
      );
      await page.reload();
      await expect(page.locator("#recent-list li")).toHaveCount(1);
      await page.evaluate(() => {
        window.originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === "chordleaf-v1")
            throw new DOMException("Full", "QuotaExceededError");
          return window.originalSetItem.call(this, key, value);
        };
      });
      await remove.click();
      await page.locator("#delete-recent-confirm").click();
      await expect(page.locator("#delete-recent-dialog")).toBeVisible();
      await expect(page.locator("#delete-recent-error")).toContainText(
        locale === "es" ? "se conserva" : "preserved",
      );
      assert.equal(
        await page.evaluate(() => localStorage.getItem("chordleaf-v1")),
        before,
      );
      await page.locator("#delete-recent-cancel").click();
      await page.evaluate(
        () => (Storage.prototype.setItem = window.originalSetItem),
      );
      await remove.click();
      await page.locator("#delete-recent-confirm").click();
      await expect(page.locator("#recent-list li")).toHaveCount(0);
      await page.reload();
      await expect(page.locator("#empty-new")).toBeVisible();
      assert.equal(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem("chordleaf-v1")).recent.length,
        ),
        0,
      );
      assert.deepEqual(errors, []);
      await context.close();
    }

    const context = await browser.newContext({
      locale: "es-ES",
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    await page.goto(`${base}/es/`);
    await page.locator("#example-song").click();
    await page.locator('.rail [data-desktop-view="edit"]').click();
    await page.locator("#source").fill("[C]Copia original de la exportación");
    let release, entered;
    const gate = new Promise((resolve) => (release = resolve));
    const started = new Promise((resolve) => (entered = resolve));
    let requests = 0,
      downloads = 0;
    page.on("download", () => downloads++);
    const scriptPattern = /\/assets\/[^/]+\.js(?:\?.*)?$/;
    await page.route(scriptPattern, async (route) => {
      requests++;
      if (requests === 1) {
        entered();
        await gate;
      }
      await route.continue();
    });
    await page.locator("#export").click();
    const download = page.waitForEvent("download");
    await page.locator('[data-export="docx"]').click();
    await started;
    await page.waitForTimeout(4300);
    await expect(page.locator("#export-progress")).toBeVisible();
    await expect(page.locator("#export-progress")).toContainText(
      "Preparando Word",
    );
    await page.locator(".tab-select").click();
    await page
      .locator("#source")
      .fill("[G]Edición posterior que debe seguir guardada");
    await page.locator("#export").click();
    await expect(page.locator('[data-export="docx"]')).toBeDisabled();
    await expect(page.locator('[data-export="pdf"]')).toBeDisabled();
    await page
      .locator('[data-export="docx"]')
      .evaluate((button) => button.click());
    assert.equal(downloads, 0);
    await page.keyboard.press("Escape");
    release();
    const word = await readFile(await (await download).path());
    const raw = await mammoth.extractRawText({ buffer: word });
    assert.ok(raw.value.includes("Copia original de la exportación"));
    assert.ok(!raw.value.includes("Edición posterior"));
    await expect(page.locator("#export-progress")).toBeHidden();
    assert.equal(downloads, 1);
    await expect(page.locator("#source")).toHaveValue(
      "[G]Edición posterior que debe seguir guardada",
    );
    await page.unroute(scriptPattern);
    await page.route(scriptPattern, (route) => route.abort());
    await page.locator("#export").click();
    await page.locator('[data-export="pdf"]').click();
    await expect(page.locator("#toast")).toContainText("No se pudo exportar");
    await expect(page.locator("#export-progress")).toBeHidden();
    await page.unroute(scriptPattern);
    await page.locator("#export").click();
    await expect(page.locator('[data-export="txt"]')).toBeEnabled();
    const text = page.waitForEvent("download");
    await page.locator('[data-export="txt"]').click();
    assert.ok(
      (await readFile(await (await text).path(), "utf8")).includes(
        "Edición posterior",
      ),
    );
    await context.close();

    const library = await browser.newContext({
      locale: "es-ES",
      serviceWorkers: "block",
    });
    const libraryPage = await library.newPage();
    await libraryPage.addInitScript(() => {
      localStorage.setItem(
        "chordleaf-v1",
        JSON.stringify({
          songs: [],
          active: null,
          recent: Array.from({ length: 601 }, (_, index) => ({
            song: {
              id: `closed-${index}`,
              title: `Canción ${index}`,
              text: `[C]Texto ${index}`,
            },
            closedAt: index + 1,
          })),
        }),
      );
    });
    await libraryPage.goto(`${base}/es/`);
    await libraryPage.locator("#export").click();
    await libraryPage.locator("#workspace-backup").click();
    await expect(libraryPage.locator("#workspace-backup-dialog")).toBeVisible();
    const parts = libraryPage.locator("#workspace-backup-parts button");
    const preserved = [];
    for (let index = 0; index < (await parts.count()); index++) {
      const saved = libraryPage.waitForEvent("download");
      await parts.nth(index).click();
      const part = JSON.parse(
        await readFile(await (await saved).path(), "utf8"),
      );
      assert.ok(part.recent.length <= 500);
      preserved.push(...part.recent.map((entry) => entry.song.title));
    }
    assert.equal(preserved.length, 601);
    assert.equal(new Set(preserved).size, 601);
    await expect(libraryPage.locator("#workspace-backup-status")).toHaveText(
      "2 de 2 partes descargadas",
    );
    await library.close();

    const unavailable = await browser.newContext({ locale: "es-ES" });
    const offlinePage = await unavailable.newPage();
    await offlinePage.addInitScript(() => {
      navigator.serviceWorker.register = async () => {
        throw new Error("Controlled registration failure");
      };
    });
    await offlinePage.goto(`${base}/es/`);
    await expect(
      offlinePage.locator('#empty-state [data-offline-state="unavailable"]'),
    ).toBeVisible();
    await offlinePage.locator("#empty-new").click();
    await offlinePage.locator("#blank").click();
    await offlinePage
      .locator("#title")
      .fill("Canción con red sin caché offline");
    await offlinePage.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("chordleaf-v1"))?.songs[0]?.title ===
        "Canción con red sin caché offline",
    );
    await unavailable.close();
    console.log(
      `${name}: safe deletion, horizontal backups, portrait tablets, persistent exports, immutable snapshots and failure recovery passed`,
    );
  } finally {
    await browser.close();
  }
}
