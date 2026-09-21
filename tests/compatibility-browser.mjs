import { chromium, firefox, webkit } from "@playwright/test";
import assert from "node:assert/strict";
const url = process.env.CHORDI_URL || "http://localhost:5173";
for (const engine of [chromium, firefox, webkit].filter(
  (engine) =>
    !process.env.CHORDI_BROWSERS ||
    process.env.CHORDI_BROWSERS.split(",").includes(engine.name()),
)) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    await page.goto(url);
    await page.locator("#source").fill("[C]Keep my changes\n[G]Across windows");
    const second = await context.newPage();
    await second.goto(url);
    await second
      .getByRole("heading", { name: "Your workspace is open in another tab" })
      .waitFor();
    await page.close();
    await second.getByRole("button", { name: "Try again" }).click();
    await second.locator("#source").waitFor();
    assert.equal(
      await second.locator("#source").inputValue(),
      "[C]Keep my changes\n[G]Across windows",
    );
    await second.locator("#export").click();
    const pending = second.waitForEvent("download");
    await second.locator("#workspace-backup").click();
    const download = await pending;
    const path = await download.path();
    await second.locator("#new").click();
    await second.locator("#import").click();
    await second.locator("#file").setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: await (await import("node:fs/promises")).readFile(path),
    });
    await second.waitForFunction(
      () => document.querySelectorAll(".tab").length === 2,
    );
    assert.equal(
      await second.locator("#source").inputValue(),
      "[C]Keep my changes\n[G]Across windows",
    );
    await second.locator("#language").selectOption("es");
    await second.waitForFunction(() => document.documentElement.lang === "es");
    await second.reload();
    await second.locator("#source").waitFor();
    assert.equal(await second.locator(".tab").count(), 2);
    console.log(
      `${engine.name()}: persistence, exclusive editing, backups and languages passed`,
    );
  } finally {
    await browser.close();
  }
}
