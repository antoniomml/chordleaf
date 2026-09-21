import { t } from "./i18n.js";
// Self-hosted OFL font: the same family is used on paper and on screen.
export const DOCUMENT_FONT = "Google Sans Code";
let binaries;
export function fontBinaries() {
  return (binaries ??= Promise.all(
    ["Regular", "Bold"].map(async (style) => {
      const response = await fetch(`/fonts/GoogleSansCode-${style}.ttf`);
      if (!response.ok)
        throw new Error(t("No se pudo cargar la fuente del documento."));
      return new Uint8Array(await response.arrayBuffer());
    }),
  ).catch((error) => {
    binaries = undefined;
    throw error;
  }));
}
export async function registerPdfFonts(pdf) {
  const fonts = await fontBinaries();
  fonts.forEach((bytes, i) => {
    let binary = "";
    for (let at = 0; at < bytes.length; at += 8192)
      binary += String.fromCharCode(...bytes.subarray(at, at + 8192));
    const name = `GoogleSansCode-${i ? "Bold" : "Regular"}.ttf`;
    pdf.addFileToVFS(name, btoa(binary));
    pdf.addFont(name, "GoogleSansCode", i ? "bold" : "normal");
  });
}
