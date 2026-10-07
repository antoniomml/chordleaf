// Build-time only. Pin and verify the relocatable runtime before installing wheels.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
export const root = resolve(import.meta.dirname, "../..");
export const runtime = resolve(root, "artifacts/desktop/runtime");
const url =
  "https://github.com/astral-sh/python-build-standalone/releases/download/20260924/cpython-3.13.15%2B20260924-aarch64-apple-darwin-install_only_stripped.tar.gz";
const sha256 =
  "064afb7c2fc0bbf511d886288adf98696af5105e36c138cdf2c199c0146fcf68";
export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      ...options,
    });
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)),
    );
  });
}
if (process.platform !== "darwin" || process.arch !== "arm64")
  throw new Error("Build on an Apple Silicon Mac");
await mkdir(runtime, { recursive: true });
const archive = resolve(root, "artifacts/desktop/python.tar.gz");
try {
  await access(archive);
} catch {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Python download: ${response.status}`);
  await writeFile(archive, Buffer.from(await response.arrayBuffer()));
}
if (
  createHash("sha256")
    .update(await readFile(archive))
    .digest("hex") !== sha256
)
  throw new Error("Python checksum mismatch");
const python = resolve(runtime, "python/bin/python3");
try {
  await access(python);
} catch {
  await run("tar", ["-xzf", archive, "-C", runtime]);
}
await run(python, [
  "-m",
  "pip",
  "install",
  "--require-hashes",
  "-r",
  "experiments/audio/requirements-desktop.lock.txt",
]);
await run(python, ["-m", "pip", "check"]);
await writeFile(
  resolve(runtime, "provenance.json"),
  JSON.stringify(
    { url, sha256, platform: "darwin-arm64", python: "3.13.15" },
    null,
    2,
  ),
);
