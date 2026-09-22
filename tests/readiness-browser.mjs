import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "en-US",
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(
    process.env.CHORDLEAF_URL || "http://localhost:5173",
  );
  await page
    .getByRole("heading", { name: "No songs are open.", exact: true })
    .waitFor();
  assert.equal(await page.locator(".page").count(), 0);
  assert.equal(await page.locator("#export").isDisabled(), true);
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page.locator(".page").waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.match(await page.locator("#new").innerText(), /New song/);
  assert.match(
    await page.locator(".source-help").innerText(),
    /Without lyrics/,
  );
  const metrics = await page.evaluate(() => ({
    navigation: performance.getEntriesByType("navigation")[0].toJSON(),
    resources: performance.getEntriesByType("resource").map((r) => ({
      name: new URL(r.name).pathname,
      size: r.encodedBodySize,
      duration: r.duration,
    })),
  }));
  await page
    .locator("#title")
    .fill("Nueva canción <img src=x onerror=alert(1)>");
  const lyrics = "[C]Guardar esta canción\n[G]Sin traducción";
  await page.locator("#source").fill(lyrics);
  assert.equal(await page.locator(".sheet-header img").count(), 0);
  await page.locator("#language").click();
  await page.locator('[data-language="es"]').click();
  await page.waitForFunction(() => document.documentElement.lang === "es");
  assert.equal(await page.locator("#source").inputValue(), lyrics);
  assert.match(await page.locator("#new").innerText(), /Nueva canción/);
  await page.locator("#language").press("ArrowDown");
  assert.equal(await page.locator("#language-menu").isVisible(), true);
  await page.locator('[data-language="es"]').press("Escape");
  assert.equal(await page.locator("#language-menu").isVisible(), false);
  await page.locator("#language").click();
  await page.locator('[data-language="en"]').click();
  await page.waitForFunction(() => document.documentElement.lang === "en");
  assert.equal(await page.locator("#source").inputValue(), lyrics);
  await page.locator('[data-section="chords"]').click();
  await page.getByRole("tab", { name: "Identify", exact: true }).click();
  assert.equal(
    await page
      .getByRole("heading", { name: "What chord are you playing?" })
      .count(),
    1,
  );
  await page.locator('[data-string="0"][data-fret="3"]').click();
  await page.locator('[data-section="document"]').click();
  await page.screenshot({
    path: "artifacts/audit-desktop-en.png",
    fullPage: true,
  });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `Overflow at ${width}px`,
    );
    assert.equal(await page.locator("#language").isVisible(), true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/audit-mobile-en.png",
    fullPage: true,
  });
  await page.locator("#new").click();
  await page.locator("#import").click();
  await page.locator("#file").setInputFiles({
    name: "huge.txt",
    mimeType: "text/plain",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await page.waitForFunction(
    () => !document.querySelector("#import-error").hidden,
  );
  assert.match(await page.locator("#import-error").innerText(), /10 MiB/);
  const recovery = await browser.newPage({ locale: "en-US" });
  recovery.on("pageerror", (error) => errors.push(error.message));
  await recovery.addInitScript(() =>
    localStorage.setItem("chordleaf-v1", "{broken workspace"),
  );
  await recovery.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await recovery.locator("#recover").waitFor();
  assert.equal(
    await recovery.evaluate(() => localStorage.getItem("chordleaf-v1")),
    "{broken workspace",
  );
  const recovered = recovery.waitForEvent("download");
  await recovery.locator("#recover").click();
  assert.equal(
    (await recovered).suggestedFilename(),
    "chordleaf-recovery.json",
  );
  await recovery.close();
  const unavailable = await browser.newPage({ locale: "en-US" });
  await unavailable.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage full", "QuotaExceededError");
    };
  });
  await unavailable.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await unavailable.locator("#empty-new").click();
  await unavailable.locator("#blank").click();
  await unavailable.locator("#source").fill("[C]Unsaved work");
  await unavailable.locator("#language").click();
  await unavailable.locator('[data-language="es"]').click();
  assert.equal(await unavailable.locator("html").getAttribute("lang"), "en");
  assert.equal(
    await unavailable.locator("#source").inputValue(),
    "[C]Unsaved work",
  );
  assert.match(
    await unavailable.locator("#save-state").innerText(),
    /Could not save/,
  );
  await unavailable.close();
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/audit-browser.json",
    JSON.stringify({ headers: response.headers(), metrics }, null, 2),
  );
  console.log(
    "Readiness checks passed: languages, persistence, hostile titles, import limits and responsive layouts",
  );
} finally {
  await browser.close();
}
