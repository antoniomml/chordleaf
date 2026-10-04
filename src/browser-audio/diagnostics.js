import { audioDevice } from "./hardware.js";
import pkg from "../../package.json" with { type: "json" };

const key = "chordleaf-audio-diagnostic-v1";
const session = Math.random().toString(36).slice(2);
let latest;
const audioStorage = () => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export function audioErrorCode(error) {
  const message = String(error?.message || error);
  if (error?.name === "AbortError") return "cancelled";
  if (["SecurityError", "QuotaExceededError"].includes(error?.name))
    return "storage";
  if (/quota|almacenamiento|guardar el modelo/i.test(message)) return "storage";
  if (/out of memory|allocation|memory access|memoria/i.test(message))
    return "memory";
  if (/backend|wasm|WebAssembly|compile|instantiate/i.test(message))
    return "runtime";
  if (/fetch|network|conexión|descargar/i.test(message)) return "network";
  if (/leer este audio|decode/i.test(message)) return "decode";
  if (/duración|durar|duration/i.test(message)) return "duration";
  if (/tamaño|size|MB/i.test(message)) return "size";
  if (/timeout|demasiado tiempo/i.test(message)) return "timeout";
  return "analysis";
}

export function readAudioDiagnostic(storage = audioStorage()) {
  try {
    const stored = JSON.parse(storage?.getItem(key) || "null");
    if (stored?.version === 1 && Array.isArray(stored.events)) return stored;
  } catch {
    /* Diagnostics must never prevent importing audio. */
  }
  return latest;
}

function save(report, storage) {
  latest = report;
  try {
    storage?.setItem(key, JSON.stringify(report));
  } catch {
    /* Optional. */
  }
  try {
    globalThis.dispatchEvent?.(new Event("audio-diagnostic-change"));
  } catch {
    /* The page may already be closing. */
  }
}

export function recoverAudioDiagnostic(storage = audioStorage()) {
  const report = readAudioDiagnostic(storage);
  if (report?.status === "running" && report.session !== session) {
    report.status = "interrupted";
    save(report, storage);
    return true;
  }
  return false;
}

export function beginAudioDiagnostic(
  operation,
  options = {},
  environment = {},
) {
  const storage = environment.storage ?? audioStorage();
  const navigator = environment.navigator ?? globalThis.navigator ?? {};
  // Allowlist metadata: no filename, audio samples, lyrics, chords or URLs.
  const report = {
    version: 1,
    appVersion: pkg.version,
    session,
    operation,
    status: "running",
    started: new Date().toISOString(),
    device: {
      ...audioDevice(navigator),
      userAgent: String(navigator.userAgent || "").slice(0, 300),
    },
    model: options.model,
    language: options.language,
    runtime: options.runtime,
    bytes: options.bytes,
    mime: options.mime,
    events: [],
  };
  const started = Date.now();
  const recorder = {
    step(stage, detail = {}) {
      report.events.push({
        stage,
        seconds: (Date.now() - started) / 1000,
        ...(Number.isFinite(detail.percent) ? { percent: detail.percent } : {}),
        ...(Number.isFinite(detail.duration)
          ? { duration: detail.duration }
          : {}),
        ...(detail.error ? { error: audioErrorCode(detail.error) } : {}),
      });
      report.events = report.events.slice(-40);
      save(report, storage);
    },
    finish(status, error) {
      report.status = status;
      this.step(status, error ? { error } : {});
    },
  };
  recorder.step("start");
  return recorder;
}

export function exportAudioDiagnostic() {
  const report = readAudioDiagnostic();
  if (!report) return;
  const { session: _, ...data } = report;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "chordleaf-audio-diagnostic.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
