import test from "node:test";
import assert from "node:assert/strict";
import {
  AUDIO_LANGUAGE_KEY,
  readAudioLanguage,
  saveAudioLanguage,
} from "../src/audio-language.js";

test("an explicit song language survives storage and invalid preferences", () => {
  const values = new Map();
  const store = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  saveAudioLanguage("es", store);
  assert.equal(values.get(AUDIO_LANGUAGE_KEY), "es");
  assert.equal(readAudioLanguage(store), "es");
  values.set(AUDIO_LANGUAGE_KEY, "fr");
  assert.equal(readAudioLanguage(store), "fr");
  saveAudioLanguage("unknown", store);
  assert.equal(readAudioLanguage(store), "auto");
});

test("language selection remains usable when storage throws", () => {
  const store = {
    getItem() {
      throw new DOMException("Blocked", "SecurityError");
    },
    setItem() {
      throw new DOMException("Full", "QuotaExceededError");
    },
  };
  saveAudioLanguage("en", store);
  assert.equal(readAudioLanguage(store), "en");
  saveAudioLanguage("auto", store);
});
