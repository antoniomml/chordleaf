const { contextBridge, ipcRenderer } = require("electron");
// Fixed capabilities only: never expose arbitrary IPC, paths, commands or tokens.
contextBridge.exposeInMainWorld(
  "chordleafDesktop",
  Object.freeze({
    system: () => ipcRenderer.invoke("audio:system"),
    cancelAnalysis: () => ipcRenderer.invoke("audio:cancel"),
    models: () => ipcRenderer.invoke("models:status"),
    install: (model) => ipcRenderer.invoke("models:install", model),
    cancel: () => ipcRenderer.invoke("models:cancel"),
    remove: () => ipcRenderer.invoke("models:remove"),
  }),
);
