import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { audioImportMiddleware } from "../server/audio-import.js";
import { mkdtemp, readFile, writeFile, stat, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";

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

test("shutdown terminates inference and waits for temporary audio removal", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "chordleaf-shutdown-test-"));
  const marker = join(scratch, "started.json");
  const script = join(scratch, "analyze.py");
  await writeFile(
    script,
    `const fs = require('node:fs');
fs.writeFileSync(${JSON.stringify(marker)}, JSON.stringify({pid: process.pid, directory: process.env.CHORDLEAF_AUDIO_TMPDIR, args: process.argv.slice(2)}));
setInterval(() => {}, 1000);`,
  );
  const original = process.env.CHORDLEAF_AUDIO_PYTHON;
  process.env.CHORDLEAF_AUDIO_PYTHON = process.execPath;
  // Load the analyzer with a controlled worker; keep the public module unchanged.
  const previousScripts = process.env.CHORDLEAF_AUDIO_SCRIPTS;
  process.env.CHORDLEAF_AUDIO_SCRIPTS = scratch;
  const controlled = await import(
    `../server/audio-import.js?shutdown=${Date.now()}`
  );
  const server = createServer((req, res) =>
    controlled.audioImportMiddleware(req, res, () => res.writeHead(404).end()),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let pending;
  try {
    pending = fetch(
      `http://127.0.0.1:${server.address().port}/api/audio-import?language=fr`,
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: "private test audio",
      },
    );
    let worker;
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try {
        worker = JSON.parse(await readFile(marker, "utf8"));
        break;
      } catch {
        await delay(20);
      }
    }
    assert.ok(worker, "the inference worker must start");
    assert.deepEqual(worker.args.slice(-2), ["--language", "fr"]);
    assert.equal((await stat(join(worker.directory, "input"))).isFile(), true);
    await controlled.shutdownAudioJobs();
    assert.equal((await pending).status, 422);
    await assert.rejects(stat(worker.directory), { code: "ENOENT" });
    assert.throws(() => process.kill(worker.pid, 0), { code: "ESRCH" });
  } finally {
    server.closeAllConnections();
    await controlled.shutdownAudioJobs();
    await pending?.catch(() => {});
    await new Promise((resolve) => server.close(resolve));
    if (original === undefined) delete process.env.CHORDLEAF_AUDIO_PYTHON;
    else process.env.CHORDLEAF_AUDIO_PYTHON = original;
    if (previousScripts === undefined)
      delete process.env.CHORDLEAF_AUDIO_SCRIPTS;
    else process.env.CHORDLEAF_AUDIO_SCRIPTS = previousScripts;
    await rm(scratch, { recursive: true, force: true });
  }
});
