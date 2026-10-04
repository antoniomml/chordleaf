import {
  env,
  pipeline,
  LogitsProcessor,
  LogitsProcessorList,
} from "@huggingface/transformers";
import { repetitionStart } from "./chunks.js";
import catalog from "./catalog.json" with { type: "json" };
import { MODEL_CACHE } from "./models.js";
import { runtimeURLs } from "./runtime.js";
import { whisperModels } from "./lyric-models.js";

export async function loadBrowserWhisper(model = "whisper") {
  const definition = whisperModels[model];
  if (!definition) throw new Error("Unknown Whisper model");
  const cache = await caches.open(MODEL_CACHE);
  const root = catalog[model][0].url.split("/onnx/")[0];
  const match = async (request) => {
    const path = typeof request === "string" ? request : request.url;
    const file = catalog[model].find((file) => path.endsWith("/" + file.name));
    return file ? cache.match(file.url) : undefined;
  };
  // Only the explicit model download screen can access the network. Missing
  // optional tokenizer files are 404s; missing weights fail locally.
  env.useBrowserCache = false;
  env.useFSCache = false;
  env.useCustomCache = true;
  env.customCache = { match, put: async () => {} };
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.fetch = async (url) =>
    (await match(url)) || new Response(null, { status: 404 });
  env.useWasmCache = false;
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.wasmPaths = runtimeURLs;
  const revision = root.split("/").at(-1);
  const transcriber = await pipeline(
    "automatic-speech-recognition",
    definition.repository,
    {
      revision,
      dtype: "q8",
      device: "wasm",
      local_files_only: true,
    },
  );
  return {
    async transcribe(audio, language) {
      let partial = false;
      let repeated = false;
      // Transformers.js 4.3 Whisper forwards logits processors, but drops
      // custom stopping criteria. Force EOS rather than allowing a sung loop
      // to fill the transcript up to the token limit.
      class LoopLimit extends LogitsProcessor {
        _call(ids, logits) {
          const width = logits.dims.at(-1);
          for (let i = 0; i < ids.length; i++) {
            const loop = repetitionStart(ids[i]);
            if (loop || ids[i].length >= 259) {
              partial = true;
              repeated ||= Boolean(loop);
              logits.data.subarray(i * width, (i + 1) * width).fill(-Infinity);
              const configured =
                transcriber.model.generation_config.eos_token_id;
              const eos = Array.isArray(configured)
                ? configured[0]
                : configured;
              logits.data[i * width + eos] = 0;
            }
          }
          return logits;
        }
      }
      const criteria = new LogitsProcessorList();
      criteria.push(new LoopLimit());
      const output = await transcriber(audio, {
        return_timestamps: "word",
        task: "transcribe",
        max_new_tokens: 256,
        logits_processor: criteria,
        ...(language !== "auto" ? { language } : {}),
      });
      return { ...output, partial, repeated };
    },
    dispose: () => transcriber.dispose(),
  };
}
