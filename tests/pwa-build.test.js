import test from "node:test";
import assert from "node:assert/strict";
import { pwaPlugin } from "../build/pwa.js";
import { runInNewContext } from "node:vm";

function generate(code) {
  const result = {};
  pwaPlugin().generateBundle.handler.call(
    {
      emitFile({ fileName, source }) {
        result[fileName] = source;
      },
    },
    {},
    {
      "index.html": { source: "<html>English</html>" },
      "en/index.html": { source: "<html>English</html>" },
      "es/index.html": { source: "<html>Español</html>" },
      "assets/editor.js": { code },
      "assets/lazy-export.js": { code: "export default 1" },
      "assets/editor.css": { source: "body{}" },
      "assets/pdf.worker.mjs": { source: "self.onmessage=()=>{}" },
      "assets/ort-wasm-runtime.wasm": { source: "large runtime" },
      "assets/ort-wasm-runtime.mjs": { source: "runtime loader" },
    },
  );
  return result;
}

test("offline builds are deterministic and change the cache when resources change", () => {
  const first = generate("export default 1");
  assert.equal(first["sw.js"], generate("export default 1")["sw.js"]);
  const cache = (output) =>
    output["sw.js"].match(/const CACHE_VERSION = "([^"]+)"/)[1];
  assert.notEqual(cache(first), cache(generate("export default 2")));
  const paths = JSON.parse(
    first["sw.js"].match(/const SHELL = (\[[^;]+\]);/)[1],
  );
  for (const resource of [
    "/",
    "/en/",
    "/es/",
    "/assets/editor.js",
    "/assets/lazy-export.js",
    "/assets/pdf.worker.mjs",
    "/assets/editor.css",
    "/fonts/GoogleSansCode-Bold.ttf",
  ])
    assert.ok(paths.includes(resource), `${resource} must be precached`);
  assert.ok(!paths.some((resource) => resource.startsWith("/api/")));
  assert.ok(
    !paths.some((resource) => resource.includes("ort-wasm-")),
    "model runtime download requires explicit setup",
  );
  assert.ok(!paths.some((resource) => resource.startsWith("/models/")));
  assert.ok(JSON.parse(first["release.json"]).version);
});

test("PWA activation preserves downloaded audio models while removing the old shell", async () => {
  const source = generate("export default 1")["sw.js"];
  const current = source.match(/const CACHE_VERSION = "([^"]+)"/)[1];
  const handlers = {},
    removed = [];
  let work;
  runInNewContext(source, {
    self: {
      addEventListener(name, handler) {
        handlers[name] = handler;
      },
      clients: { claim: async () => {} },
    },
    caches: {
      keys: async () => [
        "chordleaf-old-shell",
        current,
        "chordleaf-audio-models-v1",
      ],
      delete: async (key) => removed.push(key),
    },
  });
  handlers.activate({
    waitUntil(promise) {
      work = promise;
    },
  });
  await work;
  assert.deepEqual(removed, ["chordleaf-old-shell"]);
});

test("offline readiness checks the active worker's cache and exact requested build", async () => {
  const source = generate("export default 1")["sw.js"];
  const paths = JSON.parse(source.match(/const SHELL = (\[[^;]+\]);/)[1]);
  const handlers = {};
  let cached = true;
  runInNewContext(source, {
    URL,
    self: {
      location: { origin: "https://chordleaf.com" },
      addEventListener(name, handler) {
        handlers[name] = handler;
      },
    },
    caches: {
      open: async () => ({
        keys: async () =>
          paths
            .filter((path) => cached || path !== "/assets/lazy-export.js")
            .map((path) => ({ url: `https://chordleaf.com${path}` })),
      }),
    },
  });
  async function readiness(asset) {
    let work, result;
    handlers.message({
      data: { type: "CHORDLEAF_OFFLINE_STATUS", asset },
      ports: [
        {
          postMessage(value) {
            result = value.ready;
          },
        },
      ],
      waitUntil(promise) {
        work = promise;
      },
    });
    await work;
    return result;
  }
  assert.equal(await readiness("https://chordleaf.com/assets/editor.js"), true);
  assert.equal(
    await readiness("https://chordleaf.com/assets/another-build.js"),
    false,
  );
  assert.equal(
    await readiness("https://other.example/assets/editor.js"),
    false,
  );
  cached = false;
  assert.equal(
    await readiness("https://chordleaf.com/assets/editor.js"),
    false,
  );
});
