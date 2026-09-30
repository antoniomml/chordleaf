import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
const root = resolve(import.meta.dirname, "../..");
const stage = join(root, "artifacts/desktop/app");
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
// Explicit allowlist: no songs, PDFs, credentials, experiments or model caches.
for (const entry of [
  "desktop",
  "server",
  "src/web-sources.js",
  "src/i18n.js",
  "src/locales/en.js",
  "dist",
  "vercel.json",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
])
  await cp(join(root, entry), join(stage, entry), { recursive: true });
const manifest = JSON.parse(
  await readFile(join(root, "desktop/package.json"), "utf8"),
);
manifest.main = "desktop/main.mjs";
await writeFile(join(stage, "package.json"), JSON.stringify(manifest, null, 2));
