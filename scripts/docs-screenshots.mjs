// Public documentation uses only this original, deterministic demo song.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir(new URL("../docs/images/", import.meta.url), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "en-US",
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto(process.env.CHORDLEAF_URL || "http://localhost:5173");
  await page.locator("#empty-new").click();
  await page.locator("#blank").click();
  await page.locator("#title").fill("Al otro lado");
  await page.locator("#artist").fill("Canción de ejemplo · Chordleaf");
  // Desktop Document view shows the settings; the lyrics editor lives in Edit.
  await page.locator('.rail [data-desktop-view="edit"]').click();
  await page
    .locator("#source")
    .fill(
      "[G]Hay un lugar al [D]otro lado\n[Em]donde el tiempo va [C]despacio.\n[G]Guardo la luz de [D]esta mañana\n[C]en las cuerdas de mi [G]guitarra.\n\n[Em]Y si la noche nos [C]encuentra,\n[G]que nos encuentre al [D]caminar.\n[Em]Con una canción [C]pequeña\n[G]y tantas cosas por [D]contar.\n\n[G]Vuelve a sonar, [D]vuelve a empezar,\n[Em]cada camino nos [C]trae hasta aquí.\n[G]Vuelve a sonar, [D]sin preguntar,\n[C]hoy esta canción es [G]para ti.\n\n[G]Dejo una puerta [D]siempre abierta,\n[Em]un verso a medio [C]terminar.\n[G]Que lo complete [D]quien lo sienta,\n[C]que lo acompañe el [G]mar.",
    );
  await page.locator(".page").waitFor();
  await page.evaluate(() => document.fonts.ready);
  // Let the debounced save finish so the footer does not read "Saving…".
  await page.waitForTimeout(600);
  await page.screenshot({ path: "docs/images/workspace.png" });
  await page.locator('[data-section="chords"]').click();
  await page
    .locator(".editor-panel")
    .screenshot({ path: "docs/images/chord-library.png" });
  await page.locator('[data-mode="identify"]').click();
  for (const [string, fret] of [
    [1, 3],
    [2, 2],
    [3, 0],
    [4, 1],
    [5, 0],
  ]) {
    await page
      .locator(
        `[data-string="${string}"][data-fret="${fret === 0 ? -1 : fret}"]`,
      )
      .click();
  }
  await page
    .locator(".editor-panel")
    .screenshot({ path: "docs/images/chord-identifier.png" });
} finally {
  await browser.close();
}
