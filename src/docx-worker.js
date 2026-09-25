import mammoth from "mammoth";
import { validateDocxArchive } from "./docx-limits.js";

self.onmessage = async ({ data }) => {
  try {
    await validateDocxArchive(data);
    const result = await mammoth.convertToHtml(
      { arrayBuffer: data },
      {
        ignoreEmptyParagraphs: false,
        // The song importer reads text only. Never decode embedded images.
        convertImage: mammoth.images.imgElement(() => ({ src: "" })),
      },
    );
    if (result.value.length > 2 * 1024 * 1024)
      throw new Error("El documento Word contiene demasiado texto o formato.");
    self.postMessage({ html: result.value });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
