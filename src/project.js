import { createSong, MAX_FILE_BYTES, MAX_TEXT_LENGTH } from "./song-state.js";
import { t } from "./i18n.js";

export function projectData(song) {
  const {
    title,
    artist,
    text,
    capo,
    linked,
    fontSize,
    margin,
    columns,
    showBrand,
    chordShapes,
    chordStickers,
  } = song;
  return {
    title,
    artist,
    text,
    capo,
    linked,
    fontSize,
    margin,
    columns,
    showBrand,
    chordShapes,
    chordStickers,
  };
}

export function projectSignature(song) {
  const json = JSON.stringify(projectData(song));
  let a = 2166136261,
    b = 2246822519;
  for (let i = 0; i < json.length; i++) {
    const code = json.charCodeAt(i);
    a = Math.imul(a ^ code, 16777619);
    b = Math.imul(b ^ code, 3266489917);
  }
  return `${json.length}:${(a >>> 0).toString(16)}:${(b >>> 0).toString(16)}`;
}

export function serializeProject(song) {
  return JSON.stringify(
    { format: "chordleaf-song", version: 1, song: projectData(song) },
    null,
    2,
  );
}

export function restoreProject(text) {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    throw new Error(t("El proyecto supera el límite de 10 MiB."));
  const data = JSON.parse(text);
  if (
    data?.format !== "chordleaf-song" ||
    data.version !== 1 ||
    !data.song ||
    typeof data.song.text !== "string" ||
    data.song.text.length > MAX_TEXT_LENGTH
  )
    throw new Error(t("El proyecto no es compatible o está dañado."));
  const song = createSong({ ...data.song, id: crypto.randomUUID() });
  song.projectSignature = projectSignature(song);
  song.dirty = false;
  return song;
}
