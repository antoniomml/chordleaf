// A public release must be signed, notarized, and stapled; a local beta is not one.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const root = resolve("release-desktop");
const bundle = join(root, "mac-arm64/Chordleaf.app");
for (const [command, args] of [
  ["codesign", ["--verify", "--deep", "--strict", "--verbose=2", bundle]],
  ["spctl", ["--assess", "--type", "execute", "--verbose=2", bundle]],
  ["xcrun", ["stapler", "validate", bundle]],
]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0)
    throw new Error("Public release gate failed: " + command);
}
const files = (await readdir(root)).filter((name) => name.endsWith(".dmg"));
if (!files.length) throw new Error("No installer found");
const lines = [];
for (const name of files) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(join(root, name)))
    hash.update(chunk);
  lines.push(`${hash.digest("hex")}  ${name}`);
}
await writeFile(join(root, "SHA256SUMS.txt"), lines.join("\n") + "\n");
console.log(
  "Signed and notarized application verified. Installer hashes written.",
);
