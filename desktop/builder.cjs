const release = process.env.CHORDLEAF_SIGNED_RELEASE === "1";
if (release && !process.env.CSC_NAME?.startsWith("Developer ID Application:"))
  throw new Error(
    "A Developer ID Application identity is required for public distribution",
  );
module.exports = {
  appId: "com.chordleaf.desktop",
  productName: "Chordleaf",
  directories: { app: "artifacts/desktop/app", output: "release-desktop" },
  files: ["**/*", "!desktop/builder.cjs"],
  asar: true,
  npmRebuild: false,
  electronFuses: release
    ? {
        runAsNode: false,
        enableNodeOptionsEnvironmentVariable: false,
        enableNodeCliInspectArguments: false,
        enableCookieEncryption: true,
        enableEmbeddedAsarIntegrityValidation: true,
        onlyLoadAppFromAsar: true,
        grantFileProtocolExtraPrivileges: false,
      }
    : undefined,
  forceCodeSigning: release,
  electronVersion: "44.4.5",
  extraResources: [
    {
      from: "artifacts/desktop/runtime",
      to: "runtime",
      filter: ["**/*", "!**/__pycache__/**", "!**/*.pyc"],
    },
    {
      from: "experiments/audio",
      to: "audio",
      filter: [
        "analyze.py",
        "neural.py",
        "offline.py",
        "qwen_worker.py",
        "check.py",
        "download-models.py",
        "model-catalog.json",
      ],
    },
  ],
  mac: {
    target: [{ target: "dmg", arch: ["arm64"] }],
    category: "public.app-category.music",
    minimumSystemVersion: "15.0.0",
    icon: "public/icons/icon-512.png",
    identity: release ? process.env.CSC_NAME : null,
    hardenedRuntime: true,
    notarize: release,
    artifactName: "Chordleaf-${version}-mac-arm64.${ext}",
  },
  publish: null,
};
