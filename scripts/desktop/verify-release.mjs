// Verify the application actually inside the current installer, not a stale build.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
const root = resolve("release-desktop");
const { version } = JSON.parse(
  await readFile(
    new URL("../../desktop/package.json", import.meta.url),
    "utf8",
  ),
);
const name = `Chordleaf-${version}-mac-arm64.dmg`;
const installer = join(root, name);
const checksums = join(root, "SHA256SUMS.txt");
// A failed attempt must never leave an earlier success file looking current.
await rm(checksums, { force: true });
function check(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0)
    throw new Error("Public release gate failed: " + command);
}
check("hdiutil", ["verify", installer]);
const mount = await mkdtemp(join(tmpdir(), "chordleaf-release-"));
let mounted = false;
try {
  check("hdiutil", [
    "attach",
    "-readonly",
    "-nobrowse",
    "-mountpoint",
    mount,
    installer,
  ]);
  mounted = true;
  const bundle = join(mount, "Chordleaf.app");
  const result = spawnSync(
    "/usr/libexec/PlistBuddy",
    [
      "-c",
      "Print :CFBundleShortVersionString",
      join(bundle, "Contents/Info.plist"),
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0 || result.stdout.trim() !== version)
    throw new Error("Installer application version does not match the release");
  check("codesign", ["--verify", "--deep", "--strict", "--verbose=2", bundle]);
  check("spctl", ["--assess", "--type", "execute", "--verbose=2", bundle]);
  check("xcrun", ["stapler", "validate", bundle]);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(installer)) hash.update(chunk);
  await writeFile(checksums, `${hash.digest("hex")}  ${name}\n`);
  console.log(
    "Current installer contains the signed and notarized application. Hash written.",
  );
} finally {
  if (mounted) check("hdiutil", ["detach", mount]);
  await rm(mount, { recursive: true, force: true });
}
