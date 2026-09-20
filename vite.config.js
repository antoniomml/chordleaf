import { defineConfig } from "vite";
import { webImportMiddleware } from "./server/web-import.js";
export default defineConfig({
  plugins: [
    {
      name: "chordi-web-import",
      configureServer(server) {
        server.middlewares.use(webImportMiddleware);
      },
      configurePreviewServer(server) {
        server.middlewares.use(webImportMiddleware);
      },
    },
  ],
});
