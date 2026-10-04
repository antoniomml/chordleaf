import wasm from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import mjs from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import gpuWasm from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url";
import gpuMjs from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url";

// CPU inference must not compile Asyncify just because GPU support is bundled.
// In particular, Safari's Asyncify compiler can exceed an iPhone's memory budget.
export const runtimeURLs = { wasm, mjs };
export const gpuRuntimeURLs = { wasm: gpuWasm, mjs: gpuMjs };
