// A user's own machine hosts both the built UI and its inference worker.
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";

const python =
  process.env.CHORDLEAF_AUDIO_PYTHON ||
  fileURLToPath(
    new URL("../experiments/audio/.venv/bin/python", import.meta.url),
  );
try {
  await access(python, constants.X_OK);
  await access(fileURLToPath(new URL("../dist/index.html", import.meta.url)));
} catch {
  console.error(
    "Install the local audio environment and run pnpm build first. See experiments/audio/README.md.",
  );
  process.exit(1);
}
process.env.HOST = "127.0.0.1";
process.env.CHORDLEAF_LOCAL_AUDIO = "1";
process.env.CHORDLEAF_AUDIO_PYTHON = python;
process.env.CHORDLEAF_AUDIO_OFFLINE = "1";
process.env.HF_HUB_OFFLINE = "1";
await import("../server/start.js");
