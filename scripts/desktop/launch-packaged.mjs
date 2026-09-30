import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
export async function launchPackaged(profile) {
  const child = spawn(
    resolve("release-desktop/mac-arm64/Chordleaf.app/Contents/MacOS/Chordleaf"),
    ["--remote-debugging-port=0", "--lang=es"],
    {
      env: { ...process.env, CHORDLEAF_DESKTOP_TEST_DATA: profile },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Packaged app did not expose its test debugger"));
    }, 30000);
    let buffer = "";
    child.stderr.on("data", (data) => {
      buffer += data;
      console.error(String(data).trim());
      const match = buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Packaged app exited: ${code} ${buffer}`));
    });
  });
  const browser = await chromium.connectOverCDP(endpoint);
  return {
    firstWindow: async () =>
      browser.contexts()[0].pages()[0] ||
      browser.contexts()[0].waitForEvent("page", { timeout: 30000 }),
    evaluate: async () => {},
    close: async () => {
      const exited =
        child.exitCode !== null
          ? Promise.resolve(child.exitCode)
          : new Promise((resolve) => child.once("exit", resolve));
      for (const page of browser.contexts()[0]?.pages() || [])
        await page.evaluate(() => window.close()).catch(() => {});
      let timer;
      try {
        const code = await Promise.race([
          exited,
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error("Packaged app did not finish shutdown")),
              10000,
            );
          }),
        ]);
        if (code !== 0)
          throw new Error(`Packaged app closed with code ${code}`);
      } finally {
        clearTimeout(timer);
        if (child.exitCode === null) child.kill("SIGKILL");
        await browser.close();
      }
    },
  };
}
