// Opt-in local experiment. Public deployments do not register this endpoint.
import languages from "../src/audio-languages.json" with { type: "json" };
import { audioReadiness } from "./audio-readiness.js";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 30 * 1024 * 1024;
const script = process.env.CHORDLEAF_AUDIO_SCRIPTS
  ? join(process.env.CHORDLEAF_AUDIO_SCRIPTS, "analyze.py")
  : fileURLToPath(new URL("../experiments/audio/analyze.py", import.meta.url));
const workers = new Set();
export function cancelAudioJobs() {
  for (const child of workers) child.kill("SIGKILL");
}
let busy = false;
let cleanup = Promise.resolve();
export async function shutdownAudioJobs() {
  cancelAudioJobs();
  await cleanup;
}

export async function audioImportMiddleware(req, res, next) {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname !== "/api/audio-import") return next();
  const reply = (status, body) => {
    if (res.destroyed) return;
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(body));
  };
  const python = process.env.CHORDLEAF_AUDIO_PYTHON;
  // Both the request socket and browser origin must be local. No CORS endpoint.
  const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
    req.socket.remoteAddress,
  );
  let host;
  try {
    host = new URL(`http://${req.headers.host || "invalid"}`).hostname;
  } catch {
    return reply(403, { error: "local" });
  }
  if (!local || !["localhost", "127.0.0.1", "[::1]"].includes(host))
    return reply(403, { error: "local" });
  if (
    req.headers.origin &&
    req.headers.origin !== `http://${req.headers.host}` &&
    req.headers.origin !== `https://${req.headers.host}`
  )
    return reply(403, { error: "origin" });
  if (req.method === "GET") return reply(200, await audioReadiness(python));
  if (req.method !== "POST") return reply(405, { error: "method" });
  if (!python) return reply(503, { error: "unavailable" });
  const engine = url.searchParams.get("engine") || "neural";
  if (!["neural", "baseline"].includes(engine))
    return reply(400, { error: "engine" });
  const lyricsEngine = url.searchParams.get("lyricsEngine") || "whisper";
  if (!["whisper", "qwen"].includes(lyricsEngine))
    return reply(400, { error: "lyrics-engine" });
  if (busy) return reply(409, { error: "busy" });
  if (req.headers["content-type"] !== "application/octet-stream")
    return reply(415, { error: "type" });
  if (Number(req.headers["content-length"]) > MAX_BYTES)
    return reply(413, { error: "size" });
  busy = true;
  let cleaned;
  cleanup = new Promise((resolve) => {
    cleaned = resolve;
  });
  let directory, child, timer, uploadTimer, response;
  const abort = () => child?.kill("SIGKILL");
  res.on("close", abort);
  try {
    uploadTimer = setTimeout(() => req.destroy(), 60_000);
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) {
        reply(413, { error: "size" });
        return;
      }
      chunks.push(chunk);
    }
    clearTimeout(uploadTimer);
    if (!bytes || res.destroyed) return reply(400, { error: "empty" });
    directory = await mkdtemp(join(tmpdir(), "chordleaf-audio-"));
    const file = join(directory, "input");
    await writeFile(file, Buffer.concat(chunks));
    const args = [
      script,
      file,
      "--engine",
      engine,
      "--lyrics-engine",
      lyricsEngine,
    ];
    if (url.searchParams.get("lyrics") === "false") args.push("--no-lyrics");
    const language = url.searchParams.get("language");
    if (Object.hasOwn(languages, language)) args.push("--language", language);
    if (res.destroyed) return;
    const output = await new Promise((resolve, reject) => {
      child = spawn(python, args, {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          CHORDLEAF_AUDIO_TMPDIR: directory,
          CHORDLEAF_AUDIO_OFFLINE: "1",
          HF_HUB_OFFLINE: "1",
        },
      });
      workers.add(child);
      child.once("close", () => workers.delete(child));
      let stdout = "";
      child.stdout.on("data", (data) => {
        stdout += data;
        if (stdout.length > 2_000_000) {
          abort();
          reject(new Error("output"));
        }
      });
      child.stderr.resume(); // Never expose paths or model download credentials.
      child.once("error", reject);
      child.once("close", (code) => {
        if (code === 0) return resolve(stdout);
        let failure = "analysis";
        try {
          const data = JSON.parse(stdout);
          if (["duration", "decode"].includes(data.error)) failure = data.error;
        } catch {
          /* Python may fail before starting the analyzer. */
        }
        reject(new Error(failure));
      });
      timer = setTimeout(() => {
        abort();
        reject(new Error("timeout"));
      }, 15 * 60_000);
    });
    response = [200, JSON.parse(output)];
  } catch (error) {
    response = [
      error.message === "timeout" ? 504 : 422,
      {
        error: ["timeout", "duration", "decode"].includes(error.message)
          ? error.message
          : "analysis",
      },
    ];
  } finally {
    clearTimeout(timer);
    clearTimeout(uploadTimer);
    res.off("close", abort);
    try {
      if (directory) await rm(directory, { recursive: true, force: true });
    } finally {
      busy = false;
      cleaned();
      if (response) reply(...response);
    }
  }
}
