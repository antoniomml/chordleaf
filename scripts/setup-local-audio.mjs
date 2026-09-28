// Explicit installation command; never invoked by the web UI or inference API.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const model = process.argv[2] || "small";
if (!new Set(["tiny", "small", "medium"]).has(model)) {
  console.error(
    "Usage: pnpm audio:setup [tiny|small|medium]. Downloads dependencies and model weights; receives no audio.",
  );
  process.exit(1);
}
const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Installer exited with code ${code}`)),
    );
  });
try {
  const env = join(root, "experiments/audio/.venv");
  const python = join(
    env,
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
  if (!existsSync(python))
    await run(process.env.CHORDLEAF_SETUP_PYTHON || "python3.13", [
      "-m",
      "venv",
      env,
    ]);
  await run(python, [
    "-m",
    "pip",
    "install",
    "-r",
    "experiments/audio/requirements-neural.lock.txt",
  ]);
  await run(python, [
    "-c",
    "from faster_whisper import WhisperModel; import sys; WhisperModel(sys.argv[1], device='cpu', compute_type='int8')",
    model,
  ]);
  console.log(
    "Models installed locally. Run pnpm build, then pnpm start:local-audio. Select a non-default Whisper model with CHORDLEAF_WHISPER_MODEL.",
  );
} catch (error) {
  console.error(
    "Local setup failed. Install Python 3.13 or set CHORDLEAF_SETUP_PYTHON to its executable. See experiments/audio/README.md.",
  );
  console.error(error.message);
  process.exitCode = 1;
}
