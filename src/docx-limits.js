import { t } from "./i18n.js";

/** Reject oversized ZIP declarations before handing a DOCX to its decoder.
 * This is a resource limit, not a complete sandbox for malicious archives. */
export function validateDocxArchive(buffer) {
  const view = new DataView(buffer);
  const reject = () => {
    throw new Error(
      t("El documento Word está dañado o supera los límites de descompresión."),
    );
  };
  let end = -1;
  for (
    let offset = view.byteLength - 22;
    offset >= Math.max(0, view.byteLength - 65557);
    offset--
  ) {
    if (
      view.getUint32(offset, true) === 0x06054b50 &&
      offset + 22 + view.getUint16(offset + 20, true) === view.byteLength
    ) {
      end = offset;
      break;
    }
  }
  if (end < 0) reject();
  const entries = view.getUint16(end + 10, true);
  const size = view.getUint32(end + 12, true);
  let cursor = view.getUint32(end + 16, true);
  if (
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true) ||
    view.getUint16(end + 8, true) !== entries ||
    entries > 2000 ||
    cursor + size !== end
  )
    reject();
  let expanded = 0;
  for (let i = 0; i < entries; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50)
      reject();
    expanded += view.getUint32(cursor + 24, true);
    if (expanded > 32 * 1024 * 1024 || view.getUint16(cursor + 8, true) & 1)
      reject();
    cursor +=
      46 +
      view.getUint16(cursor + 28, true) +
      view.getUint16(cursor + 30, true) +
      view.getUint16(cursor + 32, true);
  }
  if (cursor !== end) reject();
}
