import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat, realpath } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { securityHeaders, cacheControlFor } from "./security.js";
import { webImportMiddleware } from "./web-import.js";
const localAudio = process.env.CHORDLEAF_LOCAL_AUDIO === "1";
if (
  localAudio &&
  process.env.HOST &&
  !["127.0.0.1", "::1"].includes(process.env.HOST)
)
  throw new Error("Local audio requires a loopback listening address");
const audioMiddleware = localAudio
  ? (await import("./audio-import.js")).audioImportMiddleware
  : (_req, _res, next) => next();
const root = await realpath(
  process.env.CHORDLEAF_DIST ||
    fileURLToPath(new URL("../dist", import.meta.url)),
);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
};
export const server = createServer((req, res) => {
  if (
    process.env.CHORDLEAF_DESKTOP_TOKEN &&
    req.headers.authorization !==
      `Bearer ${process.env.CHORDLEAF_DESKTOP_TOKEN}`
  ) {
    res.writeHead(403).end();
    return;
  }
  securityHeaders(res);
  audioMiddleware(req, res, () =>
    webImportMiddleware(req, res, async () => {
      try {
        if (!["GET", "HEAD"].includes(req.method)) {
          res.writeHead(405).end();
          return;
        }
        const pathname = decodeURIComponent(
          new URL(req.url, "http://localhost").pathname,
        );
        const file = await realpath(
          resolve(
            root,
            "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
          ),
        );
        if (!file.startsWith(root + sep) || !(await stat(file)).isFile())
          throw new Error("Not found");
        res.setHeader(
          "Content-Type",
          types[extname(file)] || "application/octet-stream",
        );
        res.setHeader("X-Content-Type-Options", "nosniff");
        // The service worker must never be served from a stale cache.
        res.setHeader(
          "Cache-Control",
          pathname === "/sw.js" ? "no-cache" : cacheControlFor(pathname),
        );
        if (req.method === "HEAD") res.end();
        else
          createReadStream(file)
            .on("error", () => res.destroy())
            .pipe(res);
      } catch {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        if (req.method === "HEAD") return res.end();
        createReadStream(resolve(root, "404.html"))
          .on("error", () => res.end("Not found"))
          .pipe(res);
      }
    }),
  );
});
export const ready = new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(
    process.env.PORT === undefined ? 3000 : Number(process.env.PORT),
    process.env.HOST || "127.0.0.1",
    () => {
      resolve(server.address());
      if (!process.env.CHORDLEAF_DESKTOP_TOKEN)
        console.log(
          `Chordleaf: http://${process.env.HOST || "127.0.0.1"}:${server.address().port}`,
        );
    },
  );
});
