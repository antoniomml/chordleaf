import { chords, diagram } from "./music.js";
import { PAGE } from "./layout.js";
export function stickerChords(song, sticker) {
  return sticker.chords === "all" ? chords(song.text) : sticker.chords;
}
export const MIN_STICKER_WIDTH = 28;
export const MIN_STICKER_HEIGHT = 28;
export function stickerGeometry(song, sticker) {
  const names = stickerChords(song, sticker);
  const width = Math.max(
    MIN_STICKER_WIDTH,
    Math.min(PAGE.width, sticker.width || 260),
  );
  // Legacy documents keep their original column count when first opened.
  const columns = Math.max(
    1,
    Math.min(
      names.length || 1,
      Number.isInteger(sticker.columns)
        ? sticker.columns
        : Math.floor(width / 75),
    ),
  );
  const rows = Math.max(1, Math.ceil(names.length / columns));
  const height = Math.max(
    MIN_STICKER_HEIGHT,
    Math.min(
      PAGE.height,
      Number.isFinite(sticker.height)
        ? sticker.height
        : rows * (width / columns) * 1.2,
    ),
  );
  const cellWidth = width / columns,
    rowHeight = height / rows;
  // Independent frame dimensions, but undistorted diagrams inside each cell.
  const cell = Math.min(cellWidth, rowHeight / 1.2);
  return { names, width, height, columns, rows, cell, cellWidth, rowHeight };
}
export function stickerSvg(song, sticker) {
  const { names, width, height, columns, cell, cellWidth, rowHeight } =
    stickerGeometry(song, sticker);
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="color:#000"><rect width="100%" height="100%" fill="#fff"/>${names
    .map((name, i) => {
      const shape = song.chordShapes?.[name];
      const svg = diagram(name, 0, shape?.frets, { ink: "#000" });
      return `<g transform="translate(${(i % columns) * cellWidth + (cellWidth - cell) / 2} ${Math.floor(i / columns) * rowHeight + (rowHeight - cell * 1.2) / 2})"><text x="${cell / 2}" y="${cell * 0.16}" text-anchor="middle" font-family="monospace" font-size="${cell * 0.15}" font-weight="bold">${escape(name)}${shape?.star && !name.endsWith("*") ? "*" : ""}</text>${svg.startsWith("<svg") ? svg.replace("<svg ", `<svg x="0" y="${cell * 0.2}" width="${cell}" height="${cell}" `) : `<text x="8" y="40" font-size="10">Sin posición</text>`}</g>`;
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
