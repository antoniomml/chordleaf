import test from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph } from "docx";
import { validateDocxArchive } from "../src/docx-limits.js";
test("DOCX preflight accepts exported documents and rejects expansion bombs", async () => {
  const bytes = await Packer.toBuffer(
    new Document({ sections: [{ children: [new Paragraph("Song")] }] }),
  );
  const buffer = Uint8Array.from(bytes).buffer;
  assert.doesNotThrow(() => validateDocxArchive(buffer));
  const view = new DataView(buffer);
  let central;
  for (let i = 0; i < bytes.length - 4; i++)
    if (view.getUint32(i, true) === 0x02014b50) {
      central = i;
      break;
    }
  view.setUint32(central + 24, 0xffffffff, true);
  assert.throws(() => validateDocxArchive(buffer));
  assert.throws(() => validateDocxArchive(new ArrayBuffer(10)));
});
