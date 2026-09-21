import test from "node:test";
import assert from "node:assert/strict";
import {
  createSong,
  songMetadata,
  MAX_FILE_BYTES,
  MAX_TEXT_LENGTH,
} from "../src/song-state.js";
import { importFile, importText } from "../src/files.js";
import handler from "../api/import-web.js";

function response() {
  return {
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    },
  };
}
test("storage cannot inject IDs, numeric fields or arbitrary shape properties", () => {
  const song = createSong({
    id: '\" onclick=\"alert(1)',
    text: null,
    title: {},
    capo: Infinity,
    chordShapes: {
      C: { frets: [0, 3, 2, 0, 1, 0], star: "<img>", unwanted: 1 },
      D: { frets: ["<img>", 0, 0, 0, 0, 0] },
    },
    chordStickers: [{ x: 0, y: 0, width: 100, page: -1, chords: "all" }],
  });
  assert.match(song.id, /^[a-zA-Z0-9-]+$/);
  assert.equal(song.text, "");
  assert.equal(song.title, "");
  assert.equal(song.capo, 0);
  assert.deepEqual(song.chordShapes, {
    C: { frets: [0, 3, 2, 0, 1, 0], star: false },
  });
  assert.deepEqual(song.chordStickers, []);
  assert.doesNotThrow(() => createSong(null));
});
test("valid legacy data and original song text are preserved", () => {
  const text = "a".repeat(MAX_TEXT_LENGTH + 1);
  assert.equal(createSong({ text }).text, text);
  assert.equal(songMetadata(null).chordStickers.length, 0);
});
test("oversized imports are rejected before file decoding", async () => {
  await assert.rejects(importFile({ size: MAX_FILE_BYTES + 1 }), /10 MiB/);
  assert.throws(
    () => importText("a".repeat(MAX_TEXT_LENGTH + 1), "Large"),
    /50.000/,
  );
});
test("Vercel adapter rejects unsupported methods and applies security headers", async () => {
  const res = response();
  await handler({ url: "/api/import-web", method: "POST", headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "GET");
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.match(res.headers["Content-Security-Policy"], /script-src 'self'/);
});
test("web imports require explicit activation on Vercel", async () => {
  const previous = {
    VERCEL: process.env.VERCEL,
    CHORDI_WEB_IMPORT_ENABLED: process.env.CHORDI_WEB_IMPORT_ENABLED,
  };
  process.env.VERCEL = "1";
  delete process.env.CHORDI_WEB_IMPORT_ENABLED;
  try {
    const res = response();
    await handler(
      {
        url: "/api/import-web?url=https://www.cifraclub.com/a/b/",
        method: "GET",
        headers: {},
      },
      res,
    );
    assert.equal(res.statusCode, 503);
    process.env.CHORDI_WEB_IMPORT_ENABLED = "true";
    const crossSite = response();
    await handler(
      {
        url: "/api/import-web",
        method: "GET",
        headers: { "sec-fetch-site": "cross-site" },
      },
      crossSite,
    );
    assert.equal(crossSite.statusCode, 403);
    const tooLong = response();
    await handler(
      {
        url: "/api/import-web?url=" + "x".repeat(4096),
        method: "GET",
        headers: {},
      },
      tooLong,
    );
    assert.equal(tooLong.statusCode, 414);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
