import * as ort from "onnxruntime-web/webgpu";
import { runtimeURLs } from "./runtime.js";
import { readBrowserModel } from "./models.js";
import { loadBrowserWhisper } from "./whisper.js";
import { loadQwen } from "./qwen.js";
import { loadBrowserAligner } from "./aligner.js";
import { recognizeBrowserChords } from "./chords.js";
import { audioChunks } from "./chunks.js";
import { normalizeWords } from "./timeline.js";
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = runtimeURLs;
self.onmessage = async ({ data }) => {
  const progress = (stage, percent) =>
    self.postMessage({ status: { stage, percent } });
  try {
    const started = performance.now();
    const {
        audio,
        harmony,
        lyrics,
        language,
        gpu,
        lyricsEngine = "qwen",
      } = data,
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
        if (lyricsEngine === "whisper") {
          progress("Cargando Whisper…", 6);
          const model = await loadBrowserWhisper();
          try {
            const chunks = audioChunks(audio);
            for (let i = 0; i < chunks.length; i++) {
              const { start, end } = chunks[i];
              progress("Obteniendo letra…", 10 + (72 * start) / audio.length);
              const output = await model.transcribe(
                audio.subarray(start, end),
                language,
              );
              if (output.partial) result.warnings.push("lyrics-partial");
              const raw = (output.chunks || [])
                .map((word) => ({
                  text: String(word.text || "").trim(),
                  start: word.timestamp?.[0] ?? NaN,
                  end: word.timestamp?.[1] ?? NaN,
                }))
                .filter((word) => word.text);
              if (!raw.length && output.text?.trim()) {
                raw.push({
                  text: output.text.trim(),
                  start: 0,
                  end: (end - start) / 16000,
                });
                result.warnings.push("alignment-approximate");
              }
              result.rawAlignment.push(
                ...raw.map((word) => ({
                  ...word,
                  start: Number.isFinite(word.start)
                    ? word.start + start / 16000
                    : null,
                  end: Number.isFinite(word.end)
                    ? word.end + start / 16000
                    : null,
                })),
              );
              const normalized = normalizeWords(
                raw,
                (end - start) / 16000,
                start / 16000,
                i,
              );
              result.words.push(...normalized.words);
              if (normalized.approximate)
                result.warnings.push("alignment-approximate");
              progress("Obteniendo letra…", 10 + (72 * end) / audio.length);
            }
            result.engines.lyrics = "Whisper-Base/ONNX-q8";
          } finally {
            await model.dispose();
          }
        } else {
          const transcripts = [];
          let model;
          try {
            progress("Cargando Qwen…", 6);
            model = await loadQwen(readBrowserModel, () => {});
            for (const { start: offset, end } of audioChunks(audio)) {
              const clip = audio.subarray(offset, end);
              if (clip.length < 1600) continue;
              progress("Obteniendo letra…", 10 + (52 * offset) / audio.length);
              const text = await model.transcribe(clip, language);
              if (text.partial) result.warnings.push("lyrics-partial");
              transcripts.push({
                audio: clip,
                offset: offset / 16000,
                ...text,
              });
              progress("Obteniendo letra…", 10 + (52 * end) / audio.length);
            }
          } finally {
            await model?.dispose();
          }
          result.engines.lyrics = "Qwen3-ASR-0.6B/ONNX-q4f16";
          let aligner;
          try {
            progress("Situando la letra…", 64);
            aligner = await loadBrowserAligner(readBrowserModel, () => {});
            for (let i = 0; i < transcripts.length; i++) {
              const clip = transcripts[i];
              progress(
                "Situando la letra…",
                64 + (18 * i) / transcripts.length,
              );
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
        }
      } catch (error) {
        // Keep the chord import usable, but retain a local diagnostic so a
        // failed voice engine can be investigated without transmitting audio.
        console.warn("Local lyric analysis failed", error);
        self.postMessage({
          diagnostic: String(error.message || error).slice(0, 500),
        });
        result.warnings.push("lyrics-failed");
        if (result.words.length) result.warnings.push("lyrics-partial");
      }
    }
    result.chords = await recognizeBrowserChords(
      harmony,
      readBrowserModel,
      (_, fraction = 0) =>
        progress(
          "Detectando acordes…",
          (lyrics ? 84 : 8) + (lyrics ? 13 : 89) * fraction,
        ),
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
