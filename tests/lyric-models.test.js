import test from "node:test";
import assert from "node:assert/strict";
import { installedLyricModel } from "../src/audio-models.js";

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
