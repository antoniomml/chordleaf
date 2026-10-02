import { createSong, MAX_FILE_BYTES, MAX_TEXT_LENGTH } from "./song-state.js";
import { t } from "./i18n.js";

export function serializeWorkspace(songs, active, recent = []) {
  const text = JSON.stringify(
    { format: "chordleaf-workspace", version: 1, active, songs, recent },
    null,
    2,
  );
  // Never offer a successful download that our importer cannot reopen.
  validateWorkspace(text);
  return text;
}

function validateWorkspace(text) {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    throw new Error(t("La copia supera el límite de 10 MiB."));
  const data = JSON.parse(text);
  if (
    !["chordleaf-workspace", "chordi-workspace"].includes(data?.format) ||
    data.version !== 1 ||
    !Array.isArray(data.songs) ||
    !data.songs.every(
      (s) => s && typeof s === "object" && typeof s.text === "string",
    )
  )
    throw new Error(t("La copia no es compatible o está dañada."));
  const recent = data.recent === undefined ? [] : data.recent;
  if (
    !Array.isArray(recent) ||
    !recent.every(
      (entry) =>
        entry &&
        typeof entry.song?.text === "string" &&
        Number.isFinite(entry.closedAt),
    )
  )
    throw new Error(t("La copia no es compatible o está dañada."));
  const all = [...data.songs, ...recent.map((entry) => entry.song)];
  if (!all.length || all.length > 500)
    throw new Error(
      t(
        "La copia debe contener entre 1 y 500 canciones. Descarga proyectos individuales para conservar el resto.",
      ),
    );
  if (all.some((song) => song.text.length > MAX_TEXT_LENGTH))
    throw new Error(
      t(
        "La copia contiene una canción de más de 50.000 caracteres. Divídela antes de restaurarla.",
      ),
    );
  return { ...data, recent };
}

export function restoreWorkspace(text) {
  const data = validateWorkspace(text);
  // Merge as new tabs: never replace existing work, even when IDs overlap.
  const songs = data.songs.map((s) =>
    createSong({
      ...s,
      id: crypto.randomUUID(),
      dirty: true,
      pdfExported: false,
    }),
  );
  const index = data.songs.findIndex((s) => s.id === data.active);
  const recent = data.recent.map((entry) => ({
    song: createSong({
      ...entry.song,
      id: crypto.randomUUID(),
      dirty: true,
      pdfExported: false,
    }),
    closedAt: entry.closedAt,
  }));
  return { songs, recent, active: songs[Math.max(0, index)]?.id ?? null };
}
