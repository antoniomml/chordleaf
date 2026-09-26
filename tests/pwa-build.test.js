import test from "node:test";
import assert from "node:assert/strict";
import { pwaPlugin } from "../build/pwa.js";

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
  assert.ok(JSON.parse(first["release.json"]).version);
});
