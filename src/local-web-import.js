import { parseWebSong } from "./web-import.js";
import { songUrl } from "./web-sources.js";
import { MAX_FILE_BYTES } from "./song-state.js";
import { t } from "./i18n.js";
import { readWebMarkup } from "./web-markup.js";

function sourceFromMarkup(root, sourceUrl) {
  const candidates = [
    sourceUrl,
    root.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    root.querySelector('meta[property="og:url"]')?.getAttribute("content"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return songUrl(candidate).href;
    } catch {
      // Metadata in local files is untrusted too.
    }
  }
  return null;
}

export function parseSavedWebPage(html, sourceUrl = "") {
  const root = readWebMarkup(html);
  const source = sourceFromMarkup(root, sourceUrl);
  if (!source)
    throw new Error(
      t(
        "Pega el enlace original de Cifra Club, LaCuerda o Ultimate Guitar antes de abrir el HTML.",
      ),
    );
  return parseWebSong(html, source);
}

export async function importSavedWebPage(file, sourceUrl, { signal } = {}) {
  signal?.throwIfAborted();
  if (file.size > MAX_FILE_BYTES)
    throw new Error(t("El archivo es demasiado grande. El límite es 10 MiB."));
  if (!/\.html?$/i.test(file.name))
    throw new Error(
      t("Selecciona la página guardada como HTML (.html o .htm)."),
    );
  const html = await file.text();
  signal?.throwIfAborted();
  return parseSavedWebPage(html, sourceUrl);
}
