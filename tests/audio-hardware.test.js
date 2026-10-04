import test from "node:test";
import assert from "node:assert/strict";
import {
  audioDevice,
  audioHardware,
  supportsBrowserModel,
} from "../src/browser-audio/hardware.js";

test("Apple browsers use the CPU path even when WebGPU advertises float16", async () => {
  for (const userAgent of [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0 Mobile Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15",
  ]) {
    const navigator = {
      userAgent,
      gpu: {
        requestAdapter() {
          throw new Error("Must not initialize GPU on WebKit");
        },
      },
    };
    assert.equal((await audioHardware(navigator)).gpu, false);
    assert.equal(audioDevice(navigator).webkit, true);
  }
  assert.equal(
    audioDevice({
      userAgent: "Macintosh AppleWebKit Safari",
      maxTouchPoints: 5,
    }).mobile,
    true,
  );
});

test("Chromium retains GPU support and handles missing or rejected adapters", async () => {
  const navigator = {
    userAgent: "Mozilla/5.0 AppleWebKit/537.36 Chrome/140.0 Safari/537.36",
    gpu: {
      requestAdapter: async () => ({ features: new Set(["shader-f16"]) }),
    },
  };
  assert.equal((await audioHardware(navigator)).gpu, true);
  assert.equal(audioDevice(navigator).webkit, false);
  assert.equal(
    (await audioHardware({ userAgent: navigator.userAgent })).gpu,
    false,
  );
  navigator.gpu.requestAdapter = async () => {
    throw new Error("GPU unavailable");
  };
  assert.equal((await audioHardware(navigator)).gpu, false);
});

test("Turbo is restricted on Apple mobile browsers while Base and Small remain available", () => {
  for (const navigator of [
    { userAgent: "iPhone AppleWebKit Safari" },
    { userAgent: "iPhone AppleWebKit CriOS" },
    { userAgent: "iPad AppleWebKit Safari" },
    { userAgent: "Macintosh AppleWebKit Safari", maxTouchPoints: 5 },
  ]) {
    const hardware = audioDevice(navigator);
    assert.equal(supportsBrowserModel("whisper-turbo", hardware), false);
    assert.equal(supportsBrowserModel("whisper-small", hardware), true);
    assert.equal(supportsBrowserModel("whisper", hardware), true);
  }
  for (const userAgent of [
    "Macintosh AppleWebKit Safari",
    "Android AppleWebKit Chrome Mobile",
  ])
    assert.equal(
      supportsBrowserModel("whisper-turbo", audioDevice({ userAgent })),
      true,
    );
});
