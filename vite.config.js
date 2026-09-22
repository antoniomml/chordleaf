import { metadataPlugin } from "./build/metadata.js";
import { defineConfig } from "vite";
import { webImportMiddleware } from "./server/web-import.js";
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
  plugins: [
    metadataPlugin(site),
    {
      name: "chordleaf-web-import",
      configureServer(server) {
        server.middlewares.use(webImportMiddleware);
      },
      configurePreviewServer(server) {
        server.middlewares.use(webImportMiddleware);
      },
    },
  ],
});
