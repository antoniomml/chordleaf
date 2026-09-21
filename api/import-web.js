import { webImportMiddleware } from "../server/web-import.js";

// Await the shared handler so the function stays alive until the download ends.
export default async function handler(req, res) {
  return webImportMiddleware(req, res, () => {
    res.statusCode = 404;
    res.end();
  });
}
