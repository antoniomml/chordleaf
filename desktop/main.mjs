import {
  app,
  BrowserWindow,
  protocol,
  net,
  ipcMain,
  shell,
  dialog,
  Menu,
} from "electron";
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { APP_ORIGIN, trustedURL, externalURL, boundedBody } from "./policy.mjs";
import { modelManager } from "./models.mjs";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "chordleaf",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);
// A separate path allows clean-profile integration tests without touching songs.
if (process.env.CHORDLEAF_DESKTOP_TEST_DATA)
  app.setPath("userData", resolve(process.env.CHORDLEAF_DESKTOP_TEST_DATA));
const locked = app.requestSingleInstanceLock();
let window,
  server,
  manager,
  cancelAudioJobs,
  shutdownAudioJobs,
  cancelReadinessJobs,
  quitting = false;
if (!locked) app.quit();
else {
  app.on("second-instance", () => {
    window?.show();
    window?.focus();
  });
  app.on("window-all-closed", () => app.quit());
  app.on("will-quit", (event) => {
    if (quitting) return;
    event.preventDefault();
    quitting = true;
    cancelAudioJobs?.();
    cancelReadinessJobs?.();
    server?.closeAllConnections();
    server?.close();
    Promise.allSettled([manager?.shutdown(), shutdownAudioJobs?.()]).finally(
      // will-quit runs after every window's unload and storage save. Once
      // cleanup finishes, exit directly rather than re-entering the quit cycle.
      () => app.exit(0),
    );
  });
  app.whenReady().then(async () => {
    try {
      const root = app.isPackaged
        ? app.getAppPath()
        : resolve(app.getAppPath(), "..");
      const runtime = app.isPackaged
        ? join(process.resourcesPath, "runtime", "python")
        : join(root, "artifacts/desktop/runtime/python");
      const scripts = app.isPackaged
        ? join(process.resourcesPath, "audio")
        : join(root, "experiments/audio");
      const cache = join(app.getPath("userData"), "models");
      const python = join(runtime, "bin/python3");
      const catalog = JSON.parse(
        await readFile(join(scripts, "model-catalog.json"), "utf8"),
      );
      const [[whisperID, whisperRevision]] = Object.entries(
        catalog.whisper.models,
      );
      await mkdir(cache, { recursive: true });
      const inferenceEnv = {
        PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
        HOME: homedir(),
        TMPDIR: app.getPath("temp"),
        LANG: "en_US.UTF-8",
        PYTHONNOUSERSITE: "1",
        PYTHONDONTWRITEBYTECODE: "1",
        HF_HOME: cache,
        HF_HUB_OFFLINE: "1",
        HF_HUB_DISABLE_TELEMETRY: "1",
        HF_HUB_DISABLE_IMPLICIT_TOKEN: "1",
        DO_NOT_TRACK: "1",
      };
      Object.assign(process.env, inferenceEnv, {
        HOST: "127.0.0.1",
        PORT: "0",
        CHORDLEAF_LOCAL_AUDIO: "1",
        CHORDLEAF_AUDIO_PYTHON: python,
        CHORDLEAF_AUDIO_SCRIPTS: scripts,
        CHORDLEAF_WHISPER_MODEL: join(
          cache,
          "hub",
          "models--" + whisperID.replaceAll("/", "--"),
          "snapshots",
          whisperRevision,
        ),
        CHORDLEAF_DIST: join(root, "dist"),
        CHORDLEAF_AUDIO_OFFLINE: "1",
        CHORDLEAF_DESKTOP_TOKEN: randomBytes(32).toString("hex"),
      });
      const service = await import(
        pathToFileURL(join(root, "server/start.js"))
      );
      server = service.server;
      const address = await service.ready;
      process.env.PORT = String(address.port);
      const base = `http://127.0.0.1:${address.port}`;
      ({ cancelAudioJobs, shutdownAudioJobs } = await import(
        pathToFileURL(join(root, "server/audio-import.js"))
      ));
      const readiness = await import(
        pathToFileURL(join(root, "server/audio-readiness.js"))
      );
      const { clearAudioReadiness } = readiness;
      cancelReadinessJobs = readiness.cancelReadinessJobs;
      manager = modelManager({
        python,
        scripts,
        cache,
        env: inferenceEnv,
        invalidate: clearAudioReadiness,
      });
      protocol.handle("chordleaf", async (request) => {
        if (!trustedURL(request.url))
          return new Response("Forbidden", { status: 403 });
        const target = new URL(request.url);
        // Only the app process holds the backend capability. No public CORS bridge.
        const headers = new Headers(request.headers);
        headers.set(
          "Authorization",
          `Bearer ${process.env.CHORDLEAF_DESKTOP_TOKEN}`,
        );
        headers.set("Origin", base);
        try {
          const body = await boundedBody(request);
          return await net.fetch(base + target.pathname + target.search, {
            method: request.method,
            headers,
            body,
            signal: request.signal,
            bypassCustomProtocolHandlers: true,
          });
        } catch (error) {
          if (error instanceof RangeError)
            return Response.json({ error: "size" }, { status: 413 });
          return new Response("Local service unavailable", { status: 503 });
        }
      });
      window = new BrowserWindow({
        width: 1250,
        height: 900,
        minWidth: 760,
        minHeight: 600,
        title: "Chordleaf",
        backgroundColor: "#171a19",
        show: false,
        webPreferences: {
          preload: join(root, "desktop/preload.cjs"),
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: true,
        },
      });
      const authorized = (event) =>
        event.sender === window.webContents &&
        event.senderFrame === window.webContents.mainFrame &&
        trustedURL(event.senderFrame.url);
      for (const [channel, action] of Object.entries({
        "audio:cancel": () => {
          cancelAudioJobs();
          return true;
        },
        "models:status": () => manager.status(),
        "models:install": (model) => manager.install(model),
        "models:cancel": () => manager.cancel(),
        "models:remove": async () => {
          const spanish = app.getLocale().startsWith("es");
          const result = await dialog.showMessageBox(window, {
            type: "question",
            buttons: spanish
              ? ["Cancelar", "Eliminar modelos"]
              : ["Cancel", "Remove models"],
            defaultId: 0,
            cancelId: 0,
            message: spanish
              ? "¿Eliminar los modelos de letra descargados?"
              : "Remove downloaded lyric models?",
            detail: spanish
              ? "Tus canciones y documentos se conservarán. Puedes volver a descargar los modelos."
              : "Your songs and documents will be kept. Models can be downloaded again.",
          });
          if (result.response === 1) {
            cancelAudioJobs();
            return manager.remove();
          }
          return manager.status();
        },
      }))
        ipcMain.handle(channel, (event, ...args) => {
          if (!authorized(event)) throw new Error("Untrusted sender");
          return action(...args);
        });
      window.webContents.session.setPermissionRequestHandler(
        (_wc, _permission, callback) => callback(false),
      );
      window.webContents.session.setPermissionCheckHandler(() => false);
      window.webContents.on("will-attach-webview", (event) =>
        event.preventDefault(),
      );
      window.webContents.on("will-navigate", (event, url) => {
        if (!trustedURL(url)) event.preventDefault();
      });
      window.webContents.setWindowOpenHandler(({ url }) => {
        if (externalURL(url)) shell.openExternal(url);
        return { action: "deny" };
      });
      window.webContents.on("will-prevent-unload", (event) => {
        const spanish = app.getLocale().startsWith("es");
        const choice = dialog.showMessageBoxSync(window, {
          type: "question",
          defaultId: 0,
          cancelId: 0,
          buttons: spanish
            ? ["Seguir trabajando", "Cerrar"]
            : ["Keep working", "Close"],
          message: spanish
            ? "No se pudieron guardar los últimos cambios. ¿Cerrar igualmente?"
            : "Your latest changes could not be saved. Close anyway?",
          detail: spanish
            ? "Sigue trabajando y exporta una copia JSON para conservar los cambios fuera de la aplicación."
            : "Keep working and export a JSON backup to preserve your changes outside the app.",
        });
        // Electron's preventDefault here permits the otherwise prevented close.
        if (choice === 1) event.preventDefault();
      });
      // Native downloads use the normal save dialog; retain browser app shortcuts.
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          { role: "appMenu" },
          { role: "editMenu" },
          { role: "viewMenu" },
          { role: "windowMenu" },
        ]),
      );
      window.once("ready-to-show", () => window.show());
      await window.loadURL(APP_ORIGIN + "/");
    } catch (error) {
      if (!quitting && !process.env.CHORDLEAF_DESKTOP_TEST_DATA)
        dialog.showErrorBox(
          "Chordleaf could not start",
          "The local engine could not be started. Reinstall Chordleaf; your saved songs will remain in Application Support.",
        );
      console.error("Desktop startup failed:", error.message);
      app.quit();
    }
  });
}
