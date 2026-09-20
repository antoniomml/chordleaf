import { songUrl } from "../src/web-sources.js";
const MAX_BYTES = 3 * 1024 * 1024;
export async function fetchSongPage(value, fetcher = fetch) {
  let url = songUrl(value);
  const signal = AbortSignal.timeout(18000);
  for (let redirects = 0; redirects <= 4; redirects++) {
    const response = await fetcher(url.href, {
      redirect: "manual",
      signal,
      headers: {
        Accept: "text/html",
        "User-Agent": "Chordi/0.1.0 (song import)",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      if (!response.headers.get("location"))
        throw new Error("La web devolvió una redirección incompleta.");
      url = songUrl(new URL(response.headers.get("location"), url).href);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(
        `La web no permite descargar esta canción (HTTP ${response.status}). Prueba otro enlace o importa un archivo.`,
      );
    }
    if (!response.headers.get("content-type")?.includes("text/html")) {
      await response.body?.cancel();
      throw new Error("El enlace no es una página de acordes.");
    }
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_BYTES)
          throw new Error("La página es demasiado grande para importarla.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = Buffer.concat(chunks);
    const charset =
      response.headers
        .get("content-type")
        .match(/charset\s*=\s*["']?([\w-]+)/i)?.[1] || "utf-8";
    return { url: url.href, html: new TextDecoder(charset).decode(bytes) };
  }
  throw new Error(
    "La web redirige demasiadas veces. Copia el enlace final de la canción.",
  );
}
export function webImportMiddleware(req, res, next) {
  const request = new URL(req.url, "http://localhost");
  if (request.pathname !== "/api/import-web") return next();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Método no permitido." }));
    return;
  }
  fetchSongPage(request.searchParams.get("url"))
    .then((data) => res.end(JSON.stringify(data)))
    .catch((error) => {
      res.statusCode = 422;
      res.end(
        JSON.stringify({
          error:
            error.name === "TimeoutError"
              ? "La web ha tardado demasiado. Vuelve a intentarlo."
              : error.message,
        }),
      );
    });
}
