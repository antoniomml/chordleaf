import test from "node:test";
import assert from "node:assert/strict";
import { resolveFeatureFlags } from "../src/feature-flags.js";

test("import features keep existing behavior unless explicitly configured", () => {
  assert.deepEqual(resolveFeatureFlags(), {
    audioImport: true,
    webImport: true,
  });
  assert.deepEqual(
    resolveFeatureFlags({ VITE_FEATURE_AUDIO_IMPORT: "false" }),
    { audioImport: false, webImport: true },
  );
  assert.deepEqual(resolveFeatureFlags({ VITE_FEATURE_WEB_IMPORT: "false" }), {
    audioImport: true,
    webImport: false,
  });
  assert.equal(
    resolveFeatureFlags({ VITE_FEATURE_AUDIO_IMPORT: " TRUE " }).audioImport,
    true,
  );
  assert.equal(
    resolveFeatureFlags({ VITE_FEATURE_AUDIO_IMPORT: "typo" }).audioImport,
    false,
  );
});
