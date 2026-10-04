import languages from "./audio-languages.json" with { type: "json" };

export const AUDIO_LANGUAGE_KEY = "chordleaf-audio-language-v1";
let remembered = "auto";
const valid = (value) => value === "auto" || Object.hasOwn(languages, value);
const storage = () => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export function readAudioLanguage(store = storage()) {
  try {
    const value = store?.getItem(AUDIO_LANGUAGE_KEY);
    if (valid(value)) remembered = value;
  } catch {
    /* The explicit choice still works when browser storage is unavailable. */
  }
  return remembered;
}

export function saveAudioLanguage(value, store = storage()) {
  remembered = valid(value) ? value : "auto";
  try {
    store?.setItem(AUDIO_LANGUAGE_KEY, remembered);
  } catch {
    /* Keep the current choice in memory. */
  }
}
