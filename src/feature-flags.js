// Public, build-time switches: change them in Vercel and redeploy. No remote
// flag service, cookies, user tracking or additional server is involved.
export function resolveFeatureFlags(env = {}) {
  const enabled = (value) =>
    value === undefined ||
    value === "" ||
    String(value).trim().toLowerCase() === "true";
  return Object.freeze({
    audioImport: enabled(env.VITE_FEATURE_AUDIO_IMPORT),
    webImport: enabled(env.VITE_FEATURE_WEB_IMPORT),
  });
}
