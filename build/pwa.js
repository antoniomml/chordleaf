import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

function publicFiles(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = `${prefix}${entry.name}`;
    return entry.isDirectory()
      ? publicFiles(path.join(directory, entry.name), `${name}/`)
      : [name];
  });
}

export function pwaPlugin() {
  return {
    name: "chordleaf-offline-build",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const template = readFileSync(
          new URL("./service-worker.js", import.meta.url),
          "utf8",
        );
        const packageJson = JSON.parse(
          readFileSync(path.join(root, "package.json"), "utf8"),
        );
        let commit = process.env.VERCEL_GIT_COMMIT_SHA;
        if (!commit) {
          try {
            commit = execFileSync("git", ["rev-parse", "HEAD"], {
              cwd: root,
              encoding: "utf8",
            }).trim();
          } catch {
            commit = null;
          }
        }
        const release = JSON.stringify({
          version: packageJson.version,
          commit,
        });
        const resources = new Map([
          ["/", bundle["index.html"].source],
          ["/en/", bundle["en/index.html"].source],
          ["/es/", bundle["es/index.html"].source],
          ["/release.json", release],
        ]);
        // Cache lazy libraries and workers too: exporting offline must not
        // require first having exported once with an Internet connection.
        for (const [name, output] of Object.entries(bundle)) {
          if (name.startsWith("assets/"))
            resources.set(`/${name}`, output.code ?? output.source);
        }
        for (const name of publicFiles(path.join(root, "public"))) {
          if (
            name.startsWith("fonts/") ||
            name.startsWith("icons/") ||
            name.startsWith("licenses/") ||
            ["logo.svg", "manifest.webmanifest"].includes(name)
          )
            resources.set(
              `/${name}`,
              readFileSync(path.join(root, "public", name)),
            );
        }
        const entries = [...resources].sort(([a], [b]) => a.localeCompare(b));
        const hash = createHash("sha256").update(template);
        for (const [url, content] of entries)
          hash.update(url).update("\0").update(content).update("\0");
        const cache = `chordleaf-${hash.digest("hex").slice(0, 16)}`;
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: template
            .replace("__CHORDLEAF_CACHE_VERSION__", cache)
            .replace(
              "__CHORDLEAF_PRECACHE__",
              JSON.stringify(entries.map(([url]) => url)),
            ),
        });
        this.emitFile({
          type: "asset",
          fileName: "release.json",
          source: release,
        });
      },
    },
  };
}
