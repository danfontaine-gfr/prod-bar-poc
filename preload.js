const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("prodBar", {
  resizeWindow: (width, height) => {
    ipcRenderer.send("resize-window", { width, height });
  },

  quitApp: () => ipcRenderer.invoke("app:quit"),

  // stats
  getLatestStats: () => ipcRenderer.invoke("stats:getLatest"),
  setStatsConfig: (config) => ipcRenderer.invoke("stats:setConfig", config),

  onStatsUpdated: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("stats:updated", handler);
    return () => ipcRenderer.removeListener("stats:updated", handler);
  }
});
console.log("preload loaded");