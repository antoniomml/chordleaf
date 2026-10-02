import test from "node:test";
import assert from "node:assert/strict";
import { installedLyricModel } from "../src/audio-models.js";
import { recommendedBrowserLyricModel } from "../src/browser-audio/lyric-models.js";

test("browser guidance uses conservative hardware reports, not model accuracy claims", () => {
  assert.equal(recommendedBrowserLyricModel(null), null);
  assert.equal(
    recommendedBrowserLyricModel({ gpu: true, memory: null, cores: 12 }),
    null,
  );
  assert.equal(
    recommendedBrowserLyricModel({ gpu: true, memory: 8, cores: null }),
    null,
  );
  assert.equal(
    recommendedBrowserLyricModel({
      gpu: true,
      memory: 8,
      cores: 8,
      mobile: true,
    }),
    "whisper",
  );
  assert.equal(
    recommendedBrowserLyricModel({ gpu: true, memory: 8, cores: 8 }),
    "qwen",
  );
  assert.equal(
    recommendedBrowserLyricModel({ gpu: false, memory: 8, cores: 8 }),
    "whisper-small",
  );
  assert.equal(
    recommendedBrowserLyricModel({ gpu: false, memory: 4, cores: 8 }),
    "whisper",
  );
  assert.equal(
    recommendedBrowserLyricModel({ gpu: false, memory: 8, cores: 2 }),
    "whisper",
  );
});

test("specific Whisper choices survive when other voice models are installed", () => {
  const readiness = {
    lyrics: true,
    whisper: false,
    "whisper-small": true,
    "whisper-turbo": true,
    qwen: true,
    modelDownloads: {},
  };
  assert.equal(
    installedLyricModel(readiness, "whisper-small"),
    "whisper-small",
  );
  assert.equal(
    installedLyricModel(readiness, "whisper-turbo"),
    "whisper-turbo",
  );
  assert.equal(installedLyricModel(readiness, "qwen"), "qwen");
  const cpu = { ...readiness, qwen: false };
  assert.equal(installedLyricModel(cpu, "whisper"), "whisper-small");
  assert.equal(
    installedLyricModel({ ...cpu, "whisper-small": false }, null),
    "whisper-turbo",
  );
  assert.equal(installedLyricModel({ lyrics: true }, "whisper"), "whisper");
});
