import { createSong, MAX_FILE_BYTES } from "./song-state.js";
import { t } from "./i18n.js";

export function serializeWorkspace(songs, active) {
  return JSON.stringify(
    { format: "chordi-workspace", version: 1, active, songs },
    null,
    2,
  );
}

export function restoreWorkspace(text) {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    throw new Error(t("La copia supera el límite de 10 MiB."));
  const data = JSON.parse(text);
  if (
    data?.format !== "chordi-workspace" ||
    data.version !== 1 ||
    !Array.isArray(data.songs) ||
    !data.songs.length ||
    data.songs.length > 500 ||
    !data.songs.every(
      (s) => s && typeof s === "object" && typeof s.text === "string",
    )
  )
    throw new Error(t("La copia no es compatible o está dañada."));
  // Merge as new tabs: never replace existing work, even when IDs overlap.
  const songs = data.songs.map((s) =>
    createSong({ ...s, id: crypto.randomUUID(), dirty: true }),
  );
  const index = data.songs.findIndex((s) => s.id === data.active);
  return { songs, active: songs[Math.max(0, index)].id };
}
