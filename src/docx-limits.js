import { t } from "./i18n.js";

/** Decoded `word/document.xml` bytes allowed before mammoth sees the archive. */
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
/** Declared expansion allowed across every entry of the archive. */
export const MAX_DECLARED_BYTES = 32 * 1024 * 1024;
const MAX_ENTRIES = 2000;
const DOCUMENT_PATH = "word/document.xml";
const DEFLATE = 8;
const STORED = 0;

function damaged() {
  return new Error(
    t("El documento Word está dañado o supera los límites de descompresión."),
  );
}

function findEnd(view) {
  for (
    let offset = view.byteLength - 22;
    offset >= Math.max(0, view.byteLength - 65557);
    offset--
  )
    if (
      view.getUint32(offset, true) === 0x06054b50 &&
      offset + 22 + view.getUint16(offset + 20, true) === view.byteLength
    )
      return offset;
  return -1;
}

function hasZip64Extra(view, start, length, limit) {
  let cursor = start;
  while (cursor + 4 <= Math.min(start + length, limit)) {
    const tag = view.getUint16(cursor, true);
    if (tag === 0x0001) return true;
    cursor += 4 + view.getUint16(cursor + 2, true);
  }
  return false;
}

/** Inflate raw deflate bytes while counting output. Returns the decoded size,
 * or null when the platform has no DecompressionStream to enforce it. */
async function inflateSize(bytes) {
  let decompression;
  try {
    decompression = new DecompressionStream("deflate-raw");
  } catch {
    return null;
  }
  const reader = new Blob([bytes])
    .stream()
    .pipeThrough(decompression)
    .getReader();
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_DOCUMENT_BYTES) {
        await reader.cancel().catch(() => {});
        break;
      }
    }
  } catch {
    throw damaged();
  }
  return total;
}

/** Reject ZIP64, data-descriptor and encrypted entries, cap declared sizes and
 * inflate `word/document.xml` to reject bombs before mammoth decodes them. */
export async function validateDocxArchive(buffer) {
  const view = new DataView(buffer);
  const end = findEnd(view);
  if (end < 0) throw damaged();
  const entries = view.getUint16(end + 10, true);
  const size = view.getUint32(end + 12, true);
  let cursor = view.getUint32(end + 16, true);
  if (
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true) ||
    view.getUint16(end + 8, true) !== entries ||
    entries === 0xffff ||
    size === 0xffffffff ||
    cursor === 0xffffffff ||
    entries > MAX_ENTRIES ||
    cursor + size !== end
  )
    throw damaged();
  let expanded = 0;
  let document = null;
  const decode = (offset, length) =>
    new TextDecoder().decode(
      new Uint8Array(view.buffer, view.byteOffset + offset, length),
    );
  for (let i = 0; i < entries; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50)
      throw damaged();
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressed = view.getUint32(cursor + 20, true);
    const uncompressed = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const after = cursor + 46 + nameLength + extraLength + commentLength;
    if (
      after > end ||
      flags & 0x1 ||
      flags & 0x8 ||
      view.getUint16(cursor + 34, true) ||
      compressed === 0xffffffff ||
      uncompressed === 0xffffffff ||
      view.getUint32(cursor + 42, true) === 0xffffffff ||
      hasZip64Extra(view, cursor + 46 + nameLength, extraLength, end)
    )
      throw damaged();
    expanded += uncompressed;
    if (expanded > MAX_DECLARED_BYTES) throw damaged();
    const name = decode(cursor + 46, nameLength);
    if (name === DOCUMENT_PATH)
      document = {
        name,
        method,
        compressed,
        localOffset: view.getUint32(cursor + 42, true),
      };
    cursor = after;
  }
  if (cursor !== end || !document) return;
  // The local header points to the real payload; declared sizes can lie.
  if (
    document.localOffset + 30 > end ||
    view.getUint32(document.localOffset, true) !== 0x04034b50
  )
    throw damaged();
  const localFlags = view.getUint16(document.localOffset + 6, true);
  if (localFlags & 0x1 || localFlags & 0x8) throw damaged();
  const nameLength = view.getUint16(document.localOffset + 26, true);
  const extraLength = view.getUint16(document.localOffset + 28, true);
  const dataStart = document.localOffset + 30 + nameLength + extraLength;
  if (
    dataStart + document.compressed > end ||
    decode(document.localOffset + 30, nameLength) !== document.name ||
    hasZip64Extra(
      view,
      document.localOffset + 30 + nameLength,
      extraLength,
      end,
    )
  )
    throw damaged();
  if (document.method === STORED) {
    if (document.compressed > MAX_DOCUMENT_BYTES) throw damaged();
    return;
  }
  if (document.method !== DEFLATE) throw damaged();
  const expandedSize = await inflateSize(
    new Uint8Array(
      view.buffer,
      view.byteOffset + dataStart,
      document.compressed,
    ),
  );
  if (expandedSize !== null && expandedSize > MAX_DOCUMENT_BYTES)
    throw damaged();
}
