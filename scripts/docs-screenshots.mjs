// Public documentation uses only this original, deterministic demo song.
import { chromium, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
const base = process.env.CHORDLEAF_URL || "http://localhost:5173";
await mkdir(new URL("../docs/images/", import.meta.url), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "en-US",
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto(base);
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
  await page.close();

  // Follow the Spanish five-minute guide in a separate, clean workspace.
  const spanish = await browser.newPage({
    locale: "es-ES",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  spanish.on("pageerror", (error) => errors.push(error.message));
  await spanish.goto(new URL("/es/", base).href);
  await spanish.locator("#empty-new").click();
  await spanish.evaluate(() => document.fonts.ready);
  await spanish
    .locator("#new-dialog")
    .screenshot({ path: "docs/images/first-song-new-es.png" });
  await spanish.locator("#blank").click();
  await spanish.locator("#title").fill("Mi primera canción");
  await spanish.locator("#artist").fill("Ejemplo original · Chordleaf");
  await spanish.locator('.rail [data-desktop-view="edit"]').click();
  const text =
    "[G]Hay un lugar al [D]otro lado\n[Em]donde el tiempo va [C]despacio.\n[G]Guardo la luz de [D]esta mañana\n[C]en las cuerdas de mi [G]guitarra.";
  await spanish.locator("#source").fill(text);
  await expect(spanish.locator("#save-state")).toHaveText(
    "Guardado en este navegador",
  );
  await spanish.screenshot({ path: "docs/images/first-song-edit-es.png" });
  await spanish.locator('.rail [data-desktop-view="document"]').click();
  await spanish.locator("#export").click();
  await expect(spanish.locator("#save-project")).toBeVisible();
  await spanish.screenshot({ path: "docs/images/first-song-export-es.png" });
  const pdfReady = spanish.waitForEvent("download");
  await spanish.locator('[data-export="pdf"]').click();
  const pdf = await pdfReady;
  expect((await readFile(await pdf.path())).subarray(0, 5).toString()).toBe(
    "%PDF-",
  );
  await spanish.locator("#export").click();
  const projectReady = spanish.waitForEvent("download");
  await spanish.locator("#save-project").click();
  const project = JSON.parse(
    await readFile(await (await projectReady).path(), "utf8"),
  );
  expect(project.song.title).toBe("Mi primera canción");
  expect(project.song.text).toBe(text);
  await spanish.setViewportSize({ width: 390, height: 844 });
  await spanish.locator('[data-mobile-view="edit"]').click();
  await expect(spanish.locator("#source")).toHaveValue(text);
  await spanish.locator('[data-mobile-view="preview"]').click();
  await expect(spanish.locator("#pages")).toBeVisible();
  expect(errors).toEqual([]);
  await spanish.close();

  // The chooser is real UI; capturing it must not fetch model weights.
  const audio = await browser.newPage({
    locale: "en-US",
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const modelRequests = [];
  audio.on("request", (request) => {
    if (new URL(request.url()).hostname === "huggingface.co")
      modelRequests.push(request.url());
  });
  await audio.goto(new URL("/en/", base).href);
  await audio.locator("#empty-new").click();
  await audio.locator("#audio").click();
  await expect(audio.locator("#audio-browser-model-dialog")).toBeVisible();
  await expect(audio.locator("#browser-model-next")).toHaveText(
    "Download and continue",
  );
  await audio.evaluate(() => document.fonts.ready);
  await audio
    .locator("#audio-browser-model-dialog")
    .screenshot({ path: "docs/images/audio-models-guide.png" });
  expect(modelRequests).toEqual([]);
  await audio.close();
  console.log(
    "Documentation: Spanish desktop/phone flow, PDF, editable project and model chooser verified.",
  );
} finally {
  await browser.close();
}
