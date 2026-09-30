export const AUDIO_SETTINGS_KEY = "chordleaf-audio-settings-v1";
export function recommendedLyricModel(system) {
  return system?.platform === "darwin" &&
    system?.arch === "arm64" &&
    Number.isFinite(system?.memoryGB) &&
    system.memoryGB >= 16
    ? "qwen"
    : "whisper";
}
export function readAudioSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY));
    return {
      seen: settings?.seen === true,
      model: ["qwen", "whisper", "none"].includes(settings?.model)
        ? settings.model
        : null,
    };
  } catch {
    return { seen: false, model: null };
  }
}
export function saveAudioSettings(settings) {
  try {
    localStorage.setItem(
      AUDIO_SETTINGS_KEY,
      JSON.stringify({
        seen: settings.seen === true,
        model: ["qwen", "whisper", "none"].includes(settings.model)
          ? settings.model
          : null,
      }),
    );
  } catch {
    /* Keep the preference in memory when storage is unavailable. */
  }
}
export function installedLyricModel(readiness, preferred) {
  if (preferred === "qwen" && readiness?.qwen) return "qwen";
  if (preferred === "whisper" && readiness?.lyrics) return "whisper";
  return readiness?.qwen ? "qwen" : "whisper";
}
