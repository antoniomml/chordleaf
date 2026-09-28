import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const script = fileURLToPath(
  new URL("../experiments/audio/check.py", import.meta.url),
);
let cached;
export function audioReadiness(python) {
  if (!python) return Promise.resolve({ available: false });
  const key = JSON.stringify([python, process.env.CHORDLEAF_WHISPER_MODEL]);
  if (cached?.key === key && cached.until > Date.now()) return cached.promise;
  const promise = new Promise((resolve) => {
    const child = spawn(python, [script], {
      stdio: ["ignore", "pipe", "ignore"],
      env: { ...process.env, HF_HUB_OFFLINE: "1" },
    });
    let output = "",
      settled = false;
    const finish = (data) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(data);
    };
    const fail = () => finish({ available: false, reason: "runtime" });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      fail();
    }, 20_000);
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.length > 8192) {
        child.kill("SIGKILL");
        fail();
      }
    });
    child.once("error", fail);
    child.once("close", (code) => {
      try {
        const data = JSON.parse(output);
        if (code !== 0 || typeof data.available !== "boolean") return fail();
        finish(data);
      } catch {
        fail();
      }
    });
  });
  cached = { key, until: Date.now() + 30_000, promise };
  return promise;
}
