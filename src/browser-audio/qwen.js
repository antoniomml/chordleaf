// Independent implementation of the published Qwen ASR ONNX graph contract.
// Model conversion: jiangzhuo9357/Qwen3-ASR-0.6B-ONNX (Apache-2.0).
import { repetitionStart } from "./chunks.js";
import * as ort from "onnxruntime-web/webgpu";
import {
  PreTrainedTokenizer,
  WhisperFeatureExtractor,
} from "@huggingface/transformers";

export function toHalf(value) {
  const f = new Float32Array(1);
  const bits = new Uint32Array(f.buffer);
  f[0] = value;
  const sign = (bits[0] >>> 16) & 0x8000;
  const exponent = ((bits[0] >>> 23) & 255) - 127 + 15;
  let mantissa = bits[0] & 0x7fffff;
  if (exponent >= 31) return sign | 0x7c00;
  if (exponent <= 0) {
    if (exponent < -10) return sign;
    mantissa = (mantissa | 0x800000) >>> (1 - exponent);
    return sign | ((mantissa + 0x1000) >>> 13);
  }
  return sign | ((exponent << 10) + ((mantissa + 0x1000) >>> 13));
}
export function fromHalf(value) {
  const sign = value & 0x8000 ? -1 : 1;
  const exponent = (value >>> 10) & 31;
  const mantissa = value & 1023;
  return (
    sign *
    (exponent === 0
      ? (2 ** -14 * mantissa) / 1024
      : exponent === 31
        ? mantissa
          ? NaN
          : Infinity
        : 2 ** (exponent - 15) * (1 + mantissa / 1024))
  );
}
const half = (values) => Uint16Array.from(values, toHalf);
const positions = (count, offset = 0) =>
  new ort.Tensor(
    "int64",
    BigInt64Array.from({ length: count }, (_, i) => BigInt(i + offset)),
    [1, count],
  );

export async function loadQwen(read, progress) {
  const config = await read("qwen", "prompt_config.json", "json");
  const tokenizer = new PreTrainedTokenizer(
    await read("qwen", "tokenizer.json", "json"),
    await read("qwen", "tokenizer_config.json", "json"),
  );
  const mel = new WhisperFeatureExtractor({
    n_fft: 400,
    hop_length: 160,
    feature_size: 128,
    sampling_rate: 16000,
    nb_max_frames: 3000,
    n_samples: 480000,
    mel_filters: (await read("qwen", "mel_filters.json", "json")).data,
  });
  const embedding = new Int8Array(await read("qwen", "embed_tokens.int8.bin"));
  const scales = new Float32Array(await read("qwen", "embed_scales.f32.bin"));
  progress("Cargando Qwen en la GPU…");
  const weights = new Uint8Array(
    await read("qwen", "decoder_weights.q4f16.data"),
  );
  const encoder = await ort.InferenceSession.create(
    await read("qwen", "encoder.fp16.onnx"),
    { executionProviders: ["webgpu"] },
  );
  const decoderOptions = {
    executionProviders: ["webgpu"],
    externalData: [{ path: "decoder_weights.q4f16.data", data: weights }],
    preferredOutputLocation: {
      present_keys: "gpu-buffer",
      present_values: "gpu-buffer",
    },
  };
  const init = await ort.InferenceSession.create(
    await read("qwen", "decoder_init.q4f16.onnx"),
    decoderOptions,
  );
  const step = await ort.InferenceSession.create(
    await read("qwen", "decoder_step.q4f16.onnx"),
    decoderOptions,
  );
  function embeds(ids) {
    const out = new Uint16Array(ids.length * 1024);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i],
        scale = scales[id];
      for (let j = 0; j < 1024; j++)
        out[i * 1024 + j] = toHalf(embedding[id * 1024 + j] * scale);
    }
    return out;
  }
  return {
    async transcribe(audio, language) {
      const features = await mel._extract_fbank_features(audio);
      const frames = features.dims[1];
      const encoded = await encoder.run({
        mel: new ort.Tensor("float32", features.data, [1, 128, frames]),
      });
      const audioFeatures = encoded.audio_features;
      const count = audioFeatures.dims[1];
      const ids = [
        ...config.prompt.prefix_ids,
        ...Array(count).fill(config.prompt.audio_pad_id),
        ...config.prompt.suffix_ids,
        ...(config.language_prefix_ids[language] || []),
      ];
      const input = embeds(ids);
      const rawFeatures = await audioFeatures.getData();
      input.set(
        audioFeatures.type === "float16" ? rawFeatures : half(rawFeatures),
        config.prompt.prefix_ids.length * 1024,
      );
      let outputs = await init.run({
        input_embeds: new ort.Tensor("float16", input, [1, ids.length, 1024]),
        position_ids: positions(ids.length),
      });
      audioFeatures.dispose();
      const tokens = [];
      let capped = true;
      for (let i = 0; i < 512; i++) {
        const logits = await outputs.logits.getData();
        let best = -Infinity,
          token = 0;
        for (let j = 0; j < logits.length; j++) {
          const score =
            outputs.logits.type === "float16" ? fromHalf(logits[j]) : logits[j];
          if (score > best) {
            best = score;
            token = j;
          }
        }
        outputs.logits.dispose();
        if (config.prompt.eos_ids.includes(token)) {
          capped = false;
          break;
        }
        tokens.push(token);
        const repetition = repetitionStart(tokens);
        if (repetition) {
          tokens.splice(repetition.start + repetition.keep);
          break;
        }
        const previous = outputs;
        outputs = await step.run({
          input_embeds: new ort.Tensor(
            "float16",
            embeds([token]),
            [1, 1, 1024],
          ),
          position_ids: positions(1, ids.length + i),
          past_keys: previous.present_keys,
          past_values: previous.present_values,
        });
        previous.present_keys.dispose();
        previous.present_values.dispose();
      }
      outputs.present_keys.dispose();
      outputs.present_values.dispose();
      const prefix = tokens.indexOf(config.prompt.asr_text_id);
      return {
        text: tokenizer
          .decode(prefix < 0 ? tokens : tokens.slice(prefix + 1), {
            skip_special_tokens: true,
          })
          .trim(),
        partial: capped,
      };
    },
    async dispose() {
      await encoder.release();
      await init.release();
      await step.release();
    },
  };
}
