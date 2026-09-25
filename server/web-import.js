import { securityHeaders } from "./security.js";
import { LACUERDA_HOSTS, songUrl } from "../src/web-sources.js";
const MAX_BYTES = 3 * 1024 * 1024;
const GENERIC_ERROR = "No se pudo descargar la canción.";
const TIMEOUT_ERROR = "La web ha tardado demasiado. Vuelve a intentarlo.";
/** Fixed copy that the client can translate; only the server logs details. */
class ImportError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ImportError";
    this.publicMessage = message;
  }
}
export function publicImportError(error) {
  if (error?.name === "TimeoutError" || error?.name === "AbortError")
    return TIMEOUT_ERROR;
  if (typeof error?.publicMessage === "string") return error.publicMessage;
  return GENERIC_ERROR;
}
export async function fetchSongPage(value, fetcher = fetch) {
  let url;
  try {
    url = songUrl(value);
  } catch {
    throw new ImportError(
      "Usa un enlace HTTPS de Cifra Club, LaCuerda o Ultimate Guitar.",
    );
  }
  const signal = AbortSignal.timeout(18000);
  for (let redirects = 0; redirects <= 4; redirects++) {
    const response = await fetcher(url.href, {
      redirect: "manual",
      signal,
      headers: {
        Accept: "text/html, text/plain;q=0.9",
        "User-Agent": "Chordleaf/0.6.0 (song import)",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      if (!response.headers.get("location"))
        throw new ImportError("La web devolvió una redirección incompleta.");
      let next;
      try {
        next = songUrl(new URL(response.headers.get("location"), url).href);
      } catch {
        throw new ImportError(
          "Usa un enlace HTTPS de Cifra Club, LaCuerda o Ultimate Guitar.",
        );
      }
      url = next;
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new ImportError(
        `La web no permite descargar esta canción (HTTP ${response.status}). Prueba otro enlace o importa un archivo.`,
      );
    }
    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !(LACUERDA_HOSTS.has(url.hostname) && contentType.includes("text/plain"))
    ) {
      await response.body?.cancel();
      throw new ImportError("El enlace no es una página de acordes.");
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
          throw new ImportError(
            "La página es demasiado grande para importarla.",
          );
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = Buffer.concat(chunks);
    const charset =
      contentType.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1] || "utf-8";
    return {
      url: url.href,
      html: new TextDecoder(charset).decode(bytes),
      contentType: contentType.split(";")[0].trim().toLowerCase(),
    };
  }
  throw new ImportError(
    "La web redirige demasiadas veces. Copia el enlace final de la canción.",
  );
}
export async function webImportMiddleware(req, res, next) {
  if (req.url?.split("?", 1)[0] !== "/api/import-web") return next();
  securityHeaders(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Método no permitido." }));
    return;
  }
  // Public Vercel imports stay off until the operator configures WAF limits.
  const enabled =
    process.env.CHORDLEAF_WEB_IMPORT_ENABLED ??
    process.env.CHORDI_WEB_IMPORT_ENABLED;
  if (enabled === "false" || (process.env.VERCEL && enabled !== "true")) {
    res.statusCode = 503;
    res.end(
      JSON.stringify({
        error:
          "La importación web no está disponible. Importa un archivo o pega el texto.",
      }),
    );
    return;
  }
  if (req.headers?.["sec-fetch-site"] === "cross-site") {
    res.statusCode = 403;
    res.end(
      JSON.stringify({ error: "Abre Chordleaf para importar una canción." }),
    );
    return;
  }
  if (req.url.length > 4096) {
    res.statusCode = 414;
    res.end(JSON.stringify({ error: "El enlace es demasiado largo." }));
    return;
  }
  const request = new URL(req.url, "http://localhost");
  try {
    const data = await fetchSongPage(request.searchParams.get("url"));
    const body = JSON.stringify(data);
    // JSON escaping can make a 3 MiB HTML page exceed Vercel's response limit.
    if (Buffer.byteLength(body) > 4 * 1024 * 1024)
      throw new ImportError("La página es demasiado grande para importarla.");
    res.end(body);
  } catch (error) {
    const target = (request.searchParams.get("url") || "").replace(
      /[\r\n\t]/g,
      " ",
    );
    // Keep the literal first so a crafted URL cannot act as a format string.
    console.error("[web-import]", target.slice(0, 500), error);
    res.statusCode = 422;
    res.end(JSON.stringify({ error: publicImportError(error) }));
  }
}
