import { spawn } from "node:child_process";
import { rm, mkdir, statfs } from "node:fs/promises";
import { join } from "node:path";

export function modelManager({ python, scripts, cache, env, invalidate }) {
  let child,
    active = false,
    closing = false,
    state = { stage: "idle" };
  async function install(model) {
    if (!["qwen", "whisper"].includes(model)) throw new Error("Invalid model");
    if (active || closing) throw new Error("An operation is already running");
    active = true;
    try {
      await mkdir(cache, { recursive: true });
      const disk = await statfs(cache);
      if (closing) {
        active = false;
        state = { stage: "cancelled" };
        return { ...state, active };
      }
      if (disk.bavail * disk.bsize < 6 * 1024 ** 3) {
        state = { stage: "error", error: "space" };
        active = false;
        return { ...state, active };
      }
      state = {
        stage: "download",
        model,
        completed: 0,
        total: model === "qwen" ? 2 : 1,
      };
      // The renderer cannot choose executables, arguments, URLs or filesystem paths.
      child = spawn(python, [join(scripts, "download-models.py"), model], {
        env: { ...env, HF_HUB_OFFLINE: "0", TRANSFORMERS_OFFLINE: "0" },
        stdio: ["ignore", "pipe", "ignore"],
      });
      let buffer = "";
      child.stdout.on("data", (data) => {
        buffer += data;
        const lines = buffer.split("\n");
        buffer = lines.pop().slice(-8192);
        for (const line of lines) {
          try {
            const status = JSON.parse(line);
            if (["download", "complete"].includes(status.stage)) state = status;
          } catch {
            /* Dependency progress isn't exposed as executable content. */
          }
        }
      });
      child.once("error", () => {
        state = { stage: "error", error: "download" };
      });
      child.once("close", (code) => {
        if (state.stage !== "cancelled")
          state =
            code === 0
              ? { stage: "complete", model }
              : { stage: "error", error: "download" };
        child = undefined;
        active = false;
        invalidate();
      });
      return { ...state, active };
    } catch (error) {
      active = false;
      state = { stage: "error", error: "download" };
      return { ...state, active };
    }
  }
  return {
    shutdown: async () => {
      closing = true;
      if (child) {
        const ended = new Promise((resolve) => child.once("close", resolve));
        state = { stage: "cancelled" };
        child.kill("SIGKILL");
        await ended;
      }
    },
    status: () => ({ ...state, active }),
    install,
    cancel: () => {
      if (child) {
        state = { stage: "cancelled" };
        child.kill("SIGKILL");
      }
      return { ...state, active };
    },
    remove: async () => {
      if (active || closing) throw new Error("An operation is already running");
      active = true;
      try {
        await rm(cache, { recursive: true, force: true });
        invalidate();
        state = { stage: "idle" };
      } finally {
        active = false;
      }
      return { ...state, active };
    },
  };
}
