import test from "node:test";
import assert from "node:assert/strict";
import {
  beginAudioDiagnostic,
  readAudioDiagnostic,
  recoverAudioDiagnostic,
} from "../src/browser-audio/diagnostics.js";
const key = "chordleaf-audio-diagnostic-v1";
const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
};

test("local diagnostics retain the failed stage without audio, names, lyrics or raw errors", () => {
  const storage = memoryStorage();
  const recorder = beginAudioDiagnostic(
    "analysis",
    {
      model: "whisper",
      bytes: 1234,
      mime: "audio/mp4",
      filename: "private.m4a",
      text: "Private lyrics",
      audio: [1, 2, 3],
    },
    { storage, navigator: { userAgent: "iPhone Safari" } },
  );
  recorder.step("Cargando Whisper…", { duration: 60 });
  recorder.finish(
    "failed",
    new Error("WebAssembly allocation failed: private.m4a"),
  );
  const report = readAudioDiagnostic(storage);
  assert.equal(report.status, "failed");
  assert.equal(report.events.at(-1).error, "memory");
  assert.equal(report.device.mobile, true);
  assert.ok(report.appVersion);
  assert.equal(report.events.at(-2).duration, 60);
  assert.doesNotMatch(
    JSON.stringify(report),
    /private\.m4a|Private lyrics|allocation failed/,
  );
});

test("interrupted attempts survive a reload and completed attempts remain completed", () => {
  const storage = memoryStorage();
  storage.setItem(
    key,
    JSON.stringify({
      version: 1,
      session: "old-page",
      status: "running",
      events: [{ stage: "Detectando acordes…" }],
    }),
  );
  assert.equal(recoverAudioDiagnostic(storage), true);
  assert.equal(readAudioDiagnostic(storage).status, "interrupted");
  assert.equal(
    readAudioDiagnostic(storage).events[0].stage,
    "Detectando acordes…",
  );
  assert.equal(recoverAudioDiagnostic(storage), false);
  const recorder = beginAudioDiagnostic(
    "download",
    { model: "chords" },
    { storage },
  );
  for (let i = 0; i < 100; i++) recorder.step("downloading", { percent: i });
  recorder.finish("completed");
  assert.equal(readAudioDiagnostic(storage).events.length, 40);
  assert.equal(recoverAudioDiagnostic(storage), false);
});

test("blocked storage never prevents analysis or collecting a session diagnostic", () => {
  const storage = {
    getItem() {
      throw new Error("SecurityError");
    },
    setItem() {
      throw new Error("QuotaExceededError");
    },
  };
  const recorder = beginAudioDiagnostic(
    "analysis",
    { model: "chords" },
    { storage },
  );
  recorder.finish("cancelled", new DOMException("Cancelado", "AbortError"));
  assert.equal(readAudioDiagnostic(storage).status, "cancelled");
  assert.equal(readAudioDiagnostic(storage).events.at(-1).error, "cancelled");
});
