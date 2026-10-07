import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { audioRuntimeSizes } from "../build/audio-runtime.js";

test("runtime storage sizes match the actual pinned CPU and GPU files", () => {
  const require = createRequire(import.meta.url);
  const sizes = audioRuntimeSizes();
  for (const [engine, suffix] of [
    ["cpu", ""],
    ["gpu", ".asyncify"],
  ])
    for (const extension of ["wasm", "mjs"]) {
      const file = require.resolve(
        `onnxruntime-web/ort-wasm-simd-threaded${suffix}.${extension}`,
      );
      assert.equal(sizes[engine][extension], readFileSync(file).byteLength);
      assert.ok(sizes[engine][extension] > 0);
    }
});
