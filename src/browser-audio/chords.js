import * as ort from "onnxruntime-web/webgpu";
import { estimateTuning } from "./tuning.js";

// Same six structural output heads and transition penalty as LV-Chordia.
// Only the CQT frontend differs; keep this engine identifiable in exports.
export function decodeChordProbabilities(probabilities, manifest, duration) {
  const frames = probabilities[0].length / manifest.sizes[0];
  if (!Number.isInteger(frames) || frames < 1)
    throw new Error("Invalid chord frames");
  const states = manifest.dictionary,
    count = states.length;
  const back = new Int16Array(frames * count);
  let scores = new Float64Array(count).fill(-Infinity);
  let bestState = 0;
  const observation = (frame, state) => {
    let total = 0;
    for (let head = 0; head < 6; head++) {
      const category = states[state].array[head] + (head === 1 ? 1 : 0);
      if (category < 0) continue;
      const probability =
        probabilities[head][frame * manifest.sizes[head] + category];
      if (!Number.isFinite(probability) || probability < 0)
        throw new Error("Invalid chord probabilities");
      total += Math.log(Math.max(probability, 1e-30));
    }
    return total;
  };
  scores[0] = observation(0, 0);
  for (let frame = 1; frame < frames; frame++) {
    const transition = scores[bestState] - manifest.transitionPenalty;
    const next = new Float64Array(count);
    let nextBest = 0;
    for (let state = 0; state < count; state++) {
      const stay = scores[state] > transition;
      back[frame * count + state] = stay ? state : bestState;
      next[state] =
        (stay ? scores[state] : transition) + observation(frame, state);
      if (next[state] > next[nextBest]) nextBest = state;
    }
    scores = next;
    bestState = nextBest;
  }
  const decoded = new Int16Array(frames);
  decoded[frames - 1] = bestState;
  for (let frame = frames - 2; frame >= 0; frame--)
    decoded[frame] = back[(frame + 1) * count + decoded[frame + 1]];
  const delta = manifest.hop / manifest.sampleRate,
    result = [];
  let first = 0;
  for (let frame = 0; frame < frames; frame++) {
    if (frame + 1 < frames && decoded[frame + 1] === decoded[frame]) continue;
    const start = Math.min(duration, first * delta),
      end = Math.min(duration, (frame + 1) * delta);
    if (end > start)
      result.push({
        start,
        end,
        label: states[decoded[frame]].label,
        rawLabel: states[decoded[frame]].rawLabel,
      });
    first = frame + 1;
  }
  return result;
}

export async function recognizeBrowserChords(
  audio,
  read,
  progress,
  gpu = true,
) {
  const manifest = await read("chords", "manifest.json", "json");
  const providers = gpu ? ["webgpu", "wasm"] : ["wasm"];
  progress("Preparando los acordes…");
  const bank = new Float32Array(await read("chords", "tuning-kernels.f32"));
  const tuning = estimateTuning(audio);
  const index = Math.max(
    0,
    Math.min(20, Math.floor((tuning + 0.5) / 0.05 + 0.5)),
  );
  const size = manifest.kernelShape.reduce((a, b) => a * b, 1),
    stride = 2 * size + 288;
  const kernel = bank.subarray(index * stride, (index + 1) * stride);
  const frontend = await ort.InferenceSession.create(
    await read("chords", "cqt.onnx"),
    { executionProviders: providers },
  );
  const outputs = await frontend.run({
    audio: new ort.Tensor("float32", audio, [1, audio.length]),
    real: new ort.Tensor(
      "float32",
      kernel.subarray(0, size),
      manifest.kernelShape,
    ),
    imag: new ort.Tensor(
      "float32",
      kernel.subarray(size, 2 * size),
      manifest.kernelShape,
    ),
    lengths: new ort.Tensor("float32", kernel.subarray(2 * size), [288]),
  });
  const features = outputs.cqt;
  await frontend.release();
  const probabilities = [];
  for (let model = 0; model < 5; model++) {
    progress(`Analizando acordes · ${model + 1}/5`);
    const session = await ort.InferenceSession.create(
      await read("chords", `net-${model}.onnx`),
      { executionProviders: providers },
    );
    const prediction = await session.run({ cqt: features });
    for (let head = 0; head < 6; head++) {
      const tensor = prediction[manifest.heads[head]],
        values = await tensor.getData();
      probabilities[head] ||= new Float32Array(values.length);
      for (let i = 0; i < values.length; i++)
        probabilities[head][i] += values[i] / 5;
      tensor.dispose();
    }
    await session.release();
  }
  features.dispose();
  return decodeChordProbabilities(
    probabilities,
    manifest,
    audio.length / 22050,
  );
}
