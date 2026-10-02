export const whisperModels = {
  whisper: {
    name: "Whisper Base",
    repository: "onnx-community/whisper-base_timestamped",
    label: "Ligero",
    kind: "light",
    description: "CPU",
    engine: "Whisper-Base/ONNX-q8",
  },
  "whisper-small": {
    name: "Whisper Small",
    repository: "onnx-community/whisper-small_timestamped",
    label: "Intermedio",
    kind: "medium",
    description: "CPU",
    engine: "Whisper-Small/ONNX-q8",
  },
  "whisper-turbo": {
    name: "Whisper Large v3 Turbo",
    repository: "onnx-community/whisper-large-v3-turbo_timestamped",
    label: "Exigente",
    kind: "heavy",
    description: "CPU",
    engine: "Whisper-Large-v3-Turbo/ONNX-q8",
  },
};
export const browserLyricModels = [...Object.keys(whisperModels), "qwen"];

// Browser memory and CPU reports are approximate; this is a conservative
// resource recommendation, never a benchmark or a promise of lyric accuracy.
export function recommendedBrowserLyricModel(hardware) {
  if (!(hardware?.memory > 0) || !(hardware?.cores > 0)) return null;
  if (hardware.mobile || hardware.memory < 8) return "whisper";
  if (hardware.gpu) return "qwen";
  return hardware.cores >= 4 ? "whisper-small" : "whisper";
}
