#!/usr/bin/env node
// Renders public/logo.svg into the PNG icons declared by the web app manifest.
// Playwright is a development dependency; the generated PNGs are committed.
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public", "icons");
const background = "#171a19";
// Maskable icons keep the artwork inside the safe zone; regular icons can be larger.
const icons = [
  { file: "icon-192.png", size: 192, ratio: 0.72, maskable: false },
  { file: "icon-512.png", size: 512, ratio: 0.72, maskable: false },
  { file: "icon-maskable-192.png", size: 192, ratio: 0.5, maskable: true },
  { file: "icon-maskable-512.png", size: 512, ratio: 0.5, maskable: true },
  { file: "apple-touch-icon.png", size: 180, ratio: 0.72, maskable: false },
];

await mkdir(output, { recursive: true });
const logo = `data:image/svg+xml;base64,${(
  await readFile(path.join(root, "public", "logo.svg"))
).toString("base64")}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const icon of icons) {
    const art = Math.round(icon.size * icon.ratio);
    await page.setViewportSize({ width: icon.size, height: icon.size });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;width:${icon.size}px;height:${icon.size}px;background:${background};display:grid;place-items:center"><img alt="" src="${logo}" style="width:${art}px;height:${art}px;display:block"></body></html>`,
    );
    await page.screenshot({
      path: path.join(output, icon.file),
      omitBackground: false,
    });
    console.log(
      `✓ ${icon.file} (${icon.size}×${icon.size}${icon.maskable ? ", maskable" : ""})`,
    );
  }
} finally {
  await browser.close();
}
