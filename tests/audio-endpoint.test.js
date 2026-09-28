import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { audioImportMiddleware } from "../server/audio-import.js";

test("local audio endpoint is opt-in and rejects cross-origin and oversized uploads", async () => {
  const original = process.env.CHORDLEAF_AUDIO_PYTHON;
  delete process.env.CHORDLEAF_AUDIO_PYTHON;
  const server = createServer((req, res) =>
    audioImportMiddleware(req, res, () => res.writeHead(404).end()),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/audio-import`;
  const rawStatus = (headers, method = "GET") =>
    new Promise((resolve, reject) => {
      const req = request(url, { headers, method }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on("error", reject);
      req.end();
    });
  try {
    assert.deepEqual(await (await fetch(url)).json(), { available: false });
    assert.equal((await fetch(url, { method: "POST" })).status, 503);
    assert.equal(
      (await fetch(url, { headers: { Origin: "https://example.com" } })).status,
      403,
    );
    assert.equal(await rawStatus({ Host: "example.com" }), 403);
    process.env.CHORDLEAF_AUDIO_PYTHON = "/nonexistent/experiment-python";
    assert.equal(
      await rawStatus(
        {
          "Content-Length": 31 * 1024 * 1024,
          "Content-Type": "application/octet-stream",
        },
        "POST",
      ),
      413,
    );
    assert.equal(
      (await fetch(url, { method: "POST", body: "test" })).status,
      415,
    );
    assert.deepEqual(await (await fetch(url)).json(), {
      available: false,
      reason: "runtime",
    });
    const invalidEngine = await fetch(`${url}?lyricsEngine=unknown`, {
      method: "POST",
    });
    assert.equal(invalidEngine.status, 400);
    assert.deepEqual(await invalidEngine.json(), { error: "lyrics-engine" });
    // Invalid runtime failures return a controlled response and release the slot.
    for (let i = 0; i < 2; i++) {
      const response = await fetch(url, {
        method: "POST",
        body: "invalid audio",
        headers: { "Content-Type": "application/octet-stream" },
      });
      assert.equal(response.status, 422);
      assert.deepEqual(await response.json(), { error: "analysis" });
    }
  } finally {
    if (original === undefined) delete process.env.CHORDLEAF_AUDIO_PYTHON;
    else process.env.CHORDLEAF_AUDIO_PYTHON = original;
    await new Promise((resolve) => server.close(resolve));
  }
});
