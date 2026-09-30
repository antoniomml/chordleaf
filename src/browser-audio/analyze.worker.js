import * as ort from "onnxruntime-web/webgpu";
import { runtimeURLs } from "./runtime.js";
import { readBrowserModel } from "./models.js";
import { loadQwen } from "./qwen.js";
import { loadBrowserAligner } from "./aligner.js";
import { recognizeBrowserChords } from "./chords.js";
import { audioChunks } from "./chunks.js";
import { normalizeWords } from "./timeline.js";
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = runtimeURLs;
self.onmessage = async ({ data }) => {
  const progress = (status) => self.postMessage({ status });
  try {
    const started = performance.now();
    const { audio, harmony, lyrics, language, gpu } = data,
      duration = audio.length / 16000;
    const result = {
      version: 1,
      duration,
      words: [],
      chords: [],
      rawAlignment: [],
      warnings: [],
      engines: { chords: "lv-chordia-web-v1/nnAudio-tuned" },
    };
    if (lyrics) {
      try {
        const transcripts = [];
        let model;
        try {
          model = await loadQwen(readBrowserModel, progress);
          for (const { start: offset, end } of audioChunks(audio)) {
            const clip = audio.subarray(offset, end);
            if (clip.length < 1600) continue;
            progress(
              `Obteniendo letra · ${Math.floor(offset / 16000)} / ${Math.ceil(duration)} s`,
            );
            const text = await model.transcribe(clip, language);
            if (text.partial) result.warnings.push("lyrics-partial");
            transcripts.push({ audio: clip, offset: offset / 16000, ...text });
          }
        } finally {
          await model?.dispose();
        }
        result.engines.lyrics = "Qwen3-ASR-0.6B/ONNX-q4f16";
        let aligner;
        try {
          aligner = await loadBrowserAligner(readBrowserModel, progress);
          for (let i = 0; i < transcripts.length; i++) {
            const clip = transcripts[i];
            progress(`Situando la letra · ${i + 1}/${transcripts.length}`);
            const raw = await aligner.align(clip.audio, clip.text, language);
            result.rawAlignment.push(
              ...raw.map((w) => ({
                ...w,
                start: w.start + clip.offset,
                end: w.end + clip.offset,
              })),
            );
            const normalized = normalizeWords(
              raw,
              clip.audio.length / 16000,
              clip.offset,
              i,
            );
            result.words.push(...normalized.words);
            if (normalized.approximate)
              result.warnings.push("alignment-approximate");
          }
        } finally {
          await aligner?.dispose();
        }
      } catch {
        result.warnings.push("lyrics-failed");
        if (result.words.length) result.warnings.push("lyrics-partial");
      }
    }
    result.chords = await recognizeBrowserChords(
      harmony,
      readBrowserModel,
      progress,
      gpu,
    );
    result.warnings = [...new Set(result.warnings)];
    result.metrics = { seconds: (performance.now() - started) / 1000 };
    self.postMessage({ result });
  } catch (error) {
    console.error("Browser chord analysis failed", error);
    self.postMessage({
      error:
        "No se pudieron obtener los acordes en este navegador. Prueba un fragmento más corto o Chrome/Edge actualizado.",
    });
  }
};
