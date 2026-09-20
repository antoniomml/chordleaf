import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseSong } from "../src/music.js";
const input = process.env.CHORDI_REFERENCE_PDF;
if (!input) throw Error("Set CHORDI_REFERENCE_PDF to the reference PDF.");
await fs.mkdir("artifacts/alone-review", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.CHORDI_URL || "http://localhost:5173");
  await page.locator("#new").click();
  await page.locator("#file").setInputFiles(input);
  await page.waitForFunction(() => !document.querySelector("#new-dialog").open);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(
    await page.locator("#title").inputValue(),
    "ALONE AGAIN (NATURALLY)",
  );
  assert.equal(
    await page.locator("#artist").inputValue(),
    "GILBERT O’SULLIVAN",
  );
  assert.equal(await page.locator("#capo").inputValue(), "2");
  assert.equal(
    await page.locator('[data-columns="2"]').getAttribute("class"),
    "selected",
  );
  assert.equal(await page.locator(".page").count(), 1);
  const source = await page.locator("#source").inputValue();
  await fs.writeFile("artifacts/alone-review/corrected-source.txt", source);
  assert.equal(source.split("{column}").length, 2);
  assert.equal([...source.matchAll(/\[[^\]]+\]/g)].length, 103);
  const lyric = parseSong(source)
    .filter((l) => l.lyric && !/^[\s|:–—−-]*$/.test(l.lyric))
    .map((l) => l.lyric)
    .join("")
    .replace(/\s/g, "");
  assert.equal(
    createHash("sha256").update(lyric).digest("hex"),
    "9a757aa9a161237561a6d8585b8c78583f9c0de5c202b41e6859e54ba074c3bc",
  );
  assert.ok(
    source.indexOf("It s[G]eems") > source.indexOf("I [G#m7]truly I'm"),
  );
  assert.equal([...source.matchAll(/\[E5\+\]/g)].length, 4);
  await page.screenshot({
    path: "artifacts/alone-review/chordi-corrected.png",
    fullPage: true,
  });
  for (const type of ["pdf", "docx", "txt"]) {
    await page.locator("#export").click();
    const waiting = page.waitForEvent("download");
    await page.locator(`[data-export="${type}"]`).click();
    await (await waiting).saveAs(`artifacts/alone-review/corrected.${type}`);
  }
  assert.deepEqual(errors, []);
  console.log("Reference passed", {
    pages: await page.locator(".page").count(),
    chords: [...source.matchAll(/\[[^\]]+\]/g)].length,
    lines: source.split("\n").length,
  });
} finally {
  await browser.close();
}
