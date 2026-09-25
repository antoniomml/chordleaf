import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page.locator("#title").fill("Prueba de UX");
  await page.waitForTimeout(500);
  await page.locator('.rail [data-desktop-view="edit"]').click();

  // C2.2: the visible state is not a live region; a hidden one announces only
  // text transitions, not every keystroke.
  assert.equal(await page.locator("#save-state").getAttribute("role"), null);
  assert.equal(
    await page.locator("#save-announcer").getAttribute("role"),
    "status",
  );
  await page.evaluate(() => {
    window.__announcements = [];
    const announcer = document.querySelector("#save-announcer");
    new MutationObserver(() =>
      window.__announcements.push(announcer.textContent),
    ).observe(announcer, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
  await page.locator("#source").click();
  await page.locator("#source").pressSequentially("abcdef", { delay: 40 });
  await page.waitForTimeout(650);
  const announcements = await page.evaluate(() => window.__announcements);
  assert.ok(announcements.length <= 3, announcements.join(" | "));
  assert.equal(announcements[0], "Guardando…");
  assert.equal(
    await page.locator("#save-announcer").textContent(),
    await page.locator("#save-state").textContent(),
  );

  // C2.1: a successful action uses the success variant and can be dismissed.
  await page.locator("#source").fill("[G]One [D]two");
  await page.locator('[data-section="chords"]').click();
  await page
    .getByRole("button", { name: "Añadir diagrama de G", exact: true })
    .click();
  await page.locator(".chord-sticker").first().waitFor();
  const toast = page.locator("#toast");
  assert.equal(
    await toast.evaluate((el) => el.classList.contains("toast-success")),
    true,
  );
  assert.equal(
    await toast.evaluate((el) => el.classList.contains("visible")),
    true,
  );
  assert.equal(await toast.getAttribute("role"), "status");
  assert.equal(await toast.textContent(), "Diagrama añadido a la hoja.");
  assert.equal(await page.locator("#toast").count(), 1);
  await toast.click();
  assert.equal(
    await toast.evaluate((el) => el.classList.contains("visible")),
    false,
  );

  // C2.3: Delete removes the block from the block itself, not from a handle.
  const sticker = page.locator(".chord-sticker").first();
  await sticker.focus();
  await page.keyboard.press("Delete");
  await page.locator(".chord-sticker").waitFor({ state: "detached" });
  await page
    .getByRole("button", { name: "Añadir diagrama de G", exact: true })
    .click();
  await page.locator(".chord-sticker").first().waitFor();
  await page.locator(".chord-sticker .resize-corner").focus();
  await page.keyboard.press("Delete");
  assert.equal(await page.locator(".chord-sticker").count(), 1);
  // The move handle moves with the arrow keys and keeps focus after re-render.
  const left = await page
    .locator(".chord-sticker")
    .evaluate((el) => parseFloat(el.style.left));
  await page.locator(".chord-sticker .move-sticker").focus();
  await page.keyboard.press("ArrowRight");
  assert.ok(
    (await page
      .locator(".chord-sticker")
      .evaluate((el) => parseFloat(el.style.left))) > left,
  );
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.classList.contains("move-sticker"),
    ),
    true,
  );
  await page.keyboard.press("Delete");
  assert.equal(await page.locator(".chord-sticker").count(), 1);
  await page.locator(".chord-sticker").first().focus();
  await page.keyboard.press("Backspace");
  await page.locator(".chord-sticker").waitFor({ state: "detached" });

  // C2.4: the sheet still scrolls vertically under a big diagram.
  assert.equal(
    await page
      .locator("#pages-scroll")
      .evaluate((el) => getComputedStyle(el).touchAction),
    "pan-x pan-y",
  );
  await page.evaluate(() => {
    const el = document.createElement("div");
    el.className = "chord-sticker";
    el.style.cssText = "left:10px;top:10px;width:85px;height:60px";
    document.querySelector(".page").append(el);
  });
  assert.equal(
    await page
      .locator(".page .chord-sticker")
      .last()
      .evaluate((el) => getComputedStyle(el).touchAction),
    "pan-y",
  );
  await page.evaluate(() =>
    document
      .querySelectorAll(".page .chord-sticker")
      .forEach((el) => el.remove()),
  );

  // C2.6: keyboard focus opens the same chord tooltip as the pointer.
  await page.locator('.rail [data-desktop-view="document"]').click();
  const chord = page.locator(".sheet-chord[data-chord]").first();
  await chord.focus();
  assert.equal(await page.locator("#chord-tooltip").isVisible(), true);
  assert.equal(
    await page.locator("#chord-tooltip strong").textContent(),
    await chord.textContent(),
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#chord-tooltip").isVisible(), false);
  // The active song tab is marked for assistive technology.
  await page.locator("#tab-plus").click();
  await page.locator("#blank").click();
  assert.equal(
    await page.locator(".tab.active .tab-select").getAttribute("aria-current"),
    "page",
  );
  assert.equal(
    await page.locator(".tab:not(.active) .tab-select[aria-current]").count(),
    0,
  );
  await page.locator(".tab-select").first().click();

  // C2.1: warning and error variants, plus a visible save error.
  await page.locator('.rail [data-desktop-view="edit"]').click();
  await page.locator("#source").evaluate((el) => {
    el.value = "x".repeat(50001);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  assert.equal(
    await page
      .locator("#toast")
      .evaluate((el) => el.classList.contains("toast-warning")),
    true,
  );
  await page.evaluate(() => {
    window.__setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new Error("quota");
    };
  });
  await page.locator("#source").fill("[C]contenido nuevo");
  await page.waitForTimeout(650);
  assert.equal(
    await page
      .locator("#toast")
      .evaluate((el) => el.classList.contains("toast-error")),
    true,
  );
  assert.equal(await page.locator("#toast").getAttribute("role"), "alert");
  assert.equal(
    await page.locator("#save-state").getAttribute("class"),
    "error",
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__setItem;
  });
  await page.locator("#source").fill("[C]contenido recuperado");
  await page.waitForTimeout(650);
  assert.equal(await page.locator("#save-state").getAttribute("class"), "");

  // C2.3: touch targets on a phone.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.rail [data-mobile-view="music"]').click();
  await page.locator('[data-music-section="key"]').click();
  const degree = await page.locator(".degree").first().boundingBox();
  assert.ok(degree.height >= 44, `degree height ${degree.height}`);
  await page.locator("#mobile-tab-plus").click();
  const dialogClose = await page
    .locator("#new-dialog .dialog-close")
    .boundingBox();
  assert.ok(
    dialogClose.width >= 44 && dialogClose.height >= 44,
    `dialog close ${dialogClose.width}x${dialogClose.height}`,
  );
  await page.locator("#new-dialog .dialog-close").click();
  await page.locator('.rail [data-mobile-view="edit"]').click();
  await page.locator("#source").fill("[?G]Revisar este acorde");
  await page.locator('.rail [data-mobile-view="preview"]').click();
  await page.locator(".unresolved-chord").first().click();
  const issueClose = await page.locator("#issue-close").boundingBox();
  assert.ok(
    issueClose.width >= 44 && issueClose.height >= 44,
    `issue close ${issueClose.width}x${issueClose.height}`,
  );
  await page.locator("#issue-close").click();
  await page.close();

  // C2.3: on a coarse pointer the sticker handles own a 44px hit area.
  const touchPage = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  touchPage.on("pageerror", (error) => errors.push(error.message));
  await touchPage.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await touchPage.locator("#empty-new").click();
  await touchPage.locator("#blank").click();
  await touchPage.locator('.rail [data-mobile-view="edit"]').click();
  await touchPage.locator("#source").fill("[G]Una canción");
  await touchPage.locator('.rail [data-mobile-view="music"]').click();
  await touchPage.locator('[data-music-section="chords"]').click();
  await touchPage
    .getByRole("button", { name: "Añadir diagrama de G", exact: true })
    .click();
  await touchPage.locator(".chord-sticker").first().waitFor();
  const hitArea = await touchPage
    .locator(".chord-sticker .configure-sticker")
    .evaluate((el) => {
      const style = getComputedStyle(el, "::after");
      return { content: style.content, top: style.top, left: style.left };
    });
  assert.equal(hitArea.content, '""');
  assert.equal(hitArea.top, "-12px");
  assert.equal(hitArea.left, "-12px");
  await touchPage.close();

  assert.deepEqual(errors, []);
  console.log(
    "Toast variants, save-state announcements, ARIA and touch targets passed",
  );
} finally {
  await browser.close();
}
