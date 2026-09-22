import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
const logo = `data:image/svg+xml;base64,${(await readFile("public/logo.svg")).toString("base64")}`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>*{box-sizing:border-box}body{margin:0;background:#171a19;color:#f6f1e6;font-family:Arial,sans-serif}.wrap{padding:76px;display:flex;gap:70px;align-items:center;height:630px}.brand{display:flex;align-items:center;gap:18px;font-size:40px;letter-spacing:-2px}.brand img{width:60px}h1{font-size:70px;line-height:1.04;letter-spacing:-3px;margin:35px 0 22px}p{font-size:22px;color:#ccc8be;line-height:1.5}.sheet{background:#fffdf6;color:#242820;padding:35px;transform:rotate(5deg);width:320px;min-width:320px;height:415px;box-shadow:12px 18px 0 #383c31;font-family:monospace}.sheet h2{font-size:22px}.sheet pre{font-size:20px;line-height:1.75}.sheet b{color:#60703e}.badge{color:#d5e1ae;font-size:17px;letter-spacing:2px}</style><div class="wrap"><section><div class="brand"><img src="${logo}">chordleaf</div><h1>Your music,<br>on paper.</h1><p>Lyrics, chords & rehearsal sheets.<br>Tu música, en papel.</p><div class="badge">FREE · LOCAL · EN / ES</div></section><section class="sheet"><h2>A NEW SONG</h2><p>Chordleaf · Song workspace</p><pre><b>G          D</b>\nFind a little light\n<b>Em         C</b>\nKeep the music close\n\n<b>G   D   C   G</b></pre></section></div>`,
  );
  await page.screenshot({ path: "public/social-preview.png" });
} finally {
  await browser.close();
}
