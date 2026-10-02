export const AUDIO_SETTINGS_KEY = "chordleaf-audio-settings-v1";
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
  if (
    ["whisper-small", "whisper-turbo"].includes(preferred) &&
    readiness?.[preferred]
  )
    return preferred;
  if (preferred === "qwen" && readiness?.qwen) return "qwen";
  if (preferred === "whisper" && (readiness?.whisper ?? readiness?.lyrics))
    return "whisper";
  if (readiness?.qwen) return "qwen";
  if (readiness?.whisper || (readiness?.lyrics && !readiness?.modelDownloads))
    return "whisper";
  return (
    ["whisper-small", "whisper-turbo"].find((name) => readiness?.[name]) ||
    "whisper"
  );
}
