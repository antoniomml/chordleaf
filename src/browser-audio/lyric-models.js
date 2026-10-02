export const whisperModels = {
  whisper: {
    name: "Whisper Base",
    repository: "onnx-community/whisper-base_timestamped",
    description: "Ligero · Funciona sin WebGPU",
    engine: "Whisper-Base/ONNX-q8",
  },
  "whisper-small": {
    name: "Whisper Small",
    repository: "onnx-community/whisper-small_timestamped",
    description: "Intermedio · Más memoria que Base · Funciona sin WebGPU",
    engine: "Whisper-Small/ONNX-q8",
  },
  "whisper-turbo": {
    name: "Whisper Large v3 Turbo",
    repository: "onnx-community/whisper-large-v3-turbo_timestamped",
    description:
      "Modelo grande · Recomendado para ordenador · Funciona sin WebGPU",
    engine: "Whisper-Large-v3-Turbo/ONNX-q8",
  },
};
export const browserLyricModels = [...Object.keys(whisperModels), "qwen"];
