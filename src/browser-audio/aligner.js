import * as ort from "onnxruntime-web/webgpu";
import {
  PreTrainedTokenizer,
  WhisperFeatureExtractor,
} from "@huggingface/transformers";

// Qwen's non-autoregressive timestamp head uses two 80 ms slots per word.
export async function loadBrowserAligner(read, progress) {
  const config = await read("aligner", "config.json", "json");
  const tokenizer = new PreTrainedTokenizer(
    await read("aligner", "tokenizer.json", "json"),
    await read("aligner", "tokenizer_config.json", "json"),
  );
  const extractor = new WhisperFeatureExtractor(
    await read("aligner", "preprocessor_config.json", "json"),
  );
  progress("Cargando los tiempos de la letra…");
  const model = await ort.InferenceSession.create(
    await read("aligner", "onnx/model_q4.onnx"),
    { executionProviders: ["webgpu", "wasm"] },
  );
  return {
    async align(audio, text, language = "es") {
      const words = ["zh", "ja"].includes(language)
        ? [
            ...new Intl.Segmenter(language, { granularity: "word" }).segment(
              text,
            ),
          ]
            .filter((s) => s.isWordLike)
            .map((s) => s.segment)
        : text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*[.,!?;:。！？]*/gu) ||
          [];
      if (!words.length) return [];
      const features = await extractor._extract_fbank_features(audio);
      const frames = features.dims[1];
      let count = frames % 100;
      for (let i = 0; i < 3; i++) count = Math.floor((count + 1) / 2);
      count += 13 * Math.floor(frames / 100);
      const prompt =
        "<|audio_start|>" +
        "<|audio_pad|>".repeat(count) +
        "<|audio_end|>" +
        words
          .map((w) => w.replace(/[^\p{L}\p{N}’']/gu, " ").trim())
          .join("<timestamp><timestamp>") +
        "<timestamp><timestamp>";
      const ids = tokenizer.encode(prompt, { add_special_tokens: false });
      const outputs = await model.run({
        input_ids: new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [
          1,
          ids.length,
        ]),
        attention_mask: new ort.Tensor(
          "int64",
          new BigInt64Array(ids.length).fill(1n),
          [1, ids.length],
        ),
        feature_attention_mask: new ort.Tensor(
          "int32",
          new Int32Array(frames).fill(1),
          [1, frames],
        ),
        input_features: new ort.Tensor("float32", features.data, [
          1,
          128,
          frames,
        ]),
      });
      const logits = await outputs.logits.getData(),
        classes = outputs.logits.dims.at(-1);
      const times = [];
      for (let i = 0; i < ids.length; i++) {
        if (ids[i] !== config.timestamp_token_id) continue;
        let best = 0;
        for (let j = 1; j < classes; j++)
          if (logits[i * classes + j] > logits[i * classes + best]) best = j;
        times.push((best * config.timestamp_segment_time) / 1000);
      }
      outputs.logits.dispose();
      if (times.length !== words.length * 2)
        throw new Error("Invalid alignment slots");
      return words.map((word, i) => ({
        text: word,
        start: times[2 * i],
        end: times[2 * i + 1],
      }));
    },
    async dispose() {
      await model.release();
    },
  };
}
