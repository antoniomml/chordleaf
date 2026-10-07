import { metadataPlugin } from "./build/metadata.js";
import { pwaPlugin } from "./build/pwa.js";
import { audioRuntimePlugin } from "./build/audio-runtime.js";
import { defineConfig } from "vite";
import { webImportMiddleware } from "./server/web-import.js";
import { audioImportMiddleware } from "./server/audio-import.js";
import { createReadStream } from "node:fs";
import { resolve, sep } from "node:path";
const site = process.env.SITE_URL ? new URL(process.env.SITE_URL) : null;
if (
  site &&
  (site.protocol !== "https:" ||
    site.username ||
    site.password ||
    site.pathname !== "/" ||
    site.search ||
    site.hash)
)
  throw new Error(
    "SITE_URL must be a public HTTPS origin without a path, query or credentials.",
  );
export default defineConfig({
  worker: { plugins: () => [audioRuntimePlugin()] },
  server: {
    hmr: process.env.CHORDLEAF_AUDIO_RESEARCH === "1" ? false : undefined,
    watch: {
      ignored: ["**/artifacts/**", "**/release-desktop/**", "**/.venv/**"],
    },
  },
  plugins: [
    metadataPlugin(site),
    pwaPlugin(),
    audioRuntimePlugin(),
    {
      name: "chordleaf-web-import",
      configureServer(server) {
        if (process.env.CHORDLEAF_AUDIO_RESEARCH === "1") {
          const host = server.config.server.host;
          if (host && !["127.0.0.1", "localhost", "::1"].includes(host))
            throw new Error(
              "Private audio research requires a loopback address",
            );
          const root = resolve("artifacts/browser-audio");
          server.middlewares.use("/__audio-research", (req, res) => {
            const path = resolve(
              root,
              "." +
                decodeURIComponent(
                  new URL(req.url, "http://localhost").pathname,
                ),
            );
            if (!path.startsWith(root + sep)) return res.writeHead(403).end();
            res.setHeader(
              "Content-Type",
              path.endsWith(".json")
                ? "application/json"
                : "application/octet-stream",
            );
            createReadStream(path)
              .on("error", () => res.writeHead(404).end())
              .pipe(res);
          });
        }
        server.middlewares.use(audioImportMiddleware);
        server.middlewares.use(webImportMiddleware);
      },
      configurePreviewServer(server) {
        server.middlewares.use(audioImportMiddleware);
        server.middlewares.use(webImportMiddleware);
      },
    },
  ],
});
