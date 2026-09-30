import * as ort from "onnxruntime-web/webgpu";
import { loadQwen } from "./qwen.js";
import { loadBrowserAligner } from "./aligner.js";
import { recognizeBrowserChords } from "./chords.js";
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
self.onmessage = async ({ data }) => {
  try {
    const read = async (model, filename, type) => {
      const response = await fetch(
        model === "chords"
          ? `/models/lv-chordia-web-v1/${filename}`
          : `/__audio-research/models/${model}/${filename}`,
      );
      if (!response.ok) throw new Error(`Missing ${filename}`);
      return type === "json" ? response.json() : response.arrayBuffer();
    };
    const qwen = await loadQwen(read, (status) => self.postMessage({ status }));
    const started = performance.now();
    const results = [];
    for (const clip of data.clips) {
      self.postMessage({ status: `Transcribiendo ${clip.name}…` });
      const begin = performance.now();
      const result = await qwen.transcribe(clip.audio, clip.language);
      results.push({
        name: clip.name,
        ...result,
        seconds: (performance.now() - begin) / 1000,
      });
      self.postMessage({
        status: `Terminado ${clip.name}`,
        result: results.at(-1),
      });
    }
    await qwen.dispose();
    const aligner = await loadBrowserAligner(read, (status) =>
      self.postMessage({ status }),
    );
    for (let i = 0; i < data.clips.length; i++) {
      const begin = performance.now();
      results[i].words = await aligner.align(
        data.clips[i].audio,
        results[i].text,
        data.clips[i].language,
      );
      results[i].alignmentSeconds = (performance.now() - begin) / 1000;
      self.postMessage({
        status: `Tiempos de ${results[i].name}`,
        result: results[i],
      });
    }
    await aligner.dispose();
    for (let i = 0; i < data.clips.length; i++) {
      const clip = data.clips[i];
      const audio = new Float32Array(
        await (
          await fetch(`/__audio-research/${clip.name}-22050.f32`)
        ).arrayBuffer(),
      );
      results[i].chords = await recognizeBrowserChords(audio, read, (status) =>
        self.postMessage({ status }),
      );
      self.postMessage({
        status: `Acordes de ${results[i].name}`,
        result: results[i],
      });
    }
    self.postMessage({
      result: { results, seconds: (performance.now() - started) / 1000 },
      complete: true,
    });
  } catch (error) {
    self.postMessage({ error: error.message, stack: error.stack });
  }
};
