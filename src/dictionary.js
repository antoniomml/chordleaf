import { chords, diagram } from "./music.js";
import { PAGE } from "./layout.js";
export function stickerChords(song, sticker) {
  return sticker.chords === "all" ? chords(song.text) : sticker.chords;
}
export function stickerGeometry(song, sticker) {
  const names = stickerChords(song, sticker);
  const width = Math.max(65, Math.min(PAGE.width, sticker.width || 260));
  const columns = Math.max(1, Math.min(names.length, Math.floor(width / 75)));
  const cell = width / columns;
  const height = Math.max(1, Math.ceil(names.length / columns)) * cell * 1.2;
  return { names, width, height, columns, cell };
}
export function stickerSvg(song, sticker) {
  const { names, width, height, columns, cell } = stickerGeometry(
    song,
    sticker,
  );
  const escape = (value) =>
    value.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="color:#222"><rect width="100%" height="100%" fill="#fffef9"/>${names
    .map((name, i) => {
      const shape = song.chordShapes?.[name];
      const svg = diagram(name, 0, shape?.frets);
      return `<g transform="translate(${(i % columns) * cell} ${Math.floor(i / columns) * cell * 1.2})"><text x="${cell / 2}" y="${cell * 0.16}" text-anchor="middle" font-family="monospace" font-size="${cell * 0.15}" font-weight="bold">${escape(name)}${shape?.star && !name.endsWith("*") ? "*" : ""}</text>${svg.startsWith("<svg") ? svg.replace("<svg ", `<svg x="0" y="${cell * 0.2}" width="${cell}" height="${cell}" `) : `<text x="8" y="40" font-size="10">Sin posición</text>`}</g>`;
    })
    .join("")}</svg>`;
}
export async function stickerPng(song, sticker) {
  const { width, height } = stickerGeometry(song, sticker);
  const url = URL.createObjectURL(
    new Blob([stickerSvg(song, sticker)], { type: "image/svg+xml" }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * 3);
    canvas.height = Math.ceil(height * 3);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
