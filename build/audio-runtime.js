import { createRequire } from "node:module";
import { statSync } from "node:fs";

const require = createRequire(import.meta.url);
const id = "virtual:chordleaf-audio-runtime-sizes";
const files = {
  cpu: {
    wasm: "ort-wasm-simd-threaded.wasm",
    mjs: "ort-wasm-simd-threaded.mjs",
  },
  gpu: {
    wasm: "ort-wasm-simd-threaded.asyncify.wasm",
    mjs: "ort-wasm-simd-threaded.asyncify.mjs",
  },
};

/** File/storage sizes from the pinned engine, rather than transfer estimates. */
export function audioRuntimeSizes() {
  return Object.fromEntries(
    Object.entries(files).map(([engine, resources]) => [
      engine,
      Object.fromEntries(
        Object.entries(resources).map(([name, file]) => [
          name,
          statSync(require.resolve(`onnxruntime-web/${file}`)).size,
        ]),
      ),
    ]),
  );
}
export function audioRuntimePlugin() {
  return {
    name: "chordleaf-audio-runtime-sizes",
    resolveId(source) {
      if (source === id) return `\0${id}`;
    },
    load(source) {
      if (source === `\0${id}`)
        return `export default ${JSON.stringify(audioRuntimeSizes())};`;
    },
  };
}
