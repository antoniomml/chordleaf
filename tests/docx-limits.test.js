import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { Document, Packer, Paragraph } from "docx";
import { validateDocxArchive, MAX_DOCUMENT_BYTES } from "../src/docx-limits.js";

/** Minimal single-disk ZIP writer for adversarial fixtures. */
function buildZip(entries) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = entry.data;
    const method = entry.method ?? 8;
    const flags = entry.flags ?? 0;
    const localExtra = entry.localExtra ?? Buffer.alloc(0);
    const centralExtra = entry.centralExtra ?? Buffer.alloc(0);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(flags, 6);
    header.writeUInt16LE(method, 8);
    header.writeUInt32LE(entry.compressed ?? data.length, 18);
    header.writeUInt32LE(entry.uncompressed ?? data.length, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(localExtra.length, 28);
    local.push(header, name, localExtra, data);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(flags, 8);
    record.writeUInt16LE(method, 10);
    record.writeUInt32LE(entry.compressed ?? data.length, 20);
    record.writeUInt32LE(entry.uncompressed ?? data.length, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt16LE(centralExtra.length, 30);
    record.writeUInt32LE(offset, 42);
    central.push(record, name, centralExtra);
    offset += 30 + name.length + localExtra.length + data.length;
  }
  const directory = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Uint8Array.from(Buffer.concat([...local, directory, eocd])).buffer;
}

async function exportedDocx() {
  const bytes = await Packer.toBuffer(
    new Document({ sections: [{ children: [new Paragraph("Song")] }] }),
  );
  return Uint8Array.from(bytes).buffer;
}

test("DOCX preflight accepts exported documents", async () => {
  await assert.doesNotReject(validateDocxArchive(await exportedDocx()));
});

test("DOCX preflight rejects ZIP64 and data descriptors", async () => {
  const normal = buildZip([
    {
      name: "word/document.xml",
      data: deflateRawSync(Buffer.from("<w:document/>")),
    },
  ]);
  await assert.doesNotReject(validateDocxArchive(normal));
  const descriptor = buildZip([
    {
      name: "word/document.xml",
      data: deflateRawSync(Buffer.from("<w:document/>")),
      flags: 0x8,
    },
  ]);
  await assert.rejects(validateDocxArchive(descriptor));
  const zip64 = buildZip([
    {
      name: "word/document.xml",
      data: deflateRawSync(Buffer.from("<w:document/>")),
      centralExtra: Buffer.from([
        0x01, 0x00, 0x08, 0x00, 0, 0, 0, 0, 0, 0, 0, 0,
      ]),
    },
  ]);
  await assert.rejects(validateDocxArchive(zip64));
  const view = new DataView(normal);
  let directory = -1;
  for (let i = 0; i < view.byteLength - 4; i++)
    if (view.getUint32(i, true) === 0x02014b50) {
      directory = i;
      break;
    }
  view.setUint32(directory + 24, 0xffffffff, true);
  await assert.rejects(validateDocxArchive(normal));
  await assert.rejects(validateDocxArchive(new ArrayBuffer(10)));
});

test("defeats size lies and raw-deflate bombs before mammoth", async () => {
  const bomb = deflateRawSync(Buffer.alloc(MAX_DOCUMENT_BYTES + 1024));
  const lying = buildZip([
    { name: "word/document.xml", data: bomb, uncompressed: 2048 },
  ]);
  await assert.rejects(validateDocxArchive(lying));
  const oversizedStore = buildZip([
    {
      name: "word/document.xml",
      method: 0,
      data: Buffer.alloc(MAX_DOCUMENT_BYTES + 1),
    },
  ]);
  await assert.rejects(validateDocxArchive(oversizedStore));
  const corrupt = buildZip([
    {
      name: "word/document.xml",
      data: Buffer.from("not really deflate data"),
    },
  ]);
  await assert.rejects(validateDocxArchive(corrupt));
});

test("keeps the document at the decoded limit", async () => {
  const atLimit = buildZip([
    {
      name: "word/document.xml",
      data: deflateRawSync(Buffer.alloc(MAX_DOCUMENT_BYTES)),
      uncompressed: 1,
    },
  ]);
  await assert.doesNotReject(validateDocxArchive(atLimit));
  const overLimit = buildZip([
    {
      name: "word/document.xml",
      data: deflateRawSync(Buffer.alloc(MAX_DOCUMENT_BYTES + 1)),
      uncompressed: 1,
    },
  ]);
  await assert.rejects(validateDocxArchive(overLimit));
});

test("without DecompressionStream the declared-size checks still apply", async () => {
  const original = globalThis.DecompressionStream;
  globalThis.DecompressionStream = undefined;
  try {
    await assert.doesNotReject(validateDocxArchive(await exportedDocx()));
    const declaredTooLarge = buildZip([
      {
        name: "word/document.xml",
        data: deflateRawSync(Buffer.from("<w:document/>")),
        uncompressed: 33 * 1024 * 1024,
      },
    ]);
    await assert.rejects(validateDocxArchive(declaredTooLarge));
  } finally {
    globalThis.DecompressionStream = original;
  }
});
